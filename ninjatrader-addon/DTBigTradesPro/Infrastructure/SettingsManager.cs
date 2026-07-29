using System;

namespace NinjaTrader.NinjaScript.Indicators.DTBigTradesProCore
{
    /// <summary>
    /// Supported watermark display locations on the chart canvas.
    /// </summary>
    public enum WatermarkLocation
    {
        TopLeft,
        TopRight,
        BottomLeft,
        BottomRight
    }

    /// <summary>
    /// Diagnostics display mode.
    /// </summary>
    public enum DiagnosticsMode
    {
        OFF,
        ON
    }

    /// <summary>
    /// Visualization performance modes.
    /// </summary>
    public enum PerformanceMode
    {
        UltraFast,
        Balanced,
        Full
    }

    /// <summary>
    /// Manages the configuration settings, multipliers, and sizing thresholds of the indicator.
    /// Compatible with C# 5.
    /// </summary>
    public class SettingsManager
    {
        // Properties
        public int RingBufferCapacity { get; set; }
        public double RetailMultiplier { get; set; }
        public double ProfessionalMultiplier { get; set; }
        public double InstitutionalMultiplier { get; set; }
        public double BlockMultiplier { get; set; }
        public double ExtremeMultiplier { get; set; }
        public double BaseAverageVolume { get; set; }
        public int RollingAveragePeriod { get; set; }
        public string WatermarkText { get; set; }
        public WatermarkLocation WatermarkLoc { get; set; }
        public int WatermarkOpacity { get; set; }
        public DiagnosticsMode DiagnosticsModeSetting { get; set; }
        public PerformanceMode PerfMode { get; set; }
        public bool ShowTradeBubbles { get; set; }
        public bool ShowZones { get; set; }
        public bool ShowDashboard { get; set; }
        public int BubbleTransparency { get; set; }
        public int ZoneTransparency { get; set; }
        public WatermarkLocation DashboardPosition { get; set; }
        public int MaximumVisibleZones { get; set; }
        public int MaximumVisibleBubbles { get; set; }
        public int AggregationWindowMs { get; set; }
        public bool ShowVolumeLabels { get; set; }
        public double MinimumDeltaThreshold { get; set; }
        public int AbsorptionWindowMs { get; set; }
        public int BaseBubbleOpacity { get; set; }
        public int StackTimeWindowMs { get; set; }
        public double StackPriceRangeTicks { get; set; }
        public int StackMinTradesCount { get; set; }
        public int IcebergMinExecutions { get; set; }
        public double IcebergMinVolume { get; set; }
        public double IcebergMaxPriceMovementTicks { get; set; }
        public double AbsorptionMinVolume { get; set; }
        public int AbsorptionMaxTicksMove { get; set; }
        public int IcebergWindowMs { get; set; }
        public double MinimumExecutionDensity { get; set; }
        public double IcebergMinimumDeltaThreshold { get; set; }
        public bool EnableMarkerFading { get; set; }
        public int MarkerLifetimeMinutes { get; set; }
        public bool HideInvalidMarkers { get; set; }
        public int InvalidationDistanceTicks { get; set; }
        public double ConfluenceDistanceTicks { get; set; }
        public int ConfluenceWindowMs { get; set; }
        public double MinimumVolumeToDisplay { get; set; }
        public int AggregationPriceTicks { get; set; }

        public SettingsManager()
        {
            // C# 5 compatible constructor initialization
            RingBufferCapacity = 4096;
            RetailMultiplier = 1.0;
            ProfessionalMultiplier = 3.0;
            InstitutionalMultiplier = 6.0;
            BlockMultiplier = 10.0;
            ExtremeMultiplier = 20.0;
            BaseAverageVolume = 50.0;
            RollingAveragePeriod = 1000;
            WatermarkText = "DTBigTrades Pro";
            WatermarkLoc = WatermarkLocation.TopRight;
            WatermarkOpacity = 30;
            DiagnosticsModeSetting = DiagnosticsMode.OFF;
            PerfMode = PerformanceMode.Balanced;
            ShowTradeBubbles = true;
            ShowZones = true;
            ShowDashboard = true;
            BubbleTransparency = 30;
            ZoneTransparency = 40;
            DashboardPosition = WatermarkLocation.BottomLeft;
            MaximumVisibleZones = 25;
            MaximumVisibleBubbles = 100;
            AggregationWindowMs = 50;
            ShowVolumeLabels = false;
            MinimumDeltaThreshold = 150.0;
            AbsorptionWindowMs = 1000;
            BaseBubbleOpacity = 70;
            StackTimeWindowMs = 500;
            StackPriceRangeTicks = 1.0;
            StackMinTradesCount = 3;
            IcebergMinExecutions = 5;
            IcebergMinVolume = 100.0;
            IcebergMaxPriceMovementTicks = 1.0;
            AbsorptionMinVolume = 300.0;
            AbsorptionMaxTicksMove = 2;
            IcebergWindowMs = 1000;
            MinimumExecutionDensity = 0.005;
            IcebergMinimumDeltaThreshold = 100.0;
            EnableMarkerFading = true;
            MarkerLifetimeMinutes = 120;
            HideInvalidMarkers = true;
            InvalidationDistanceTicks = 4;
            ConfluenceDistanceTicks = 2.0;
            ConfluenceWindowMs = 500;
            MinimumVolumeToDisplay = 150.0;
            AggregationPriceTicks = 2;
        }
    }
}
