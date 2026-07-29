using System;
using System.IO;
using NinjaTrader.Cbi;
using NinjaTrader.NinjaScript;

namespace NinjaTrader.Custom.AddOns.PropSim
{
    public class PropSimSyncAddOn : AddOnBase
    {
        private PropSimSyncEngine _syncEngine;
        private string _tokenFilePath;
        private string _urlFilePath;
        private string _apiToken;
        private string _apiUrl = "http://localhost:3000";
        private System.Threading.Timer _heartbeatTimer;
        private readonly System.Collections.Generic.List<string> _subscribedAccounts = new System.Collections.Generic.List<string>();

        private void SubscribeToNewAccounts()
        {
            if (_syncEngine == null) return;
            try
            {
                lock (Account.All)
                {
                    foreach (Account acc in Account.All)
                    {
                        if (!_subscribedAccounts.Contains(acc.Name))
                        {
                            acc.AccountItemUpdate += OnAccountItemUpdate;
                            acc.ExecutionUpdate += OnExecutionUpdate;
                            acc.PositionUpdate += OnPositionUpdate;
                            _subscribedAccounts.Add(acc.Name);
                            SafeLog(string.Format("PROPSIM: Subscribed to account events for {0}", acc.Name));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                SafeLog(string.Format("PROPSIM Error subscribing to accounts: {0}", ex.Message));
            }
        }

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name = "PROPSIM API Sync";
                Description = "Automatically syncs trades to your PROPSIM journal.";
            }
            else if (State == State.Configure)
            {
                _tokenFilePath = Path.Combine(NinjaTrader.Core.Globals.UserDataDir, "propsim_token.txt");
                _urlFilePath = Path.Combine(NinjaTrader.Core.Globals.UserDataDir, "propsim_url.txt");
                LoadToken();
                LoadUrl();

                if (!string.IsNullOrEmpty(_apiToken))
                {
                    _syncEngine = new PropSimSyncEngine(_apiToken, _apiUrl);

                    // Subscribe to account events
                    SubscribeToNewAccounts();

                    // Start heartbeat timer (every 30 seconds)
                    _heartbeatTimer = new System.Threading.Timer((state) =>
                    {
                        SubscribeToNewAccounts();

                        if (_syncEngine != null)
                        {
                            var accountNames = new System.Collections.Generic.List<string>();
                            lock (Account.All)
                            {
                                foreach (Account acc in Account.All)
                                {
                                    accountNames.Add(acc.Name);
                                }
                            }

                            System.Threading.Tasks.Task.Run(async () =>
                            {
                                string responseJson = await _syncEngine.SendHeartbeatAsync();
                                await _syncEngine.GetApiClient().SendAccountsAsync(accountNames);

                                if (!string.IsNullOrEmpty(responseJson) && responseJson.Contains("SYNC_HISTORY"))
                                {
                                    string startToken = "\"startDate\":\"";
                                    string endToken = "\"endDate\":\"";
                                    
                                    int startIndex = responseJson.IndexOf(startToken);
                                    int endIndex = responseJson.IndexOf(endToken);
                                    
                                    if (startIndex >= 0 && endIndex >= 0)
                                    {
                                        startIndex += startToken.Length;
                                        int startValEnd = responseJson.IndexOf("\"", startIndex);
                                        string startStr = responseJson.Substring(startIndex, startValEnd - startIndex);

                                        endIndex += endToken.Length;
                                        int endValEnd = responseJson.IndexOf("\"", endIndex);
                                        string endStr = responseJson.Substring(endIndex, endValEnd - endIndex);

                                        DateTime startDate = DateTime.Parse(startStr).ToLocalTime();
                                        DateTime endDate = DateTime.Parse(endStr).ToLocalTime();

                                        _syncEngine.SafeLog(string.Format("PROPSIM: Received SYNC_HISTORY command ({0} to {1})", startDate, endDate));
                                        _syncEngine.SyncHistoryRange(startDate, endDate);
                                    }
                                }
                            });
                        }
                    }, null, TimeSpan.Zero, TimeSpan.FromSeconds(30));

                    SafeLog(string.Format("PROPSIM: AddOn Configured ({0}).", _apiUrl));
                }
                else
                {
                    SafeLog("PROPSIM: No API token found. Please configure the token.");
                }
            }
            else if (State == State.Terminated)
            {
                if (_heartbeatTimer != null)
                {
                    _heartbeatTimer.Dispose();
                    _heartbeatTimer = null;
                }

                // Unsubscribe from events to prevent memory leaks
                lock (Account.All)
                {
                    foreach (Account acc in Account.All)
                    {
                        acc.AccountItemUpdate -= OnAccountItemUpdate;
                        acc.ExecutionUpdate -= OnExecutionUpdate;
                        acc.PositionUpdate -= OnPositionUpdate;
                    }
                }
            }
        }

        private void LoadToken()
        {
            if (File.Exists(_tokenFilePath))
            {
                _apiToken = File.ReadAllText(_tokenFilePath).Trim();
            }
        }

        private void LoadUrl()
        {
            if (File.Exists(_urlFilePath))
            {
                _apiUrl = File.ReadAllText(_urlFilePath).Trim();
            }
        }

        private void SafeLog(string message)
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
            catch
            {
                // Quiet ignore
            }
        }

        // Ideally, provide a WPF UI to set this token
        // For brevity in this AddOn base, we read from a text file
        public void SetToken(string token)
        {
            _apiToken = token;
            File.WriteAllText(_tokenFilePath, token);
            SafeLog("PROPSIM: API Token saved successfully.");
        }

        private void OnAccountItemUpdate(object sender, AccountItemEventArgs e)
        {
            // Optional: Track daily balance/drawdown updates
        }

        private void OnExecutionUpdate(object sender, ExecutionEventArgs e)
        {
            if (_syncEngine != null && e.Execution != null)
            {
                string orderId = "";
                if (e.Execution.Order != null)
                {
                    orderId = e.Execution.Order.OrderId;
                }
                _syncEngine.OnExecutionUpdate(e.Execution, e.Execution.ExecutionId, e.Execution.Price, e.Execution.Quantity, e.Execution.MarketPosition, orderId, e.Execution.Time);
            }
        }

        private void OnPositionUpdate(object sender, PositionEventArgs e)
        {
            if (_syncEngine != null && e.Position != null)
            {
                _syncEngine.OnPositionUpdate(e.Position, e.Position.AveragePrice, e.Position.Quantity, e.Position.MarketPosition);
            }
        }
    }
}
