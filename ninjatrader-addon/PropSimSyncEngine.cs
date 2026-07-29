using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using NinjaTrader.Cbi;
using NinjaTrader.NinjaScript;

namespace NinjaTrader.Custom.AddOns.PropSim
{
    public class PropSimSyncEngine
    {
        private readonly PropSimApiClient _apiClient;
        // Dictionary to store ongoing "open" trades by Instrument and Account
        // Key: "AccountName-InstrumentName"
        private readonly Dictionary<string, OngoingTrade> _ongoingTrades = new Dictionary<string, OngoingTrade>();

        public PropSimSyncEngine(string token, string baseUrl = "http://localhost:3000")
        {
            _apiClient = new PropSimApiClient(token, baseUrl);
        }

        public PropSimApiClient GetApiClient()
        {
            return _apiClient;
        }

        public async Task<string> SendHeartbeatAsync()
        {
            return await _apiClient.SendHeartbeatAsync();
        }

        public void SafeLog(string message)
        {
            try
            {
                if (System.Windows.Application.Current != null && System.Windows.Application.Current.Dispatcher != null)
                {
                    System.Windows.Application.Current.Dispatcher.BeginInvoke(new Action(() =>
                    {
                        try
                        {
                            NinjaTrader.Code.Output.Process(message, PrintTo.OutputTab1);
                        }
                        catch { }
                    }));
                }
                else
                {
                    NinjaTrader.Code.Output.Process(message, PrintTo.OutputTab1);
                }
            }
            catch { }
        }

        public void SyncHistoryRange(DateTime startDate, DateTime endDate)
        {
            var historicalExecs = new List<Execution>();
            lock (Account.All)
            {
                foreach (Account acc in Account.All)
                {
                    foreach (Execution exec in acc.Executions)
                    {
                        if (exec.Time >= startDate && exec.Time <= endDate)
                        {
                            historicalExecs.Add(exec);
                        }
                    }
                }
            }

            if (historicalExecs.Count > 0)
            {
                SafeLog(string.Format("PROPSIM: Found {0} historical executions in platform. Reconstructing trades...", historicalExecs.Count));
                SyncHistory(historicalExecs);
            }
            else
            {
                SafeLog("PROPSIM: No executions found in the selected date range.");
            }
        }

        public void SyncHistory(List<Execution> executions)
        {
            var tempOngoing = new Dictionary<string, OngoingTrade>();
            var sortedExecs = executions.OrderBy(e => e.Time).ToList();
            int syncCount = 0;

            foreach (var exec in sortedExecs)
            {
                string key = string.Format("{0}-{1}", exec.Account.Name, exec.Instrument.FullName);

                if (!tempOngoing.ContainsKey(key))
                {
                    tempOngoing[key] = new OngoingTrade
                    {
                        AccountName = exec.Account.Name,
                        Instrument = exec.Instrument.FullName,
                        Direction = exec.MarketPosition == MarketPosition.Long ? "long" : "short",
                        EntryTime = exec.Time,
                        TotalContracts = 0,
                        TotalEntryCost = 0,
                        TotalExitContracts = 0,
                        TotalExitCost = 0,
                        ExitTime = exec.Time
                    };
                }

                var trade = tempOngoing[key];

                bool isEntry = (trade.Direction == "long" && exec.MarketPosition == MarketPosition.Long) ||
                               (trade.Direction == "short" && exec.MarketPosition == MarketPosition.Short);

                if (isEntry)
                {
                    trade.TotalContracts += exec.Quantity;
                    trade.TotalEntryCost += (exec.Price * exec.Quantity);
                }
                else
                {
                    trade.TotalExitContracts += exec.Quantity;
                    trade.TotalExitCost += (exec.Price * exec.Quantity);
                    trade.ExitTime = exec.Time;
                }

                if (trade.TotalContracts > 0 && trade.TotalContracts == trade.TotalExitContracts)
                {
                    double entryPrice = trade.TotalEntryCost / trade.TotalContracts;
                    double exitPrice = trade.TotalExitCost / trade.TotalExitContracts;

                    double pointValue = exec.Instrument.MasterInstrument.PointValue;
                    if (pointValue <= 0) pointValue = 1.0;
                    double pnlMult = trade.Direction == "long" ? 1.0 : -1.0;
                    double pnl = (exitPrice - entryPrice) * trade.TotalContracts * pointValue * pnlMult;

                    var payload = new PropSimTradePayload
                    {
                        ProviderTradeId = string.Format("HIST-{0}-{1}", exec.ExecutionId, exec.Time.Ticks),
                        AccountName = trade.AccountName,
                        Instrument = trade.Instrument,
                        Direction = trade.Direction,
                        EntryPrice = entryPrice,
                        ExitPrice = exitPrice,
                        Contracts = trade.TotalContracts,
                        PnL = pnl,
                        EntryTime = trade.EntryTime,
                        ExitTime = trade.ExitTime
                    };

                    _ = _apiClient.SyncTradeAsync(payload);
                    tempOngoing.Remove(key);
                    syncCount++;
                }
            }

            SafeLog(string.Format("PROPSIM: Historical trade sync complete. Reconstructed and sent {0} trades.", syncCount));
        }

        public void OnExecutionUpdate(Execution execution, string executionId, double price, int quantity, MarketPosition marketPosition, string orderId, DateTime time)
        {
            string key = string.Format("{0}-{1}", execution.Account.Name, execution.Instrument.FullName);

            if (!_ongoingTrades.ContainsKey(key))
            {
                _ongoingTrades[key] = new OngoingTrade
                {
                    AccountName = execution.Account.Name,
                    Instrument = execution.Instrument.FullName,
                    Direction = marketPosition == MarketPosition.Long ? "long" : "short",
                    EntryTime = time,
                    TotalContracts = 0,
                    TotalEntryCost = 0,
                    TotalExitContracts = 0,
                    TotalExitCost = 0,
                    ExitTime = time
                };
            }

            var trade = _ongoingTrades[key];

            bool isEntry = (trade.Direction == "long" && marketPosition == MarketPosition.Long) ||
                           (trade.Direction == "short" && marketPosition == MarketPosition.Short);

            if (isEntry)
            {
                trade.TotalContracts += quantity;
                trade.TotalEntryCost += (price * quantity);
            }
            else
            {
                trade.TotalExitContracts += quantity;
                trade.TotalExitCost += (price * quantity);
                trade.ExitTime = time;
            }
        }

        public void OnPositionUpdate(Position position, double averagePrice, int quantity, MarketPosition marketPosition)
        {
            if (quantity == 0)
            {
                string key = string.Format("{0}-{1}", position.Account.Name, position.Instrument.FullName);
                OngoingTrade trade;
                if (_ongoingTrades.TryGetValue(key, out trade))
                {
                    double entryPrice = trade.TotalContracts > 0 ? (trade.TotalEntryCost / trade.TotalContracts) : averagePrice;
                    double exitPrice = trade.TotalExitContracts > 0 ? (trade.TotalExitCost / trade.TotalExitContracts) : averagePrice;
                    
                    double pointValue = position.Instrument.MasterInstrument.PointValue;
                    if (pointValue <= 0) pointValue = 1.0;
                    double pnlMult = trade.Direction == "long" ? 1.0 : -1.0;
                    double pnl = (exitPrice - entryPrice) * trade.TotalContracts * pointValue * pnlMult;

                    var payload = new PropSimTradePayload
                    {
                        ProviderTradeId = Guid.NewGuid().ToString(),
                        AccountName = trade.AccountName,
                        Instrument = trade.Instrument,
                        Direction = trade.Direction,
                        EntryPrice = entryPrice,
                        ExitPrice = exitPrice,
                        Contracts = trade.TotalContracts,
                        PnL = pnl,
                        EntryTime = trade.EntryTime,
                        ExitTime = trade.TotalExitContracts > 0 ? trade.ExitTime : DateTime.UtcNow
                    };

                    _ = _apiClient.SyncTradeAsync(payload);
                    _ongoingTrades.Remove(key);
                }
            }
        }

        private class OngoingTrade
        {
            public string AccountName { get; set; }
            public string Instrument { get; set; }
            public string Direction { get; set; }
            public DateTime EntryTime { get; set; }
            public double TotalContracts { get; set; }
            public double TotalEntryCost { get; set; }
            public double TotalExitContracts { get; set; }
            public double TotalExitCost { get; set; }
            public DateTime ExitTime { get; set; }
        }
    }
}
