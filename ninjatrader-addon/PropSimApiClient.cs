using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using NinjaTrader.NinjaScript;

namespace NinjaTrader.Custom.AddOns.PropSim
{
    public class PropSimApiClient
    {
        private readonly HttpClient _httpClient;
        // Defaulting to localhost for development, but in production this would be https://app.propsim.com
        private readonly string _baseUrl = "https://propsim.vercel.app"; 
        private readonly string _token;

        public PropSimApiClient(string token, string baseUrl = "https://propsim.vercel.app")
        {
            _token = token;
            _baseUrl = string.IsNullOrEmpty(baseUrl) ? "https://propsim.vercel.app" : baseUrl.Trim().TrimEnd('/');
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("Authorization", string.Format("Bearer {0}", _token));
            _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
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

        public async Task<string> SendHeartbeatAsync()
        {
            try
            {
                string endpoint = string.Format("{0}/api/integrations/ninjatrader/heartbeat", _baseUrl);
                var content = new StringContent("{}", Encoding.UTF8, "application/json");
                HttpResponseMessage response = await _httpClient.PostAsync(endpoint, content);
                if (response.IsSuccessStatusCode)
                {
                    string body = await response.Content.ReadAsStringAsync();
                    return body;
                }
                else
                {
                    SafeLog(string.Format("PROPSIM Heartbeat failed. Status: {0} - URL: {1}", response.StatusCode, _baseUrl));
                    return null;
                }
            }
            catch (Exception ex)
            {
                SafeLog(string.Format("PROPSIM Heartbeat Exception: {0} - URL: {1}", ex.Message, _baseUrl));
                return null;
            }
        }

        public async Task<bool> SyncTradeAsync(PropSimTradePayload payload)
        {
            try
            {
                // Simple JSON serialization without pulling in external DLLs like Newtonsoft
                // to keep the NinjaTrader addon lightweight and dependency-free.
                // Convert NinjaTrader Execution Time (typically NY Exchange Time) to absolute UTC
                // Bypassing the local Windows PC timezone to prevent double-conversion offsets
                TimeZoneInfo platformZone = NinjaTrader.Core.Globals.GeneralOptions.TimeZoneInfo;
                DateTime entryUtc = payload.EntryTime.Kind == DateTimeKind.Utc ? payload.EntryTime : TimeZoneInfo.ConvertTimeToUtc(payload.EntryTime, platformZone);
                DateTime exitUtc = payload.ExitTime.Kind == DateTimeKind.Utc ? payload.ExitTime : TimeZoneInfo.ConvertTimeToUtc(payload.ExitTime, platformZone);

                string entryPriceStr = payload.EntryPrice.ToString(System.Globalization.CultureInfo.InvariantCulture);
                string exitPriceStr = payload.ExitPrice.ToString(System.Globalization.CultureInfo.InvariantCulture);
                string contractsStr = payload.Contracts.ToString(System.Globalization.CultureInfo.InvariantCulture);
                string pnlStr = payload.PnL.ToString(System.Globalization.CultureInfo.InvariantCulture);
                string entryTimeStr = entryUtc.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", System.Globalization.CultureInfo.InvariantCulture);
                string exitTimeStr = exitUtc.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", System.Globalization.CultureInfo.InvariantCulture);

                string jsonPayload = string.Format(@"{{
                    ""providerTradeId"": ""{0}"",
                    ""accountName"": ""{1}"",
                    ""instrument"": ""{2}"",
                    ""direction"": ""{3}"",
                    ""entryPrice"": {4},
                    ""exitPrice"": {5},
                    ""contracts"": {6},
                    ""pnl"": {7},
                    ""entryTime"": ""{8}"",
                    ""exitTime"": ""{9}""
                }}", payload.ProviderTradeId, payload.AccountName, payload.Instrument, payload.Direction, entryPriceStr, exitPriceStr, contractsStr, pnlStr, entryTimeStr, exitTimeStr);

                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                
                string endpoint = string.Format("{0}/api/integrations/ninjatrader/sync", _baseUrl);
                HttpResponseMessage response = await _httpClient.PostAsync(endpoint, content);

                if (response.IsSuccessStatusCode)
                {
                    SafeLog("PROPSIM: Trade synced successfully.");
                    try
                    {
                        string soundPath = Path.Combine(NinjaTrader.Core.Globals.InstallDir, "sounds", "Alert1.wav");
                        if (File.Exists(soundPath))
                        {
                            NinjaTrader.Core.Globals.PlaySound(soundPath);
                        }
                    }
                    catch { }
                    return true;
                }
                else
                {
                    string error = await response.Content.ReadAsStringAsync();
                    SafeLog(string.Format("PROPSIM Sync Error: {0} - {1}", response.StatusCode, error));
                    return false;
                }
            }
            catch (Exception ex)
            {
                SafeLog(string.Format("PROPSIM Exception: {0}", ex.Message));
                return false;
            }
        }

        public async Task<bool> SendAccountsAsync(System.Collections.Generic.List<string> accountNames)
        {
            try
            {
                var sb = new StringBuilder();
                sb.Append("{\"accounts\":[");
                for (int i = 0; i < accountNames.Count; i++)
                {
                    sb.Append(string.Format("\"{0}\"", accountNames[i]));
                    if (i < accountNames.Count - 1)
                        sb.Append(",");
                }
                sb.Append("]}");
                string jsonPayload = sb.ToString();

                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                string endpoint = string.Format("{0}/api/integrations/ninjatrader/accounts", _baseUrl);
                
                HttpResponseMessage response = await _httpClient.PostAsync(endpoint, content);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                SafeLog(string.Format("PROPSIM Accounts Exception: {0}", ex.Message));
                return false;
            }
        }
    }

    public class PropSimTradePayload
    {
        public string ProviderTradeId { get; set; }
        public string AccountName { get; set; }
        public string Instrument { get; set; }
        public string Direction { get; set; }
        public double EntryPrice { get; set; }
        public double ExitPrice { get; set; }
        public double Contracts { get; set; }
        public double PnL { get; set; }
        public DateTime EntryTime { get; set; }
        public DateTime ExitTime { get; set; }
    }
}
