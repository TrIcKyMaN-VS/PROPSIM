using System;
using System.Threading;

namespace NinjaTrader.NinjaScript.Indicators.DTBigTradesProCore
{
    /// <summary>
    /// A single slot inside the RingBuffer holding the item and an optimistic version counter.
    /// </summary>
    public struct RingBufferSlot<T> where T : struct
    {
        public long Version;
        public T Value;
    }

    /// <summary>
    /// High-performance, lock-free, single-writer/multi-reader circular buffer.
    /// Capacity is rounded up to the nearest power of 2 for fast bitwise wrapping.
    /// </summary>
    public class LockFreeRingBuffer<T> where T : struct
    {
        private readonly RingBufferSlot<T>[] _slots;
        private readonly int _capacity;
        private readonly int _mask;
        private long _sequence; // Monotonically increasing write sequence counter

        public LockFreeRingBuffer(int capacity)
        {
            // Ensure capacity is a power of 2 for bitwise wrapping
            if (capacity < 2 || (capacity & (capacity - 1)) != 0)
            {
                int pow = 2;
                while (pow < capacity) pow <<= 1;
                capacity = pow;
            }

            _capacity = capacity;
            _mask = capacity - 1;
            _slots = new RingBufferSlot<T>[_capacity];
            _sequence = 0;
        }

        public int Capacity
        {
            get { return _capacity; }
        }

        /// <summary>
        /// Gets the current monotonically increasing write sequence number.
        /// </summary>
        public long Sequence
        {
            get { return Volatile.Read(ref _sequence); }
        }

        /// <summary>
        /// Inserts a new element. Single writer only.
        /// </summary>
        public void Enqueue(ref T item)
        {
            // Grab current sequence and increment
            long seq = Interlocked.Increment(ref _sequence) - 1;
            int index = (int)(seq & _mask);

            // Optimistic writing: version goes odd -> write -> version goes even
            long currentVersion = Volatile.Read(ref _slots[index].Version);
            
            Volatile.Write(ref _slots[index].Version, currentVersion + 1);
            Thread.MemoryBarrier(); // Ensure version write completes before data write

            _slots[index].Value = item;
            Thread.MemoryBarrier(); // Ensure data write completes before final version write

            Volatile.Write(ref _slots[index].Version, currentVersion + 2);
        }

        /// <summary>
        /// Attempts to read the item at a specific historical sequence number.
        /// Safe for concurrent readers.
        /// </summary>
        public bool TryRead(long sequenceNumber, out T value)
        {
            value = default(T);
            int index = (int)(sequenceNumber & _mask);

            long currentSeq = Volatile.Read(ref _sequence);
            
            // Check if requested sequence is in the valid un-overwritten window
            if (sequenceNumber >= currentSeq || sequenceNumber < currentSeq - _capacity)
            {
                return false;
            }

            long v1, v2;
            int spinCount = 0;
            
            while (true)
            {
                v1 = Volatile.Read(ref _slots[index].Version);
                Thread.MemoryBarrier();
                value = _slots[index].Value;
                Thread.MemoryBarrier();
                v2 = Volatile.Read(ref _slots[index].Version);

                // If version is odd (write in progress) or versions do not match (concurrent write occurred), retry
                if ((v1 & 1) != 0 || v1 != v2)
                {
                    spinCount++;
                    if (spinCount > 16)
                    {
                        // Avoid lockups in worst-case threads preemptions
                        return false; 
                    }
                    Thread.SpinWait(1);
                }
                else
                {
                    break;
                }
            }

            // Final check: make sure the writer didn't wrap around and overwrite the slot during our read
            currentSeq = Volatile.Read(ref _sequence);
            if (sequenceNumber < currentSeq - _capacity)
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Reads the last N written items into a pre-allocated array.
        /// Returns the number of items successfully read.
        /// </summary>
        public int ReadLast(T[] dest, int maxCount)
        {
            if (dest == null || dest.Length == 0 || maxCount <= 0) return 0;

            long currentSeq = Volatile.Read(ref _sequence);
            int count = (int)Math.Min(maxCount, Math.Min(_capacity, currentSeq));
            if (count > dest.Length) count = dest.Length;

            int written = 0;
            long startSeq = currentSeq - count;

            for (int i = 0; i < count; i++)
            {
                long seq = startSeq + i;
                T val;
                if (TryRead(seq, out val))
                {
                    dest[written++] = val;
                }
            }

            return written;
        }
    }
}
