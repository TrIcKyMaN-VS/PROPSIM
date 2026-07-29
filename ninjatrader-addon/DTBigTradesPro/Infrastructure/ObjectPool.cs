using System;
using System.Threading;

namespace NinjaTrader.NinjaScript.Indicators.DTBigTradesProCore
{
    /// <summary>
    /// Interface implemented by pooled objects to reset their state upon release.
    /// </summary>
    public interface IResettable
    {
        void Reset();
    }

    /// <summary>
    /// A lock-free, pre-allocated object pool for recycling reference types.
    /// Uses Interlocked CAS operations for thread safety with zero lock contention.
    /// </summary>
    public class ObjectPool<T> where T : class
    {
        private readonly Func<T> _factory;
        private readonly T[] _pool;
        private int _count;

        public ObjectPool(Func<T> factory, int capacity)
        {
            if (factory == null) throw new ArgumentNullException("factory");
            _factory = factory;
            _pool = new T[capacity];
            
            // Pre-populate the pool to avoid runtime allocations
            for (int i = 0; i < capacity; i++)
            {
                _pool[i] = _factory();
            }
            _count = capacity;
        }

        /// <summary>
        /// Rents a clean instance from the pool.
        /// If the pool is empty, constructs a new instance using the factory.
        /// </summary>
        public T Rent()
        {
            while (true)
            {
                int count = Volatile.Read(ref _count);
                if (count <= 0)
                {
                    // Pool exhausted, fallback to on-demand allocation
                    return _factory();
                }

                int nextCount = count - 1;
                if (Interlocked.CompareExchange(ref _count, nextCount, count) == count)
                {
                    T item = _pool[nextCount];
                    _pool[nextCount] = null; // Clear slot reference
                    return item;
                }
            }
        }

        /// <summary>
        /// Returns an instance back to the pool.
        /// If the instance implements IResettable, resets its state.
        /// </summary>
        public void Return(T item)
        {
            if (item == null) return;

            // Reset state if resettable
            IResettable resettable = item as IResettable;
            if (resettable != null)
            {
                resettable.Reset();
            }

            while (true)
            {
                int count = Volatile.Read(ref _count);
                if (count >= _pool.Length)
                {
                    // Pool is full, allow garbage collection to reclaim this extra resource
                    return;
                }

                int nextCount = count + 1;
                if (Interlocked.CompareExchange(ref _count, nextCount, count) == count)
                {
                    _pool[count] = item;
                    break;
                }
            }
        }
    }
}
