using System;
using SharpDX.DirectWrite;
using NinjaTrader.Cbi;

namespace NinjaTrader.NinjaScript.Indicators.DTBigTradesProCore
{
    /// <summary>
    /// Thread-safe caching layer that separates high-frequency engine updates from chart rendering.
    /// Performs bar-bound execution aggregation of raw ticks into volume-weighted trade bubbles.
    /// Compatible with C# 5.
    /// </summary>
    public class RendererCache : 
        IEventListener<BigTradeEvent>, 
        IEventListener<ZoneEvent>, 
        IEventListener<DeltaSnapshot>, 
        IEventListener<AbsorptionEvent>, 
        IEventListener<IcebergEvent>, 
        IEventListener<ConfluenceEvent>, 
        IEventListener<TradeEvent>, 
        IDisposable
    {
        private readonly object _lock = new object();
        private readonly EventBus _eventBus;
        private readonly SettingsManager _settings;
        private readonly double _tickSize;

        // Cached Trade Bubbles
        private readonly RenderTradeBubble[] _rankedBubbles = new RenderTradeBubble[1024];
        private readonly TextLayout[] _rankedBubbleLayouts = new TextLayout[1024];
        private int _bubbleCount;

        // Pre-allocated DirectWrite text formatting for bubble volume labels
        private TextFormat _bubbleTextFormat;

        // Current bar tracker
        private int _currentBarIndex;

        // Cached Delta Snapshot
        private DeltaSnapshot _latestDelta;
        private bool _hasDelta;

        // Caching performance diagnostics
        private double _avgLatencyUs;
        private double _maxLatencyUs;
        private long _memoryDeltaBytes;

        // Largest trade cache
        private double _largestTradeVolume;
        private double _largestBuyVolume;
        private double _largestSellVolume;

        // Core Status States
        private volatile bool _isHistorical = true;
        private long _lastConnectionCheckTicks;
        private bool _isConnectedCached;

        private long _lastEventTimestampTicks;

        public RendererCache(EventBus eventBus, SettingsManager settings, double tickSize)
        {
            if (eventBus == null) throw new ArgumentNullException("eventBus");
            if (settings == null) throw new ArgumentNullException("settings");
            _eventBus = eventBus;
            _settings = settings;
            _tickSize = tickSize;

            // Pre-allocate device-independent TextFormat for bubbles
            _bubbleTextFormat = new TextFormat(
                NinjaTrader.Core.Globals.DirectWriteFactory,
                "Segoe UI",
                FontWeight.Bold,
                FontStyle.Normal,
                FontStretch.Normal,
                11.0f
            );
            _bubbleTextFormat.TextAlignment = TextAlignment.Center;
            _bubbleTextFormat.ParagraphAlignment = ParagraphAlignment.Center;

            Reset();
        }

        public void Reset()
        {
            lock (_lock)
            {
                // Clear and dispose layout objects to prevent COM resource leaks
                for (int i = 0; i < _rankedBubbleLayouts.Length; i++)
                {
                    if (_rankedBubbleLayouts[i] != null)
                    {
                        _rankedBubbleLayouts[i].Dispose();
                        _rankedBubbleLayouts[i] = null;
                    }
                }
                _bubbleCount = 0;
                Array.Clear(_rankedBubbles, 0, _rankedBubbles.Length);

                _latestDelta = default(DeltaSnapshot);
                _hasDelta = false;

                _avgLatencyUs = 0;
                _maxLatencyUs = 0;
                _memoryDeltaBytes = 0;
                _largestTradeVolume = 0;
                _largestBuyVolume = 0;
                _largestSellVolume = 0;

                _isHistorical = true;
                _lastConnectionCheckTicks = 0;
                _isConnectedCached = false;
                _lastEventTimestampTicks = 0;
                _currentBarIndex = 0;
            }
        }

        public void SetHistorical(bool isHistorical)
        {
            _isHistorical = isHistorical;
        }

        public bool IsHistorical
        {
            get { return _isHistorical; }
        }

        public void UpdateCurrentBar(int barIndex)
        {
            lock (_lock)
            {
                _currentBarIndex = barIndex;
            }
        }

        /// <summary>
        /// Raw Tick Ingestion: Aggregates aggressive executions on the same candle, same direction,
        /// and within 2 ticks into a single proportional bubble.
        /// </summary>
        public void OnEvent(ref TradeEvent ev)
        {
            if (ev.Direction == TradeDirection.Unknown || ev.Volume <= 0) return;

            lock (_lock)
            {
                _lastEventTimestampTicks = Math.Max(_lastEventTimestampTicks, ev.TimestampTicks);

                bool aggregated = false;
                double aggregationThreshold = _settings.AggregationPriceTicks * _tickSize;

                // Try to find a matching bubble in the current candle to aggregate
                for (int i = 0; i < _bubbleCount; i++)
                {
                    if (_rankedBubbles[i].BarIndex == _currentBarIndex &&
                        _rankedBubbles[i].Direction == ev.Direction &&
                        Math.Abs(_rankedBubbles[i].Price - ev.Price) <= (aggregationThreshold + 0.00001))
                    {
                        // Merge executions
                        _rankedBubbles[i].Volume += ev.Volume;
                        _rankedBubbles[i].Timestamp = ev.TimestampTicks;
                        
                        // Recalculate dynamic size
                        _rankedBubbles[i].Size = CalculateBubbleSize(_rankedBubbles[i].Volume);

                        // Regenerate text layout
                        UpdateBubbleTextLayout(i);

                        aggregated = true;
                        break;
                    }
                }

                if (!aggregated)
                {
                    // Create new bubble level
                    RenderTradeBubble newBubble = new RenderTradeBubble(
                        ev.Price,
                        ev.Direction,
                        CalculateBubbleSize(ev.Volume),
                        TradeClassification.Retail,
                        ev.TimestampTicks,
                        ev.Volume,
                        _currentBarIndex
                    );

                    if (_bubbleCount < 1024)
                    {
                        _rankedBubbles[_bubbleCount] = newBubble;
                        UpdateBubbleTextLayout(_bubbleCount);
                        _bubbleCount++;
                    }
                    else
                    {
                        // Evict the oldest bubble to make space
                        int oldestIdx = 0;
                        long oldestTicks = _rankedBubbles[0].Timestamp;
                        for (int i = 1; i < 1024; i++)
                        {
                            if (_rankedBubbles[i].Timestamp < oldestTicks)
                            {
                                oldestTicks = _rankedBubbles[i].Timestamp;
                                oldestIdx = i;
                            }
                        }

                        if (_rankedBubbleLayouts[oldestIdx] != null)
                        {
                            _rankedBubbleLayouts[oldestIdx].Dispose();
                            _rankedBubbleLayouts[oldestIdx] = null;
                        }

                        _rankedBubbles[oldestIdx] = newBubble;
                        UpdateBubbleTextLayout(oldestIdx);
                    }
                }

                // In-place sort by timestamp descending (Most Recent First)
                SortBubblesInternal();
            }
        }

        private double CalculateBubbleSize(double volume)
        {
            double minVol = _settings.MinimumVolumeToDisplay;
            if (minVol <= 0) minVol = 150.0;

            double ratio = volume / minVol;
            if (ratio < 0.1) ratio = 0.1;

            // Sizing dynamically by volume using square-root scaling
            double size = 15.0 * Math.Sqrt(ratio);

            // Clamp between 10 and 50
            if (size < 10.0) size = 10.0;
            if (size > 50.0) size = 50.0;

            return size;
        }

        private void UpdateBubbleTextLayout(int index)
        {
            if (_rankedBubbleLayouts[index] != null)
            {
                _rankedBubbleLayouts[index].Dispose();
                _rankedBubbleLayouts[index] = null;
            }

            if (_bubbleTextFormat != null)
            {
                string volStr = _rankedBubbles[index].Volume.ToString("F0");
                _rankedBubbleLayouts[index] = new TextLayout(
                    NinjaTrader.Core.Globals.DirectWriteFactory,
                    volStr,
                    _bubbleTextFormat,
                    100.0f,
                    20.0f
                );
            }
        }

        /// <summary>
        /// Bubble Comparator (Descending Timestamp - Most Recent First).
        /// </summary>
        private static int CompareBubbles(ref RenderTradeBubble a, ref RenderTradeBubble b)
        {
            return b.Timestamp.CompareTo(a.Timestamp);
        }

        private void SortBubblesInternal()
        {
            int count = _bubbleCount;
            for (int i = 1; i < count; i++)
            {
                RenderTradeBubble keyBubble = _rankedBubbles[i];
                TextLayout keyLayout = _rankedBubbleLayouts[i];
                int j = i - 1;
                while (j >= 0 && CompareBubbles(ref _rankedBubbles[j], ref keyBubble) > 0)
                {
                    _rankedBubbles[j + 1] = _rankedBubbles[j];
                    _rankedBubbleLayouts[j + 1] = _rankedBubbleLayouts[j];
                    j = j - 1;
                }
                _rankedBubbles[j + 1] = keyBubble;
                _rankedBubbleLayouts[j + 1] = keyLayout;
            }
        }

        /// <summary>
        /// Copies pre-ranked bubbles and their layouts. Returns count copied.
        /// Filters by MinimumVolumeToDisplay and caps at MaximumVisibleBubbles (maxCount).
        /// </summary>
        public int GetTradeBubbles(RenderTradeBubble[] dest, TextLayout[] destLayouts, int maxCount)
        {
            if (dest == null) return 0;
            lock (_lock)
            {
                int count = 0;
                double minVol = _settings.MinimumVolumeToDisplay;

                for (int i = 0; i < _bubbleCount && count < dest.Length && count < maxCount; i++)
                {
                    if (_rankedBubbles[i].Volume >= minVol)
                    {
                        dest[count] = _rankedBubbles[i];
                        if (destLayouts != null && count < destLayouts.Length)
                        {
                            destLayouts[count] = _rankedBubbleLayouts[i];
                        }
                        count++;
                    }
                }
                return count;
            }
        }

        public long GetLastEventTimestampTicks()
        {
            lock (_lock)
            {
                return _lastEventTimestampTicks;
            }
        }

        // Unused Engine listeners (Kept as simple no-ops to maintain interface contracts)
        public void OnEvent(ref BigTradeEvent ev) {}
        public void OnEvent(ref ZoneEvent ev) {}
        public void OnEvent(ref AbsorptionEvent ev) {}
        public void OnEvent(ref IcebergEvent ev) {}
        public void OnEvent(ref ConfluenceEvent ev) {}

        public void OnEvent(ref DeltaSnapshot ev)
        {
            lock (_lock)
            {
                _latestDelta = ev;
                _hasDelta = true;
            }
        }

        public void UpdateDiagnostics(double avgLatencyUs, double maxLatencyUs, long memoryDeltaBytes)
        {
            lock (_lock)
            {
                _avgLatencyUs = avgLatencyUs;
                _maxLatencyUs = maxLatencyUs;
                _memoryDeltaBytes = memoryDeltaBytes;
            }
        }

        public void GetDiagnostics(out double avgLatencyUs, out double maxLatencyUs, out long memoryDeltaBytes)
        {
            lock (_lock)
            {
                avgLatencyUs = _avgLatencyUs;
                maxLatencyUs = _maxLatencyUs;
                memoryDeltaBytes = _memoryDeltaBytes;
            }
        }

        public void UpdateLargestTrades(double largestTrade, double largestBuy, double largestSell)
        {
            lock (_lock)
            {
                _largestTradeVolume = largestTrade;
                _largestBuyVolume = largestBuy;
                _largestSellVolume = largestSell;
            }
        }

        public void GetLargestTrades(out double largestTrade, out double largestBuy, out double largestSell)
        {
            lock (_lock)
            {
                largestTrade = _largestTradeVolume;
                largestBuy = _largestBuyVolume;
                largestSell = _largestSellVolume;
            }
        }

        public bool TryGetDeltaSnapshot(out DeltaSnapshot snapshot)
        {
            lock (_lock)
            {
                snapshot = _latestDelta;
                return _hasDelta;
            }
        }

        public int GetActiveZones(RenderZone[] dest, int maxCount)
        {
            return 0;
        }

        public int GetBrokenZones(RenderZone[] dest)
        {
            return 0;
        }

        public int ActiveZoneCount
        {
            get { return 0; }
        }

        public StatusIndicatorColor GetStatusColor()
        {
            if (_isHistorical)
            {
                return StatusIndicatorColor.Yellow;
            }

            long now = DateTime.UtcNow.Ticks;
            if (now - _lastConnectionCheckTicks > 10000000) // 1 second
            {
                _lastConnectionCheckTicks = now;
                _isConnectedCached = CheckConnectionStatus();
            }

            return _isConnectedCached ? StatusIndicatorColor.Green : StatusIndicatorColor.Red;
        }

        private bool CheckConnectionStatus()
        {
            bool isConnected = false;
            try
            {
                lock (Connection.Connections)
                {
                    foreach (Connection conn in Connection.Connections)
                    {
                        if (conn.Status == ConnectionStatus.Connected)
                        {
                            isConnected = true;
                            break;
                        }
                    }
                }
            }
            catch {}
            return isConnected;
        }

        public void Dispose()
        {
            lock (_lock)
            {
                for (int i = 0; i < _rankedBubbleLayouts.Length; i++)
                {
                    if (_rankedBubbleLayouts[i] != null)
                    {
                        _rankedBubbleLayouts[i].Dispose();
                        _rankedBubbleLayouts[i] = null;
                    }
                }
                if (_bubbleTextFormat != null)
                {
                    _bubbleTextFormat.Dispose();
                    _bubbleTextFormat = null;
                }
            }
        }
    }
}
