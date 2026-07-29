using System;
using System.Diagnostics;

namespace NinjaTrader.NinjaScript.Indicators.DTBigTradesProCore
{
    /// <summary>
    /// Measures average, minimum, and worst-case processing latency in microseconds.
    /// Allocation-free calculation of metrics.
    /// </summary>
    public class LatencyTracker
    {
        private long _totalTicksProcessed;
        private double _totalProcessingTimeTicks;
        private double _maxProcessingTimeTicks;
        private double _minProcessingTimeTicks = double.MaxValue;

        public void Record(long elapsedTicks)
        {
            _totalTicksProcessed++;
            _totalProcessingTimeTicks += elapsedTicks;
            
            if (elapsedTicks > _maxProcessingTimeTicks)
                _maxProcessingTimeTicks = elapsedTicks;
                
            if (elapsedTicks < _minProcessingTimeTicks)
                _minProcessingTimeTicks = elapsedTicks;
        }

        public double AverageMicroseconds
        {
            get
            {
                if (_totalTicksProcessed == 0) return 0;
                double avgTicks = _totalProcessingTimeTicks / _totalTicksProcessed;
                return (avgTicks * 1000000.0) / Stopwatch.Frequency;
            }
        }

        public double MaxMicroseconds
        {
            get { return _totalTicksProcessed == 0 ? 0 : (_maxProcessingTimeTicks * 1000000.0) / Stopwatch.Frequency; }
        }

        public double MinMicroseconds
        {
            get { return _totalTicksProcessed == 0 ? 0 : (_minProcessingTimeTicks * 1000000.0) / Stopwatch.Frequency; }
        }

        public long TotalTicksProcessed
        {
            get { return _totalTicksProcessed; }
        }

        public void Reset()
        {
            _totalTicksProcessed = 0;
            _totalProcessingTimeTicks = 0;
            _maxProcessingTimeTicks = 0;
            _minProcessingTimeTicks = double.MaxValue;
        }
    }

    /// <summary>
    /// Tracks memory usage and garbage collection count changes.
    /// Uses universally compilable GC methods compatible with both .NET Framework 4.8 and .NET 8.
    /// </summary>
    public class MemoryTracker
    {
        private long _initialHeapMemory;
        private int _initialGen0Collections;
        private int _initialGen1Collections;
        private int _initialGen2Collections;

        public void Initialize()
        {
            _initialHeapMemory = GC.GetTotalMemory(false);
            _initialGen0Collections = GC.CollectionCount(0);
            _initialGen1Collections = GC.CollectionCount(1);
            _initialGen2Collections = GC.CollectionCount(2);
        }

        public long GetHeapMemoryDelta()
        {
            return GC.GetTotalMemory(false) - _initialHeapMemory;
        }

        public int GetGen0CollectionsSinceInit()
        {
            return GC.CollectionCount(0) - _initialGen0Collections;
        }

        public int GetGen1CollectionsSinceInit()
        {
            return GC.CollectionCount(1) - _initialGen1Collections;
        }

        public int GetGen2CollectionsSinceInit()
        {
            return GC.CollectionCount(2) - _initialGen2Collections;
        }
    }

    /// <summary>
    /// Performance tracker class combining Latency and Memory measurements.
    /// Uses high-precision Stopwatch.
    /// </summary>
    public class PerformanceTracker
    {
        private readonly LatencyTracker _latencyTracker = new LatencyTracker();
        private readonly MemoryTracker _memoryTracker = new MemoryTracker();
        private readonly Stopwatch _stopwatch = new Stopwatch();

        public LatencyTracker Latency
        {
            get { return _latencyTracker; }
        }

        public MemoryTracker Memory
        {
            get { return _memoryTracker; }
        }

        public void StartTickMeasure()
        {
            _stopwatch.Restart();
        }

        public void EndTickMeasure()
        {
            _stopwatch.Stop();
            _latencyTracker.Record(_stopwatch.ElapsedTicks);
        }

        public void InitializeMemoryTracking()
        {
            _memoryTracker.Initialize();
        }
    }
}
