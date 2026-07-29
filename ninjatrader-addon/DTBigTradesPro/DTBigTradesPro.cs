using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Windows.Media;
using System.Xml.Serialization;
using NinjaTrader.Cbi;
using NinjaTrader.Data;
using NinjaTrader.Gui.Chart;
using NinjaTrader.NinjaScript;
using NinjaTrader.NinjaScript.Indicators.DTBigTradesProCore;

namespace NinjaTrader.NinjaScript.Indicators
{
    /// <summary>
    /// DTBigTrades Pro: A high-performance, real-time institutional order flow indicator.
    /// Manually wires engines and implements synchronous event flows, diagnostics, and feature flags.
    /// Compatible with C# 5.
    /// </summary>
    public class DTBigTradesPro : Indicator
    {
        // Infrastructure
        private SettingsManager _settings;
        private EventBus _eventBus;
        private FeatureFlags _featureFlags;
        private PerformanceTracker _perfTracker;
        private RendererCache _rendererCache;
        private SharpDXRenderer _renderer;

        // Engines
        private ITradeEngine _tradeEngine;
        private IVolumeEngine _volumeEngine;
        private IDeltaEngine _deltaEngine;
        private IThresholdEngine _thresholdEngine;
        private IZoneEngine _zoneEngine;
        private IAbsorptionEngine _absorptionEngine;
        private IIcebergEngine _icebergEngine;

        // Bid/Ask Cache for real-time aggressor identification
        private double _currentBid;
        private double _currentAsk;

        #region User Properties (UI Configurable)

        // Group 1: Performance Settings
        [NinjaScriptProperty]
        [Range(32, 65536)]
        [Display(Name = "Ring Buffer Capacity", Description = "Capacity of the lock-free trade circular buffer (rounded to power of 2)", Order = 1, GroupName = "1. Performance")]
        public int RingBufferCapacity { get; set; }

        // Group 2: Adaptive Threshold Settings
        [NinjaScriptProperty]
        [Range(0.1, 1000.0)]
        [Display(Name = "Retail Multiplier", Description = "Multiplier for retail threshold size calculation", Order = 1, GroupName = "2. Adaptive Thresholds")]
        public double RetailMultiplier { get; set; }

        [NinjaScriptProperty]
        [Range(0.1, 1000.0)]
        [Display(Name = "Professional Multiplier", Description = "Multiplier for professional threshold size calculation", Order = 2, GroupName = "2. Adaptive Thresholds")]
        public double ProfessionalMultiplier { get; set; }

        [NinjaScriptProperty]
        [Range(0.1, 1000.0)]
        [Display(Name = "Institutional Multiplier", Description = "Multiplier for institutional threshold size calculation", Order = 3, GroupName = "2. Adaptive Thresholds")]
        public double InstitutionalMultiplier { get; set; }

        [NinjaScriptProperty]
        [Range(0.1, 1000.0)]
        [Display(Name = "Block Multiplier", Description = "Multiplier for block threshold size calculation", Order = 4, GroupName = "2. Adaptive Thresholds")]
        public double BlockMultiplier { get; set; }

        [NinjaScriptProperty]
        [Range(0.1, 1000.0)]
        [Display(Name = "Extreme Multiplier", Description = "Multiplier for extreme threshold size calculation", Order = 5, GroupName = "2. Adaptive Thresholds")]
        public double ExtremeMultiplier { get; set; }

        [NinjaScriptProperty]
        [Range(1.0, 10000.0)]
        [Display(Name = "Base Average Volume", Description = "Fallback base average volume for threshold calculations", Order = 6, GroupName = "2. Adaptive Thresholds")]
        public double BaseAverageVolume { get; set; }

        [NinjaScriptProperty]
        [Range(10, 50000)]
        [Display(Name = "Rolling Lookback Period", Description = "Lookback window size (in trades) for adaptive threshold average", Order = 7, GroupName = "2. Adaptive Thresholds")]
        public int RollingAveragePeriod { get; set; }

        // Group 3: Feature Flags
        [NinjaScriptProperty]
        [Display(Name = "Enable Delta", Description = "Enable delta and cumulative delta tracking", Order = 1, GroupName = "3. Feature Flags")]
        public bool EnableDelta { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Enable Zones", Description = "Enable support/resistance liquidity zones", Order = 2, GroupName = "3. Feature Flags")]
        public bool EnableZones { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Enable Stacks", Description = "Enable trade stacking detection", Order = 3, GroupName = "3. Feature Flags")]
        public bool EnableStacks { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Enable Icebergs", Description = "Enable iceberg order tracking", Order = 4, GroupName = "3. Feature Flags")]
        public bool EnableIcebergs { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Enable Absorption", Description = "Enable volume absorption detection", Order = 5, GroupName = "3. Feature Flags")]
        public bool EnableAbsorption { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Enable Dashboard", Description = "Enable the on-chart HUD dashboard", Order = 6, GroupName = "3. Feature Flags")]
        public bool EnableDashboard { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Enable Alerts", Description = "Enable system and sound alerts", Order = 7, GroupName = "3. Feature Flags")]
        public bool EnableAlerts { get; set; }

        // Group 4: Visualization Settings
        [NinjaScriptProperty]
        [Display(Name = "Watermark Position", Description = "Location of the watermark and status indicator on the chart", Order = 1, GroupName = "4. Visualization")]
        public WatermarkLocation WatermarkPosition { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Watermark Text", Description = "Text for the watermark", Order = 2, GroupName = "4. Visualization")]
        public string WatermarkText { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Diagnostics Mode", Description = "Toggle display of FPS, Tick Latency, and Memory Usage diagnostics", Order = 3, GroupName = "4. Visualization")]
        public DiagnosticsMode DiagnosticsMode { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Performance Mode", Description = "Configure visual processing load", Order = 4, GroupName = "4. Visualization")]
        public PerformanceMode PerfMode { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show Trade Bubbles", Description = "Draw aggressive big trade bubbles", Order = 5, GroupName = "4. Visualization")]
        public bool ShowTradeBubbles { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show Liquidity Zones", Description = "Draw active support/resistance zones", Order = 6, GroupName = "4. Visualization")]
        public bool ShowZones { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show Dashboard", Description = "Draw lightweight statistics dashboard", Order = 7, GroupName = "4. Visualization")]
        public bool ShowDashboard { get; set; }

        [NinjaScriptProperty]
        [Range(0, 100)]
        [Display(Name = "Bubble Transparency", Description = "Opacity percentage for bubbles (0-100)", Order = 8, GroupName = "4. Visualization")]
        public int BubbleTransparency { get; set; }

        [NinjaScriptProperty]
        [Range(0, 100)]
        [Display(Name = "Zone Transparency", Description = "Opacity percentage for zones (0-100)", Order = 9, GroupName = "4. Visualization")]
        public int ZoneTransparency { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Dashboard Position", Description = "Corner placement of the dashboard HUD", Order = 10, GroupName = "4. Visualization")]
        public WatermarkLocation DashboardPosition { get; set; }

        [NinjaScriptProperty]
        [Range(1, 512)]
        [Display(Name = "Maximum Visible Zones", Description = "Capping limits for visible zones", Order = 11, GroupName = "4. Visualization")]
        public int MaximumVisibleZones { get; set; }

        [NinjaScriptProperty]
        [Range(1, 1024)]
        [Display(Name = "Maximum Visible Bubbles", Description = "Capping limits for visible bubbles", Order = 12, GroupName = "4. Visualization")]
        public int MaximumVisibleBubbles { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show Volume Labels", Description = "Draw volume numerical labels on bubbles", Order = 13, GroupName = "4. Visualization")]
        public bool ShowVolumeLabels { get; set; }

        [NinjaScriptProperty]
        [Range(1.0, 10000.0)]
        [Display(Name = "Minimum Volume to Display", Description = "Minimum volume to render a big trade bubble", Order = 14, GroupName = "4. Visualization")]
        public double MinimumVolumeToDisplay { get; set; }

        [NinjaScriptProperty]
        [Range(0, 100)]
        [Display(Name = "Aggregation Price (Ticks)", Description = "Price distance in ticks to aggregate executions", Order = 15, GroupName = "4. Visualization")]
        public int AggregationPriceTicks { get; set; }

        // Group 5: Absorption Settings
        [NinjaScriptProperty]
        [Range(1.0, 10000.0)]
        [Display(Name = "Minimum Absorption Volume", Description = "Minimum volume to flag absorption", Order = 1, GroupName = "5. Absorption")]
        public double MinimumAbsorptionVolume { get; set; }

        [NinjaScriptProperty]
        [Range(0, 100)]
        [Display(Name = "Maximum Price Movement Ticks", Description = "Maximum price variance in ticks", Order = 2, GroupName = "5. Absorption")]
        public int MaximumPriceMovementTicks { get; set; }

        [NinjaScriptProperty]
        [Range(10, 60000)]
        [Display(Name = "Detection Window (ms)", Description = "Rolling time window in milliseconds", Order = 3, GroupName = "5. Absorption")]
        public int DetectionWindowMilliseconds { get; set; }

        [NinjaScriptProperty]
        [Range(1.0, 10000.0)]
        [Display(Name = "Minimum Delta Threshold", Description = "Minimum delta imbalance for confirmation", Order = 4, GroupName = "5. Absorption")]
        public double MinimumDeltaThreshold { get; set; }

        // Group 6: Iceberg Settings
        [NinjaScriptProperty]
        [Range(1.0, 10000.0)]
        [Display(Name = "Minimum Iceberg Volume", Description = "Minimum cumulative volume to flag iceberg", Order = 1, GroupName = "6. Iceberg")]
        public double MinimumIcebergVolume { get; set; }

        [NinjaScriptProperty]
        [Range(2, 100)]
        [Display(Name = "Minimum Executions", Description = "Minimum executions/ticks to flag iceberg", Order = 2, GroupName = "6. Iceberg")]
        public int MinimumExecutions { get; set; }

        [NinjaScriptProperty]
        [Range(0.0, 100.0)]
        [Display(Name = "Maximum Iceberg Price Movement Ticks", Description = "Maximum price movement in ticks for iceberg", Order = 3, GroupName = "6. Iceberg")]
        public double IcebergMaxPriceMovementTicks { get; set; }

        [NinjaScriptProperty]
        [Range(10, 60000)]
        [Display(Name = "Iceberg Detection Window (ms)", Description = "Iceberg detection time window in milliseconds", Order = 4, GroupName = "6. Iceberg")]
        public int IcebergDetectionWindowMilliseconds { get; set; }

        [NinjaScriptProperty]
        [Range(0.0001, 10.0)]
        [Display(Name = "Minimum Execution Density", Description = "Minimum executions per millisecond", Order = 5, GroupName = "6. Iceberg")]
        public double MinimumExecutionDensity { get; set; }

        [NinjaScriptProperty]
        [Range(1.0, 10000.0)]
        [Display(Name = "Iceberg Minimum Delta Threshold", Description = "Minimum delta imbalance for iceberg confirmation", Order = 6, GroupName = "6. Iceberg")]
        public double IcebergMinimumDeltaThreshold { get; set; }

        // Group 7: Markers & Confluence Settings
        [NinjaScriptProperty]
        [Display(Name = "Enable Marker Fading", Description = "Gradually fade markers over time", Order = 1, GroupName = "7. Markers & Confluence")]
        public bool EnableMarkerFading { get; set; }

        [NinjaScriptProperty]
        [Range(1, 1440)]
        [Display(Name = "Marker Lifetime (Minutes)", Description = "Total minutes before a marker is completely hidden", Order = 2, GroupName = "7. Markers & Confluence")]
        public int MarkerLifetimeMinutes { get; set; }

        [NinjaScriptProperty]
        [Range(0, 100)]
        [Display(Name = "Invalidation Distance (Ticks)", Description = "Ticks price must close beyond a level to invalidate the marker", Order = 3, GroupName = "7. Markers & Confluence")]
        public int InvalidationDistanceTicks { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Hide Invalid Markers", Description = "Completely hide invalidated markers instead of showing them in gray", Order = 4, GroupName = "7. Markers & Confluence")]
        public bool HideInvalidMarkers { get; set; }

        [NinjaScriptProperty]
        [Range(0.0, 50.0)]
        [Display(Name = "Confluence Distance (Ticks)", Description = "Maximum price distance in ticks to group events into a confluence", Order = 5, GroupName = "7. Markers & Confluence")]
        public double ConfluenceDistanceTicks { get; set; }

        [NinjaScriptProperty]
        [Range(10, 60000)]
        [Display(Name = "Confluence Window (ms)", Description = "Maximum time window in milliseconds to group events into a confluence", Order = 6, GroupName = "7. Markers & Confluence")]
        public int ConfluenceWindowMs { get; set; }

        #endregion

        // Read-only access to diagnostics for downstream visual reporting (C# 5 syntax)
        [Browsable(false)]
        public PerformanceTracker Diagnostics
        {
            get { return _perfTracker; }
        }

        [Browsable(false)]
        public FeatureFlags ActiveFlags
        {
            get { return _featureFlags; }
        }

        [Browsable(false)]
        public double LargestTradeToday
        {
            get { return _tradeEngine != null ? _tradeEngine.LargestTradeVolume : 0; }
        }

        [Browsable(false)]
        public double LargestBuyToday
        {
            get { return _tradeEngine != null ? _tradeEngine.LargestBuyVolume : 0; }
        }

        [Browsable(false)]
        public double LargestSellToday
        {
            get { return _tradeEngine != null ? _tradeEngine.LargestSellVolume : 0; }
        }

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Description = "High-Performance Order Flow & Big Trades Visualizer.";
                Name = "DTBigTrades Pro";
                Calculate = Calculate.OnEachTick;
                IsOverlay = true;
                DisplayInDataBox = true;
                DrawOnPricePanel = true;
                PaintPriceMarkers = true;
                
                // Defaults
                RingBufferCapacity = 4096;
                RetailMultiplier = 1.0;
                ProfessionalMultiplier = 3.0;
                InstitutionalMultiplier = 6.0;
                BlockMultiplier = 10.0;
                ExtremeMultiplier = 20.0;
                BaseAverageVolume = 50.0;
                RollingAveragePeriod = 1000;

                // Feature Flags Default Active (Disabled by default for Big Trade Mode)
                EnableDelta = true;
                EnableZones = false;
                EnableStacks = false;
                EnableIcebergs = false;
                EnableAbsorption = false;
                EnableDashboard = false;
                EnableAlerts = true;

                // Visualization defaults
                WatermarkPosition = WatermarkLocation.TopRight;
                WatermarkText = "DTBigTrades Pro";
                DiagnosticsMode = DiagnosticsMode.OFF;
                PerfMode = PerformanceMode.Balanced;
                ShowTradeBubbles = true;
                ShowZones = false; // Disabled by default
                ShowDashboard = false; // Disabled by default
                BubbleTransparency = 30;
                ZoneTransparency = 40;
                DashboardPosition = WatermarkLocation.BottomLeft;
                MaximumVisibleZones = 25;
                MaximumVisibleBubbles = 100;
                ShowVolumeLabels = true; // Enabled by default to show labels
                MinimumVolumeToDisplay = 150.0;
                AggregationPriceTicks = 2;

                // Absorption Defaults
                MinimumAbsorptionVolume = 300.0;
                MaximumPriceMovementTicks = 2;
                DetectionWindowMilliseconds = 1000;
                MinimumDeltaThreshold = 150.0;

                // Iceberg Defaults
                MinimumIcebergVolume = 100.0;
                MinimumExecutions = 5;
                IcebergMaxPriceMovementTicks = 1.0;
                IcebergDetectionWindowMilliseconds = 1000;
                MinimumExecutionDensity = 0.005;
                IcebergMinimumDeltaThreshold = 100.0;

                // Markers & Confluence Defaults
                EnableMarkerFading = true;
                MarkerLifetimeMinutes = 120;
                InvalidationDistanceTicks = 4;
                HideInvalidMarkers = true;
                ConfluenceDistanceTicks = 2.0;
                ConfluenceWindowMs = 500;
            }
            else if (State == State.Configure)
            {
                // 1. Settings Initialization
                _settings = new SettingsManager();
                _settings.RingBufferCapacity = RingBufferCapacity;
                _settings.RetailMultiplier = RetailMultiplier;
                _settings.ProfessionalMultiplier = ProfessionalMultiplier;
                _settings.InstitutionalMultiplier = InstitutionalMultiplier;
                _settings.BlockMultiplier = BlockMultiplier;
                _settings.ExtremeMultiplier = ExtremeMultiplier;
                _settings.BaseAverageVolume = BaseAverageVolume;
                _settings.RollingAveragePeriod = RollingAveragePeriod;

                // 2. Feature Flags Setup
                _featureFlags = new FeatureFlags();
                _featureFlags.EnableDelta = EnableDelta;
                _featureFlags.EnableZones = EnableZones;
                _featureFlags.EnableStacks = EnableStacks;
                _featureFlags.EnableIcebergs = EnableIcebergs;
                _featureFlags.EnableAbsorption = EnableAbsorption;
                _featureFlags.EnableDashboard = EnableDashboard;
                _featureFlags.EnableAlerts = EnableAlerts;

                // 3. Diagnostics & Tracker Setup
                _perfTracker = new PerformanceTracker();

                // 4. Synchronous EventBus Setup
                _eventBus = new EventBus();

                // 5. Manual Dependency Wiring
                _tradeEngine = new TradeEngine(_eventBus, _settings);
                _volumeEngine = new VolumeEngine(_eventBus, _settings);
                _deltaEngine = new DeltaEngine(_eventBus, _settings);
                _thresholdEngine = new ThresholdEngine(_eventBus, _settings);
                _zoneEngine = new ZoneEngine(_eventBus, _settings);

                // Wire Absorption Settings
                _settings.AbsorptionMinVolume = MinimumAbsorptionVolume;
                _settings.AbsorptionMaxTicksMove = MaximumPriceMovementTicks;
                _settings.AbsorptionWindowMs = DetectionWindowMilliseconds;
                _settings.MinimumDeltaThreshold = MinimumDeltaThreshold;

                // Instantiate Absorption Engine
                _absorptionEngine = new AbsorptionEngine(_eventBus, _settings, TickSize);

                // Wire Iceberg Settings
                _settings.IcebergMinVolume = MinimumIcebergVolume;
                _settings.IcebergMinExecutions = MinimumExecutions;
                _settings.IcebergMaxPriceMovementTicks = IcebergMaxPriceMovementTicks;
                _settings.IcebergWindowMs = IcebergDetectionWindowMilliseconds;
                _settings.MinimumExecutionDensity = MinimumExecutionDensity;
                _settings.IcebergMinimumDeltaThreshold = IcebergMinimumDeltaThreshold;

                // Instantiate Iceberg Engine
                _icebergEngine = new IcebergEngine(_eventBus, _settings, TickSize);

                // Wire Visual Settings
                _settings.WatermarkLoc = WatermarkPosition;
                _settings.WatermarkText = WatermarkText;
                _settings.DiagnosticsModeSetting = DiagnosticsMode;
                _settings.PerfMode = PerfMode;
                _settings.ShowTradeBubbles = ShowTradeBubbles;
                _settings.ShowZones = ShowZones;
                _settings.ShowDashboard = ShowDashboard;
                _settings.BubbleTransparency = BubbleTransparency;
                _settings.ZoneTransparency = ZoneTransparency;
                _settings.DashboardPosition = DashboardPosition;
                _settings.MaximumVisibleZones = MaximumVisibleZones;
                _settings.MaximumVisibleBubbles = MaximumVisibleBubbles;
                _settings.ShowVolumeLabels = ShowVolumeLabels;
                _settings.MinimumVolumeToDisplay = MinimumVolumeToDisplay;
                _settings.AggregationPriceTicks = AggregationPriceTicks;

                // Wire Confluence / Markers Settings
                _settings.EnableMarkerFading = EnableMarkerFading;
                _settings.MarkerLifetimeMinutes = MarkerLifetimeMinutes;
                _settings.InvalidationDistanceTicks = InvalidationDistanceTicks;
                _settings.HideInvalidMarkers = HideInvalidMarkers;
                _settings.ConfluenceDistanceTicks = ConfluenceDistanceTicks;
                _settings.ConfluenceWindowMs = ConfluenceWindowMs;

                // Wire Cache & Renderer
                _rendererCache = new RendererCache(_eventBus, _settings, TickSize);
                _renderer = new SharpDXRenderer(_rendererCache, _settings);

                // 6. Register Listeners to Synchronous EventBus
                _eventBus.Register(_tradeEngine);
                _eventBus.Register(_volumeEngine);
                _eventBus.Register(_deltaEngine);
                _eventBus.Register(_thresholdEngine);
                _eventBus.Register(_zoneEngine);
                _eventBus.Register(_absorptionEngine);
                _eventBus.Register(_icebergEngine);
                
                _eventBus.Register<DTBigTradesProCore.BigTradeEvent>(_rendererCache);
                _eventBus.Register<DTBigTradesProCore.ZoneEvent>(_rendererCache);
                _eventBus.Register<DTBigTradesProCore.DeltaSnapshot>(_rendererCache);
                _eventBus.Register<DTBigTradesProCore.AbsorptionEvent>(_rendererCache);
                _eventBus.Register<DTBigTradesProCore.IcebergEvent>(_rendererCache);
                _eventBus.Register<DTBigTradesProCore.ConfluenceEvent>(_rendererCache);
                _eventBus.Register<DTBigTradesProCore.TradeEvent>(_rendererCache);

                _eventBus.Register<DTBigTradesProCore.AbsorptionEvent>((IEventListener<DTBigTradesProCore.AbsorptionEvent>)_zoneEngine);
                _eventBus.Register<DTBigTradesProCore.IcebergEvent>((IEventListener<DTBigTradesProCore.IcebergEvent>)_zoneEngine);
                _eventBus.Register<DTBigTradesProCore.ConfluenceEvent>((IEventListener<DTBigTradesProCore.ConfluenceEvent>)_zoneEngine);

                // 7. Freeze registrations to construct flat, fast iteration arrays
                _eventBus.Freeze();

                Print("DTBigTrades Pro: Foundation Architecture configured (DI manual).");
            }
            else if (State == State.DataLoaded)
            {
                // Reset engines upon historical data load
                if (_volumeEngine != null) _volumeEngine.ResetVolume();
                if (_deltaEngine != null) _deltaEngine.ResetSessionDelta();
                _currentBid = 0;
                _currentAsk = 0;
                
                // Initialize memory baseline
                if (_perfTracker != null) _perfTracker.InitializeMemoryTracking();
                if (_rendererCache != null) _rendererCache.Reset();

                Print("DTBigTrades Pro: Data loaded, memory monitoring initialized.");
            }
            else if (State == State.Realtime)
            {
                if (_rendererCache != null)
                {
                    _rendererCache.SetHistorical(false);
                }
            }
            else if (State == State.Terminated)
            {
                if (_renderer != null)
                {
                    _renderer.Dispose();
                    _renderer = null;
                }
                if (_rendererCache != null)
                {
                    _rendererCache.Reset();
                    _rendererCache = null;
                }
            }
        }

        protected override void OnBarUpdate()
        {
            if (_featureFlags != null && !_featureFlags.EnableDelta) return;

            if (IsFirstTickOfBar && _deltaEngine != null)
            {
                _deltaEngine.ResetBarDelta();
                if (Bars.IsFirstBarOfSession)
                {
                    _deltaEngine.ResetSessionDelta();
                }
            }
        }

        protected override void OnMarketData(MarketDataEventArgs marketDataUpdate)
        {
            // Cache current Bid/Ask ticks to determine aggressor
            if (marketDataUpdate.MarketDataType == MarketDataType.Bid)
            {
                _currentBid = marketDataUpdate.Price;
            }
            else if (marketDataUpdate.MarketDataType == MarketDataType.Ask)
            {
                _currentAsk = marketDataUpdate.Price;
            }
            else if (marketDataUpdate.MarketDataType == MarketDataType.Last)
            {
                if (_tradeEngine != null)
                {
                    // Start tick processing diagnostic latency stopwatch
                    if (_perfTracker != null) _perfTracker.StartTickMeasure();

                    // Delegate tick capture processing
                    _tradeEngine.ProcessTick(
                        marketDataUpdate.Time.Ticks,
                        marketDataUpdate.Price,
                        marketDataUpdate.Volume,
                        _currentBid,
                        _currentAsk
                    );

                    // End tick processing diagnostic latency stopwatch
                    if (_perfTracker != null) _perfTracker.EndTickMeasure();
                }
            }
        }

        public override void OnRenderTargetChanged()
        {
            if (_renderer != null)
            {
                _renderer.OnRenderTargetChanged(RenderTarget);
            }
        }

        protected override void OnRender(ChartControl chartControl, ChartScale chartScale)
        {
            if (_rendererCache != null)
            {
                if (_perfTracker != null)
                {
                    _rendererCache.UpdateDiagnostics(
                        _perfTracker.Latency.AverageMicroseconds,
                        _perfTracker.Latency.MaxMicroseconds,
                        _perfTracker.Memory.GetHeapMemoryDelta()
                    );
                }
                
                _rendererCache.UpdateLargestTrades(
                    LargestTradeToday,
                    LargestBuyToday,
                    LargestSellToday
                );
            }

            if (_renderer != null)
            {
                _renderer.Draw(RenderTarget, chartControl, chartScale, chartScale.PanelIndex);
            }
        }
    }
}
