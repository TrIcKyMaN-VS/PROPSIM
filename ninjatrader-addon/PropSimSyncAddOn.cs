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
        private string _apiToken;

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
                LoadToken();

                if (!string.IsNullOrEmpty(_apiToken))
                {
                    _syncEngine = new PropSimSyncEngine(_apiToken);

                    // Subscribe to account events
                    lock (Account.All)
                    {
                        foreach (Account acc in Account.All)
                        {
                            acc.AccountItemUpdate += OnAccountItemUpdate;
                            acc.ExecutionUpdate += OnExecutionUpdate;
                            acc.PositionUpdate += OnPositionUpdate;
                        }
                    }

                    NinjaTrader.Code.Output.Process("PROPSIM: AddOn Configured and connected to accounts.", PrintTo.OutputTab1);
                }
                else
                {
                    NinjaTrader.Code.Output.Process("PROPSIM: No API token found. Please configure the token.", PrintTo.OutputTab1);
                }
            }
            else if (State == State.Terminated)
            {
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

        // Ideally, provide a WPF UI to set this token
        // For brevity in this AddOn base, we read from a text file
        public void SetToken(string token)
        {
            _apiToken = token;
            File.WriteAllText(_tokenFilePath, token);
            NinjaTrader.Code.Output.Process("PROPSIM: API Token saved successfully.", PrintTo.OutputTab1);
        }

        private void OnAccountItemUpdate(object sender, AccountItemEventArgs e)
        {
            // Optional: Track daily balance/drawdown updates
        }

        private void OnExecutionUpdate(object sender, ExecutionEventArgs e)
        {
            if (_syncEngine != null && e.Execution != null)
            {
                _syncEngine.OnExecutionUpdate(e.Execution, e.Execution.ExecutionId, e.Execution.Price, e.Execution.Quantity, e.Execution.MarketPosition, e.Execution.Order?.OrderId ?? "", e.Execution.Time);
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
