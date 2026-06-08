using System;
using System.Collections.Generic;
using System.Linq;
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

        public PropSimSyncEngine(string token)
        {
            _apiClient = new PropSimApiClient(token);
        }

        public void OnExecutionUpdate(Execution execution, string executionId, double price, int quantity, MarketPosition marketPosition, string orderId, DateTime time)
        {
            string key = $"{execution.Account.Name}-{execution.Instrument.FullName}";

            if (!_ongoingTrades.ContainsKey(key))
            {
                // Start tracking a new trade sequence
                _ongoingTrades[key] = new OngoingTrade
                {
                    AccountName = execution.Account.Name,
                    Instrument = execution.Instrument.FullName,
                    Direction = marketPosition == MarketPosition.Long ? "long" : "short",
                    EntryTime = time,
                    TotalContracts = 0,
                    TotalEntryCost = 0
                };
            }

            var trade = _ongoingTrades[key];

            // If this is an entry fill (increasing position)
            // For simplicity, we just accumulate quantity and cost for now
            trade.TotalContracts += quantity;
            trade.TotalEntryCost += (price * quantity);
        }

        public void OnPositionUpdate(Position position, double averagePrice, int quantity, MarketPosition marketPosition)
        {
            // If position drops to 0, the trade is fully closed
            if (quantity == 0)
            {
                string key = $"{position.Account.Name}-{position.Instrument.FullName}";
                if (_ongoingTrades.TryGetValue(key, out OngoingTrade trade))
                {
                    // Calculate final stats
                    double entryPrice = trade.TotalEntryCost / trade.TotalContracts;
                    
                    // We grab the last known realized PnL. In a full production script, 
                    // we'd match the exact executions to get the precise exit price and PnL.
                    // For simplicity, we use the account's realized PnL change.
                    double pnl = position.Account.Get(AccountItem.RealizedProfitLoss, position.Instrument.MasterInstrument.Name);

                    // Send payload
                    var payload = new PropSimTradePayload
                    {
                        ProviderTradeId = Guid.NewGuid().ToString(), // Or derive from executions
                        AccountName = trade.AccountName,
                        Instrument = trade.Instrument,
                        Direction = trade.Direction,
                        EntryPrice = entryPrice,
                        ExitPrice = averagePrice, // Average exit price
                        Contracts = trade.TotalContracts,
                        PnL = pnl,
                        EntryTime = trade.EntryTime,
                        ExitTime = DateTime.UtcNow // Position close time
                    };

                    // Fire and forget the sync
                    _ = _apiClient.SyncTradeAsync(payload);

                    // Clear the tracked trade
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
        }
    }
}
