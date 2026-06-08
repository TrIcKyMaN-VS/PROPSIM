using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace NinjaTrader.Custom.AddOns.PropSim
{
    public class PropSimApiClient
    {
        private readonly HttpClient _httpClient;
        // Defaulting to localhost for development, but in production this would be https://app.propsim.com
        private readonly string _baseUrl = "http://localhost:3000"; 
        private readonly string _token;

        public PropSimApiClient(string token, string baseUrl = "http://localhost:3000")
        {
            _token = token;
            _baseUrl = baseUrl;
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_token}");
            _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
        }

        public async Task<bool> SyncTradeAsync(PropSimTradePayload payload)
        {
            try
            {
                // Simple JSON serialization without pulling in external DLLs like Newtonsoft
                // to keep the NinjaTrader addon lightweight and dependency-free.
                string jsonPayload = $@"{{
                    ""providerTradeId"": ""{payload.ProviderTradeId}"",
                    ""accountName"": ""{payload.AccountName}"",
                    ""instrument"": ""{payload.Instrument}"",
                    ""direction"": ""{payload.Direction}"",
                    ""entryPrice"": {payload.EntryPrice},
                    ""exitPrice"": {payload.ExitPrice},
                    ""contracts"": {payload.Contracts},
                    ""pnl"": {payload.PnL},
                    ""entryTime"": ""{payload.EntryTime:O}"",
                    ""exitTime"": ""{payload.ExitTime:O}""
                }}";

                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                
                string endpoint = $"{_baseUrl}/api/integrations/ninjatrader/sync";
                HttpResponseMessage response = await _httpClient.PostAsync(endpoint, content);

                if (response.IsSuccessStatusCode)
                {
                    NinjaTrader.Code.Output.Process("PROPSIM: Trade synced successfully.", PrintTo.OutputTab1);
                    return true;
                }
                else
                {
                    string error = await response.Content.ReadAsStringAsync();
                    NinjaTrader.Code.Output.Process($"PROPSIM Sync Error: {response.StatusCode} - {error}", PrintTo.OutputTab1);
                    return false;
                }
            }
            catch (Exception ex)
            {
                NinjaTrader.Code.Output.Process($"PROPSIM Exception: {ex.Message}", PrintTo.OutputTab1);
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
