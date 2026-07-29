using System;

namespace NinjaTrader.NinjaScript.Indicators.DTBigTradesProCore
{
    /// <summary>
    /// Feature flags configuration to dynamically disable modules at runtime for performance diagnostics.
    /// Compatible with C# 5.
    /// </summary>
    public class FeatureFlags
    {
        public bool EnableDelta { get; set; }
        public bool EnableZones { get; set; }
        public bool EnableStacks { get; set; }
        public bool EnableIcebergs { get; set; }
        public bool EnableAbsorption { get; set; }
        public bool EnableDashboard { get; set; }
        public bool EnableAlerts { get; set; }

        public FeatureFlags()
        {
            // Initializing default property values in constructor for C# 5 compatibility
            EnableDelta = true;
            EnableZones = true;
            EnableStacks = true;
            EnableIcebergs = true;
            EnableAbsorption = true;
            EnableDashboard = true;
            EnableAlerts = true;
        }

        /// <summary>
        /// Resets all flags to the specified state.
        /// </summary>
        public void SetAll(bool state)
        {
            EnableDelta = state;
            EnableZones = state;
            EnableStacks = state;
            EnableIcebergs = state;
            EnableAbsorption = state;
            EnableDashboard = state;
            EnableAlerts = state;
        }
    }
}
