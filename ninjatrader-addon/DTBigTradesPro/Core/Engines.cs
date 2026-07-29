using System;

namespace NinjaTrader.NinjaScript.Indicators.DTBigTradesProCore
{
    /// <summary>
    /// Concrete implementation of the Trade Engine.
    /// Captures ticks, detects aggressors, and buffers events in a high-performance circular cache.
    /// </summary>
    public class TradeEngine : ITradeEngine
    {
        private readonly EventBus _eventBus;
        private readonly SettingsManager _settings;
        private readonly LockFreeRingBuffer<TradeEvent> _tradeBuffer;

        // Diagnostics counters
        private long _buyTradeCount;
        private long _sellTradeCount;
        private long _unknownTradeCount;

        // Largest trade diagnostics
        private double _largestTradeVolume;
        private double _largestBuyVolume;
        private double _largestSellVolume;

        public TradeEngine(EventBus eventBus, SettingsManager settings)
        {
            if (eventBus == null) throw new ArgumentNullException("eventBus");
            if (settings == null) throw new ArgumentNullException("settings");
            _eventBus = eventBus;
            _settings = settings;
            _tradeBuffer = new LockFreeRingBuffer<TradeEvent>(_settings.RingBufferCapacity);
        }

        public LockFreeRingBuffer<TradeEvent> TradeBuffer
        {
            get { return _tradeBuffer; }
        }

        public long BuyTradeCount
        {
            get { return _buyTradeCount; }
        }

        public long SellTradeCount
        {
            get { return _sellTradeCount; }
        }

        public long UnknownTradeCount
        {
            get { return _unknownTradeCount; }
        }

        public double UnknownTradePercentage
        {
            get
            {
                long total = _buyTradeCount + _sellTradeCount + _unknownTradeCount;
                if (total == 0) return 0;
                return (_unknownTradeCount * 100.0) / total;
            }
        }

        public double LargestTradeVolume
        {
            get { return _largestTradeVolume; }
        }

        public double LargestBuyVolume
        {
            get { return _largestBuyVolume; }
        }

        public double LargestSellVolume
        {
            get { return _largestSellVolume; }
        }

        /// <summary>
        /// Ingests a raw market tick, determines the aggressor, and broadcasts the TradeEvent.
        /// </summary>
        public void ProcessTick(long timestampTicks, double price, double volume, double bid, double ask)
        {
            if (volume <= 0) return;

            // Aggressor Detection Logic
            TradeDirection direction = TradeDirection.Unknown;
            
            if (ask > 0 && price >= ask)
            {
                direction = TradeDirection.Buy;
            }
            else if (bid > 0 && price <= bid)
            {
                direction = TradeDirection.Sell;
            }

            // Update diagnostics counters
            if (direction == TradeDirection.Buy)
            {
                _buyTradeCount++;
            }
            else if (direction == TradeDirection.Sell)
            {
                _sellTradeCount++;
            }
            else
            {
                _unknownTradeCount++;
            }

            // Update largest trade statistics
            if (volume > _largestTradeVolume)
            {
                _largestTradeVolume = volume;
            }
            if (direction == TradeDirection.Buy && volume > _largestBuyVolume)
            {
                _largestBuyVolume = volume;
            }
            if (direction == TradeDirection.Sell && volume > _largestSellVolume)
            {
                _largestSellVolume = volume;
            }

            // Create flat struct (stack allocated)
            TradeEvent trade = new TradeEvent(timestampTicks, price, volume, bid, ask, direction);

            // Write to lock-free circular ring buffer cache (constant memory)
            _tradeBuffer.Enqueue(ref trade);

            // Synchronously publish event to downstream engines
            _eventBus.Publish(ref trade);
        }

        public void OnEvent(ref TradeEvent ev)
        {
            // No-op; TradeEngine acts purely as a producer of TradeEvent
        }
    }

    /// <summary>
    /// Skeleton implementation of the Volume Engine.
    /// Tracks buying and selling volume totals.
    /// </summary>
    public class VolumeEngine : IVolumeEngine
    {
        private readonly EventBus _eventBus;
        private readonly SettingsManager _settings;
        private double _totalBuyVolume;
        private double _totalSellVolume;

        public VolumeEngine(EventBus eventBus, SettingsManager settings)
        {
            if (eventBus == null) throw new ArgumentNullException("eventBus");
            if (settings == null) throw new ArgumentNullException("settings");
            _eventBus = eventBus;
            _settings = settings;
        }

        public double TotalBuyVolume
        {
            get { return _totalBuyVolume; }
        }

        public double TotalSellVolume
        {
            get { return _totalSellVolume; }
        }

        public void ResetVolume()
        {
            _totalBuyVolume = 0;
            _totalSellVolume = 0;
        }

        public void OnEvent(ref TradeEvent ev)
        {
            // Concrete volume tracking will be implemented in subsequent phases
        }
    }

    /// <summary>
    /// Concrete implementation of the Delta Engine.
    /// Tracks bar-level, session-level, and cumulative volume delta.
    /// </summary>
    public class DeltaEngine : IDeltaEngine
    {
        private readonly EventBus _eventBus;
        private readonly SettingsManager _settings;
        
        private double _currentDelta;
        private double _barDelta;
        private double _sessionDelta;
        private double _cumulativeDelta;
        
        // Bar-level buy/sell volume variables (reset per bar)
        private double _buyVolume;
        private double _sellVolume;

        // Diagnostics tracking variables
        private double _largestPositiveDelta;
        private double _largestNegativeDelta;
        private double _totalBuyVolume;
        private double _totalSellVolume;

        public DeltaEngine(EventBus eventBus, SettingsManager settings)
        {
            if (eventBus == null) throw new ArgumentNullException("eventBus");
            if (settings == null) throw new ArgumentNullException("settings");
            _eventBus = eventBus;
            _settings = settings;

            _largestPositiveDelta = 0;
            _largestNegativeDelta = 0;
            _totalBuyVolume = 0;
            _totalSellVolume = 0;
        }

        public double CurrentDelta
        {
            get { return _currentDelta; }
        }

        public double BarDelta
        {
            get { return _barDelta; }
        }

        public double SessionDelta
        {
            get { return _sessionDelta; }
        }

        public double CumulativeDelta
        {
            get { return _cumulativeDelta; }
        }

        public double LargestPositiveDelta
        {
            get { return _largestPositiveDelta; }
        }

        public double LargestNegativeDelta
        {
            get { return _largestNegativeDelta; }
        }

        public double TotalBuyVolume
        {
            get { return _totalBuyVolume; }
        }

        public double TotalSellVolume
        {
            get { return _totalSellVolume; }
        }

        public DeltaSnapshot GetSnapshot()
        {
            return new DeltaSnapshot(_currentDelta, _barDelta, _sessionDelta, _cumulativeDelta, _buyVolume, _sellVolume, 0);
        }

        public void ResetBarDelta()
        {
            _barDelta = 0;
            _buyVolume = 0;
            _sellVolume = 0;
            _currentDelta = 0;
        }

        public void ResetSessionDelta()
        {
            _sessionDelta = 0;
        }

        /// <summary>
        /// Accumulates volume delta tick-by-tick from TradeEvents.
        /// Ignores unknown aggressors.
        /// </summary>
        public void OnEvent(ref TradeEvent ev)
        {
            TradeDirection dir = ev.Direction;
            if (dir == TradeDirection.Unknown) return; // Skip unknown trades

            double vol = ev.Volume;
            if (vol <= 0) return;

            // Increment values based on direction
            if (dir == TradeDirection.Buy)
            {
                _buyVolume += vol;
                _totalBuyVolume += vol;
                _currentDelta = vol;
            }
            else if (dir == TradeDirection.Sell)
            {
                _sellVolume += vol;
                _totalSellVolume += vol;
                _currentDelta = -vol;
            }

            // O(1) mathematical accumulation
            _barDelta += _currentDelta;
            _sessionDelta += _currentDelta;
            _cumulativeDelta += _currentDelta;

            // Track diagnostics delta thresholds
            if (_barDelta > _largestPositiveDelta)
            {
                _largestPositiveDelta = _barDelta;
            }
            if (_barDelta < _largestNegativeDelta)
            {
                _largestNegativeDelta = _barDelta;
            }

            // Create snapshot structure (stack allocated)
            DeltaSnapshot snapshot = new DeltaSnapshot(
                _currentDelta,
                _barDelta,
                _sessionDelta,
                _cumulativeDelta,
                _buyVolume,
                _sellVolume,
                ev.TimestampTicks
            );

            // Synchronously dispatch snapshot via EventBus
            _eventBus.Publish(ref snapshot);
        }
    }

    /// <summary>
    /// Concrete implementation of the Threshold Engine.
    /// Classifies incoming trade sizes relative to adaptive, rolling volume averages.
    /// </summary>
    public class ThresholdEngine : IThresholdEngine
    {
        private readonly EventBus _eventBus;
        private readonly SettingsManager _settings;
        
        private double _rollingAverage;

        // Rolling average states (O(1) buffer)
        private readonly double[] _sizeBuffer;
        private int _bufferIndex;
        private double _rollingSum;
        private long _totalCount;

        // Statistics counters
        private long _professionalCount;
        private long _institutionalCount;
        private long _blockCount;
        private long _extremeCount;

        public ThresholdEngine(EventBus eventBus, SettingsManager settings)
        {
            if (eventBus == null) throw new ArgumentNullException("eventBus");
            if (settings == null) throw new ArgumentNullException("settings");
            _eventBus = eventBus;
            _settings = settings;

            int lookback = _settings.RollingAveragePeriod;
            if (lookback < 1) lookback = 1000; // Default fallback
            _sizeBuffer = new double[lookback];
            
            _rollingSum = 0;
            _bufferIndex = 0;
            _totalCount = 0;
            
            _rollingAverage = _settings.BaseAverageVolume;
        }

        public double RetailThreshold
        {
            get { return _rollingAverage * _settings.RetailMultiplier; }
        }

        public double ProfessionalThreshold
        {
            get { return _rollingAverage * _settings.ProfessionalMultiplier; }
        }

        public double InstitutionalThreshold
        {
            get { return _rollingAverage * _settings.InstitutionalMultiplier; }
        }

        public double BlockThreshold
        {
            get { return _rollingAverage * _settings.BlockMultiplier; }
        }

        public double ExtremeThreshold
        {
            get { return _rollingAverage * _settings.ExtremeMultiplier; }
        }

        public double RollingAverage
        {
            get { return _rollingAverage; }
        }

        public long ProfessionalCount
        {
            get { return _professionalCount; }
        }

        public long InstitutionalCount
        {
            get { return _institutionalCount; }
        }

        public long BlockCount
        {
            get { return _blockCount; }
        }

        public long ExtremeCount
        {
            get { return _extremeCount; }
        }

        public TradeClassification Classify(double volume)
        {
            // Classification matching thresholds
            if (volume >= ExtremeThreshold) return TradeClassification.Extreme;
            if (volume >= BlockThreshold) return TradeClassification.Block;
            if (volume >= InstitutionalThreshold) return TradeClassification.Institutional;
            if (volume >= ProfessionalThreshold) return TradeClassification.Professional;
            return TradeClassification.Retail;
        }

        /// <summary>
        /// Handles incoming TradeEvents, updates the rolling average size, classifies the trade,
        /// and publishes BigTradeEvents synchronously if thresholds are exceeded.
        /// </summary>
        public void OnEvent(ref TradeEvent ev)
        {
            double size = ev.Volume;
            if (size <= 0) return;

            int limit = _sizeBuffer.Length;

            // O(1) rolling average calculation without LINQ/allocations
            if (_totalCount < limit)
            {
                _rollingSum += size;
                _sizeBuffer[_bufferIndex] = size;
                _bufferIndex++;
                if (_bufferIndex >= limit) _bufferIndex = 0;
            }
            else
            {
                _rollingSum -= _sizeBuffer[_bufferIndex];
                _rollingSum += size;
                _sizeBuffer[_bufferIndex] = size;
                _bufferIndex++;
                if (_bufferIndex >= limit) _bufferIndex = 0;
            }

            _totalCount++;
            
            long denom = _totalCount < limit ? _totalCount : limit;
            _rollingAverage = _rollingSum / denom;

            // Classify trade size dynamically
            TradeClassification classification = Classify(size);

            // Update stats and publish events if classification is >= Professional
            if (classification >= TradeClassification.Professional)
            {
                if (classification == TradeClassification.Professional)
                {
                    _professionalCount++;
                }
                else if (classification == TradeClassification.Institutional)
                {
                    _institutionalCount++;
                }
                else if (classification == TradeClassification.Block)
                {
                    _blockCount++;
                }
                else if (classification == TradeClassification.Extreme)
                {
                    _extremeCount++;
                }

                // Publish BigTradeEvent synchronously through the EventBus
                BigTradeEvent bigTrade = new BigTradeEvent(
                    ev.TimestampTicks,
                    ev.Price,
                    size,
                    ev.Direction,
                    classification,
                    false, // IsAggregated (Phase 6)
                    1      // AggregatedCount
                );

                _eventBus.Publish(ref bigTrade);
            }
        }
    }

    /// <summary>
    /// Concrete implementation of the Liquidity Zone Engine.
    /// Tracks active support/resistance zones and manages their lifecycles.
    /// </summary>
    public class ZoneEngine : IZoneEngine, IEventListener<AbsorptionEvent>, IEventListener<IcebergEvent>, IEventListener<ConfluenceEvent>
    {
        private readonly EventBus _eventBus;
        private readonly SettingsManager _settings;

        private readonly ZoneEvent[] _activeZones;
        private int _activeCount;

        private readonly ZoneEvent[] _brokenZones;
        private int _brokenCount;

        private readonly ZoneEvent[] _retiredZones;
        private int _retiredCount;

        private const int MaxCapacity = 512; // Flat fixed array limit to enforce zero allocations

        // Diagnostics
        private ZoneEvent _highestScoreZone;
        private ZoneEvent _mostRetestedZone;

        public ZoneEngine(EventBus eventBus, SettingsManager settings)
        {
            if (eventBus == null) throw new ArgumentNullException("eventBus");
            if (settings == null) throw new ArgumentNullException("settings");
            _eventBus = eventBus;
            _settings = settings;

            _activeZones = new ZoneEvent[MaxCapacity];
            _brokenZones = new ZoneEvent[MaxCapacity];
            _retiredZones = new ZoneEvent[MaxCapacity];

            _activeCount = 0;
            _brokenCount = 0;
            _retiredCount = 0;

            _highestScoreZone = default(ZoneEvent);
            _mostRetestedZone = default(ZoneEvent);
        }

        public int ActiveZoneCount
        {
            get { return _activeCount; }
        }

        public int BrokenZoneCount
        {
            get { return _brokenCount; }
        }

        public int RetiredZoneCount
        {
            get { return _retiredCount; }
        }

        public ZoneEvent HighestScoreZone
        {
            get { return _highestScoreZone; }
        }

        public ZoneEvent MostRetestedZone
        {
            get { return _mostRetestedZone; }
        }

        public int GetActiveZones(ZoneEvent[] dest)
        {
            if (dest == null) return 0;
            int count = Math.Min(dest.Length, _activeCount);
            for (int i = 0; i < count; i++)
            {
                dest[i] = _activeZones[i];
            }
            return count;
        }

        public int GetBrokenZones(ZoneEvent[] dest)
        {
            if (dest == null) return 0;
            int count = Math.Min(dest.Length, _brokenCount);
            for (int i = 0; i < count; i++)
            {
                dest[i] = _brokenZones[i];
            }
            return count;
        }

        public int GetRetiredZones(ZoneEvent[] dest)
        {
            if (dest == null) return 0;
            int count = Math.Min(dest.Length, _retiredCount);
            for (int i = 0; i < count; i++)
            {
                dest[i] = _retiredZones[i];
            }
            return count;
        }

        public void AddZone(double price, TradeDirection direction, ZoneType type, double score, long creationTime)
        {
            // Enforce constant memory limit: if active count is at maximum, drop/retire the oldest zone
            if (_activeCount >= MaxCapacity)
            {
                // Retire the oldest active zone (index 0)
                ZoneEvent oldest = _activeZones[0];
                oldest.IsActive = false;
                
                // Add to retired list (circular buffer style)
                int retIdx = _retiredCount++ % MaxCapacity;
                _retiredZones[retIdx] = oldest;
                if (_retiredCount > MaxCapacity) _retiredCount = MaxCapacity;

                // Swap and decrement to delete index 0
                _activeZones[0] = _activeZones[_activeCount - 1];
                _activeCount--;
            }

            ZoneEvent zone = new ZoneEvent(price, direction, creationTime, 1.0, type, score);
            _activeZones[_activeCount++] = zone;

            // Update highest score diagnostic
            if (score > _highestScoreZone.ZoneScore)
            {
                _highestScoreZone = zone;
            }

            // Publish update via EventBus
            _eventBus.Publish(ref zone);
        }

        public void RemoveZone(double price)
        {
            for (int i = 0; i < _activeCount; i++)
            {
                if (Math.Abs(_activeZones[i].Price - price) < 0.00001)
                {
                    // Swap last element to current index and decrement count
                    _activeZones[i] = _activeZones[_activeCount - 1];
                    _activeZones[_activeCount - 1] = default(ZoneEvent);
                    _activeCount--;
                    break;
                }
            }
        }

        public void BreakZone(double price, long breakTime)
        {
            for (int i = 0; i < _activeCount; i++)
            {
                if (Math.Abs(_activeZones[i].Price - price) < 0.00001)
                {
                    ZoneEvent brokenZone = _activeZones[i];
                    brokenZone.IsBroken = true;
                    brokenZone.IsActive = false;

                    // Copy to broken zones (circular buffer style)
                    int brIdx = _brokenCount++ % MaxCapacity;
                    _brokenZones[brIdx] = brokenZone;
                    if (_brokenCount > MaxCapacity) _brokenCount = MaxCapacity;

                    // Swap and decrement to delete from active
                    _activeZones[i] = _activeZones[_activeCount - 1];
                    _activeZones[_activeCount - 1] = default(ZoneEvent);
                    _activeCount--;

                    // Publish updated ZoneEvent
                    _eventBus.Publish(ref brokenZone);
                    break;
                }
            }
        }

        public void RetestZone(double price)
        {
            for (int i = 0; i < _activeCount; i++)
            {
                if (Math.Abs(_activeZones[i].Price - price) < 0.00001)
                {
                    _activeZones[i].RetestCount++;
                    
                    // Update most retested diagnostic
                    if (_activeZones[i].RetestCount > _mostRetestedZone.RetestCount)
                    {
                        _mostRetestedZone = _activeZones[i];
                    }

                    ZoneEvent retestEvent = _activeZones[i];
                    _eventBus.Publish(ref retestEvent);
                    break;
                }
            }
        }

        /// <summary>
        /// Handles incoming BigTradeEvents to create dynamic liquidity zones.
        /// </summary>
        public void OnEvent(ref BigTradeEvent ev)
        {
            // Check classification and assign scores
            double score = 0;
            ZoneType type;

            if (ev.Classification == TradeClassification.Institutional)
            {
                score = 25;
                type = ZoneType.InstitutionalTrade;
            }
            else if (ev.Classification == TradeClassification.Block)
            {
                score = 50;
                type = ZoneType.BlockTrade;
            }
            else if (ev.Classification == TradeClassification.Extreme)
            {
                score = 100;
                type = ZoneType.ExtremeTrade;
            }
            else
            {
                return; // Only institutional, block, and extreme trades create zones
            }

            AddZone(ev.Price, ev.Direction, type, score, ev.TimestampTicks);
        }

        /// <summary>
        /// Handles incoming AbsorptionEvents to create dynamic support/resistance zones.
        /// Zone score is scaled by the weighted strength of the absorption.
        /// </summary>
        public void OnEvent(ref AbsorptionEvent ev)
        {
            double zoneScore = 75.0 * ev.StrengthScore;
            AddZone(ev.Price, ev.Direction, ZoneType.Absorption, zoneScore, ev.Timestamp);
        }

        /// <summary>
        /// Handles incoming IcebergEvents to create dynamic support/resistance zones.
        /// Zone score is scaled by the strength of the iceberg order and clamped.
        /// </summary>
        public void OnEvent(ref IcebergEvent ev)
        {
            double zoneScore = 75.0 * ev.StrengthScore;
            if (zoneScore < 75.0) zoneScore = 75.0;
            if (zoneScore > 200.0) zoneScore = 200.0;
            AddZone(ev.Price, ev.Direction, ZoneType.Iceberg, zoneScore, ev.Timestamp);
        }

        /// <summary>
        /// Handles incoming ConfluenceEvents to create dynamic support/resistance zones.
        /// </summary>
        public void OnEvent(ref ConfluenceEvent ev)
        {
            AddZone(ev.Price, ev.Direction, ZoneType.Confluence, ev.ConfluenceScore, ev.Timestamp);
        }
    }

    /// <summary>
    /// Candidate bucket structure for tracking in-progress absorption levels.
    /// </summary>
    internal struct AbsorptionCandidate
    {
        public double BasePrice;
        public TradeDirection Direction;
        public double CumulativeVolume;
        public double CumulativeDelta;
        public double MinPrice;
        public double MaxPrice;
        public long StartTimeTicks;
        public long LastTimeTicks;
        public bool IsActive;
        public bool HasTriggered;
    }

    /// <summary>
    /// Concrete implementation of the Volume Absorption Detection Engine.
    /// Tracks aggressive order volume absorbed by passive limit orders with Delta confirmation.
    /// Zero heap allocations in the hot path.
    /// </summary>
    public class AbsorptionEngine : IAbsorptionEngine
    {
        private readonly EventBus _eventBus;
        private readonly SettingsManager _settings;
        private readonly double _tickSize;

        // Pre-allocated array of candidate buckets to enforce zero heap allocations in hot path
        private readonly AbsorptionCandidate[] _candidates = new AbsorptionCandidate[8];

        // Diagnostic counters
        private long _totalAbsorptionCount;
        private long _buyAbsorptionCount;
        private long _sellAbsorptionCount;
        private double _maxAbsorptionVolume;

        public AbsorptionEngine(EventBus eventBus, SettingsManager settings, double tickSize)
        {
            if (eventBus == null) throw new ArgumentNullException("eventBus");
            if (settings == null) throw new ArgumentNullException("settings");
            _eventBus = eventBus;
            _settings = settings;
            _tickSize = tickSize;
            Reset();
        }

        public long TotalAbsorptionCount { get { return _totalAbsorptionCount; } }
        public long BuyAbsorptionCount { get { return _buyAbsorptionCount; } }
        public long SellAbsorptionCount { get { return _sellAbsorptionCount; } }
        public double MaxAbsorptionVolume { get { return _maxAbsorptionVolume; } }

        public void Reset()
        {
            _totalAbsorptionCount = 0;
            _buyAbsorptionCount = 0;
            _sellAbsorptionCount = 0;
            _maxAbsorptionVolume = 0;
            for (int i = 0; i < _candidates.Length; i++)
            {
                _candidates[i] = default(AbsorptionCandidate);
            }
        }

        /// <summary>
        /// Analyzes incoming TradeEvents tick-by-tick for aggressive order absorption.
        /// </summary>
        public void OnEvent(ref TradeEvent ev)
        {
            if (ev.Direction == TradeDirection.Unknown || ev.Volume <= 0) return;

            long now = ev.TimestampTicks;
            long windowTicks = _settings.AbsorptionWindowMs * 10000; // 1ms = 10,000 ticks

            // 1. Evict expired candidate buckets
            for (int i = 0; i < _candidates.Length; i++)
            {
                if (_candidates[i].IsActive && (now - _candidates[i].StartTimeTicks > windowTicks))
                {
                    _candidates[i].IsActive = false;
                }
            }

            // 2. Search for matching candidate or select vacant index
            int matchIdx = -1;
            int vacantIdx = -1;

            for (int i = 0; i < _candidates.Length; i++)
            {
                if (_candidates[i].IsActive)
                {
                    if (_candidates[i].Direction == ev.Direction)
                    {
                        double minPrice = Math.Min(_candidates[i].MinPrice, ev.Price);
                        double maxPrice = Math.Max(_candidates[i].MaxPrice, ev.Price);
                        double ticksMoved = (maxPrice - minPrice) / _tickSize;

                        if (ticksMoved <= _settings.AbsorptionMaxTicksMove)
                        {
                            matchIdx = i;
                            break;
                        }
                    }
                }
                else if (vacantIdx == -1)
                {
                    vacantIdx = i;
                }
            }

            // 3. Accumulate volume and evaluate candidate
            if (matchIdx != -1)
            {
                _candidates[matchIdx].LastTimeTicks = now;
                _candidates[matchIdx].CumulativeVolume += ev.Volume;
                _candidates[matchIdx].MinPrice = Math.Min(_candidates[matchIdx].MinPrice, ev.Price);
                _candidates[matchIdx].MaxPrice = Math.Max(_candidates[matchIdx].MaxPrice, ev.Price);

                double tradeDelta = ev.Direction == TradeDirection.Buy ? ev.Volume : -ev.Volume;
                _candidates[matchIdx].CumulativeDelta += tradeDelta;

                EvaluateCandidate(ref _candidates[matchIdx], now);
            }
            else if (vacantIdx != -1)
            {
                _candidates[vacantIdx].BasePrice = ev.Price;
                _candidates[vacantIdx].Direction = ev.Direction;
                _candidates[vacantIdx].CumulativeVolume = ev.Volume;
                _candidates[vacantIdx].CumulativeDelta = ev.Direction == TradeDirection.Buy ? ev.Volume : -ev.Volume;
                _candidates[vacantIdx].MinPrice = ev.Price;
                _candidates[vacantIdx].MaxPrice = ev.Price;
                _candidates[vacantIdx].StartTimeTicks = now;
                _candidates[vacantIdx].LastTimeTicks = now;
                _candidates[vacantIdx].IsActive = true;
                _candidates[vacantIdx].HasTriggered = false;

                EvaluateCandidate(ref _candidates[vacantIdx], now);
            }
        }

        private void EvaluateCandidate(ref AbsorptionCandidate candidate, long timestamp)
        {
            if (candidate.HasTriggered) return;

            bool qualifies = false;
            double delta = candidate.CumulativeDelta;

            // Delta confirmation evaluation
            if (candidate.Direction == TradeDirection.Buy)
            {
                qualifies = (candidate.CumulativeVolume >= _settings.AbsorptionMinVolume) &&
                            (delta >= _settings.MinimumDeltaThreshold);
            }
            else if (candidate.Direction == TradeDirection.Sell)
            {
                qualifies = (candidate.CumulativeVolume >= _settings.AbsorptionMinVolume) &&
                            (delta <= -_settings.MinimumDeltaThreshold);
            }

            if (qualifies)
            {
                candidate.HasTriggered = true;

                // Retrieve scaling factors
                double minVol = _settings.AbsorptionMinVolume > 0 ? _settings.AbsorptionMinVolume : 1.0;
                double minDelta = _settings.MinimumDeltaThreshold > 0 ? _settings.MinimumDeltaThreshold : 1.0;
                double maxTicks = _settings.AbsorptionMaxTicksMove > 0 ? _settings.AbsorptionMaxTicksMove : 1.0;

                // Weighted Strength calculation
                double volumeScore = candidate.CumulativeVolume / minVol;
                double deltaScore = Math.Abs(delta) / minDelta;
                
                double ticksMoved = (candidate.MaxPrice - candidate.MinPrice) / _tickSize;
                double priceResistanceScore = 1.0 - (ticksMoved / maxTicks);
                if (priceResistanceScore < 0) priceResistanceScore = 0;

                double strengthScore = (0.4 * volumeScore) + (0.4 * deltaScore) + (0.2 * priceResistanceScore);

                // Update diagnostic properties
                _totalAbsorptionCount++;
                if (candidate.Direction == TradeDirection.Buy)
                {
                    _buyAbsorptionCount++;
                }
                else
                {
                    _sellAbsorptionCount++;
                }

                if (candidate.CumulativeVolume > _maxAbsorptionVolume)
                {
                    _maxAbsorptionVolume = candidate.CumulativeVolume;
                }

                // Publish AbsorptionEvent
                AbsorptionEvent abEvent = new AbsorptionEvent(
                    candidate.BasePrice,
                    candidate.Direction,
                    candidate.CumulativeVolume,
                    delta,
                    strengthScore,
                    timestamp
                );

                _eventBus.Publish(ref abEvent);
            }
        }
    }

    /// <summary>
    /// Candidate bucket structure for tracking in-progress iceberg levels.
    /// </summary>
    internal struct IcebergCandidate
    {
        public double BasePrice;
        public TradeDirection Direction;
        public double CumulativeVolume;
        public double CumulativeDelta;
        public int ExecutionCount;
        public double MinPrice;
        public double MaxPrice;
        public long StartTimeTicks;
        public long LastTimeTicks;
        public bool IsActive;
        public bool HasTriggered;
    }

    /// <summary>
    /// Concrete implementation of the Iceberg Order Detection Engine.
    /// Tracks passive limit order executions with Delta confirmation and density validation.
    /// Zero heap allocations in the hot path.
    /// </summary>
    public class IcebergEngine : IIcebergEngine
    {
        private readonly EventBus _eventBus;
        private readonly SettingsManager _settings;
        private readonly double _tickSize;

        // Pre-allocated array of candidate buckets to enforce zero heap allocations in hot path
        private readonly IcebergCandidate[] _candidates = new IcebergCandidate[8];

        // Diagnostic counters
        private long _totalIcebergCount;
        private long _buyIcebergCount;
        private long _sellIcebergCount;
        private double _maxIcebergVolume;

        public IcebergEngine(EventBus eventBus, SettingsManager settings, double tickSize)
        {
            if (eventBus == null) throw new ArgumentNullException("eventBus");
            if (settings == null) throw new ArgumentNullException("settings");
            _eventBus = eventBus;
            _settings = settings;
            _tickSize = tickSize;
            Reset();
        }

        public long TotalIcebergCount { get { return _totalIcebergCount; } }
        public long BuyIcebergCount { get { return _buyIcebergCount; } }
        public long SellIcebergCount { get { return _sellIcebergCount; } }
        public double MaxIcebergVolume { get { return _maxIcebergVolume; } }

        public void Reset()
        {
            _totalIcebergCount = 0;
            _buyIcebergCount = 0;
            _sellIcebergCount = 0;
            _maxIcebergVolume = 0;
            for (int i = 0; i < _candidates.Length; i++)
            {
                _candidates[i] = default(IcebergCandidate);
            }
        }

        /// <summary>
        /// Analyzes incoming TradeEvents tick-by-tick for iceberg order executions.
        /// </summary>
        public void OnEvent(ref TradeEvent ev)
        {
            if (ev.Direction == TradeDirection.Unknown || ev.Volume <= 0) return;

            // Map aggressive trade direction to passive iceberg direction:
            // Aggressive Sell -> Buy Iceberg (passive buyer at Bid)
            // Aggressive Buy -> Sell Iceberg (passive seller at Ask)
            TradeDirection passiveDirection = (ev.Direction == TradeDirection.Buy) ? TradeDirection.Sell : TradeDirection.Buy;

            long now = ev.TimestampTicks;
            long windowTicks = _settings.IcebergWindowMs * 10000; // 1ms = 10,000 ticks

            // 1. Evict expired candidate buckets
            for (int i = 0; i < _candidates.Length; i++)
            {
                if (_candidates[i].IsActive && (now - _candidates[i].StartTimeTicks > windowTicks))
                {
                    _candidates[i].IsActive = false;
                }
            }

            // 2. Search for matching candidate or select vacant index
            int matchIdx = -1;
            int vacantIdx = -1;

            for (int i = 0; i < _candidates.Length; i++)
            {
                if (_candidates[i].IsActive)
                {
                    if (_candidates[i].Direction == passiveDirection)
                    {
                        double minPrice = Math.Min(_candidates[i].MinPrice, ev.Price);
                        double maxPrice = Math.Max(_candidates[i].MaxPrice, ev.Price);
                        double ticksMoved = (maxPrice - minPrice) / _tickSize;

                        if (ticksMoved <= _settings.IcebergMaxPriceMovementTicks)
                        {
                            matchIdx = i;
                            break;
                        }
                    }
                }
                else if (vacantIdx == -1)
                {
                    vacantIdx = i;
                }
            }

            // 3. Accumulate volume and evaluate candidate
            if (matchIdx != -1)
            {
                _candidates[matchIdx].LastTimeTicks = now;
                _candidates[matchIdx].CumulativeVolume += ev.Volume;
                _candidates[matchIdx].ExecutionCount++;
                _candidates[matchIdx].MinPrice = Math.Min(_candidates[matchIdx].MinPrice, ev.Price);
                _candidates[matchIdx].MaxPrice = Math.Max(_candidates[matchIdx].MaxPrice, ev.Price);

                double tradeDelta = ev.Direction == TradeDirection.Buy ? ev.Volume : -ev.Volume;
                _candidates[matchIdx].CumulativeDelta += tradeDelta;

                EvaluateCandidate(ref _candidates[matchIdx], now);
            }
            else if (vacantIdx != -1)
            {
                _candidates[vacantIdx].BasePrice = ev.Price;
                _candidates[vacantIdx].Direction = passiveDirection;
                _candidates[vacantIdx].CumulativeVolume = ev.Volume;
                _candidates[vacantIdx].CumulativeDelta = ev.Direction == TradeDirection.Buy ? ev.Volume : -ev.Volume;
                _candidates[vacantIdx].ExecutionCount = 1;
                _candidates[vacantIdx].MinPrice = ev.Price;
                _candidates[vacantIdx].MaxPrice = ev.Price;
                _candidates[vacantIdx].StartTimeTicks = now;
                _candidates[vacantIdx].LastTimeTicks = now;
                _candidates[vacantIdx].IsActive = true;
                _candidates[vacantIdx].HasTriggered = false;

                EvaluateCandidate(ref _candidates[vacantIdx], now);
            }
        }

        private void EvaluateCandidate(ref IcebergCandidate candidate, long timestamp)
        {
            if (candidate.HasTriggered) return;

            // Definition density: ExecutionCount / DetectionWindowMilliseconds
            double density = 0.0;
            if (_settings.IcebergWindowMs > 0)
            {
                density = (double)candidate.ExecutionCount / _settings.IcebergWindowMs;
            }

            bool qualifies = false;
            double delta = candidate.CumulativeDelta;

            // Delta and Density confirmation evaluation
            if (candidate.Direction == TradeDirection.Buy)
            {
                qualifies = (candidate.CumulativeVolume >= _settings.IcebergMinVolume) &&
                            (candidate.ExecutionCount >= _settings.IcebergMinExecutions) &&
                            (density >= _settings.MinimumExecutionDensity) &&
                            (delta <= -_settings.IcebergMinimumDeltaThreshold);
            }
            else if (candidate.Direction == TradeDirection.Sell)
            {
                qualifies = (candidate.CumulativeVolume >= _settings.IcebergMinVolume) &&
                            (candidate.ExecutionCount >= _settings.IcebergMinExecutions) &&
                            (density >= _settings.MinimumExecutionDensity) &&
                            (delta >= _settings.IcebergMinimumDeltaThreshold);
            }

            if (qualifies)
            {
                candidate.HasTriggered = true;

                // Retrieve scaling factors
                double minVol = _settings.IcebergMinVolume > 0 ? _settings.IcebergMinVolume : 1.0;
                double minExecs = _settings.IcebergMinExecutions > 0 ? _settings.IcebergMinExecutions : 1.0;
                double minDensity = _settings.MinimumExecutionDensity > 0 ? _settings.MinimumExecutionDensity : 1.0;
                double minDelta = _settings.IcebergMinimumDeltaThreshold > 0 ? _settings.IcebergMinimumDeltaThreshold : 1.0;
                double maxTicks = _settings.IcebergMaxPriceMovementTicks > 0 ? _settings.IcebergMaxPriceMovementTicks : 1.0;

                // Weighted Strength calculation
                double volumeScore = candidate.CumulativeVolume / minVol;
                double execScore = (double)candidate.ExecutionCount / minExecs;
                double deltaScore = Math.Abs(delta) / minDelta;
                double densityScore = density / minDensity;

                double ticksMoved = (candidate.MaxPrice - candidate.MinPrice) / _tickSize;
                double priceResistanceScore = 1.0 - (ticksMoved / maxTicks);
                if (priceResistanceScore < 0) priceResistanceScore = 0;

                // Weighted combination
                double strengthScore = (0.25 * volumeScore) + (0.25 * execScore) + (0.25 * deltaScore) + (0.15 * densityScore) + (0.10 * priceResistanceScore);

                // Update diagnostic properties
                _totalIcebergCount++;
                if (candidate.Direction == TradeDirection.Buy)
                {
                    _buyIcebergCount++;
                }
                else
                {
                    _sellIcebergCount++;
                }

                if (candidate.CumulativeVolume > _maxIcebergVolume)
                {
                    _maxIcebergVolume = candidate.CumulativeVolume;
                }

                // Publish IcebergEvent
                IcebergEvent iceEvent = new IcebergEvent(
                    candidate.BasePrice,
                    candidate.Direction,
                    candidate.CumulativeVolume,
                    candidate.ExecutionCount,
                    strengthScore,
                    timestamp
                );

                _eventBus.Publish(ref iceEvent);
            }
        }
    }
}
