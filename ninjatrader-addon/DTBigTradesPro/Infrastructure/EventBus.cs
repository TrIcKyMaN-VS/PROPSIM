using System;
using System.Collections.Generic;

namespace NinjaTrader.NinjaScript.Indicators.DTBigTradesProCore
{
    /// <summary>
    /// Event listener interface. Must be implemented by engines/renderers to listen to events.
    /// Struct T is passed by ref to ensure zero copy overhead.
    /// </summary>
    public interface IEventListener<T> where T : struct
    {
        void OnEvent(ref T ev);
    }

    /// <summary>
    /// A zero-allocation EventBus designed for high-frequency tick data.
    /// Listeners are registered during initialization and "frozen" into flat arrays.
    /// Dispatches in the hot path are done via array indexing, avoiding List enumerators and GC allocations.
    /// </summary>
    public class EventBus
    {
        // Lists of listeners gathered during config state
        private readonly List<IEventListener<TradeEvent>> _tradeListeners = new List<IEventListener<TradeEvent>>();
        private readonly List<IEventListener<BigTradeEvent>> _bigTradeListeners = new List<IEventListener<BigTradeEvent>>();
        private readonly List<IEventListener<ZoneEvent>> _zoneListeners = new List<IEventListener<ZoneEvent>>();
        private readonly List<IEventListener<AbsorptionEvent>> _absorptionListeners = new List<IEventListener<AbsorptionEvent>>();
        private readonly List<IEventListener<IcebergEvent>> _icebergListeners = new List<IEventListener<IcebergEvent>>();
        private readonly List<IEventListener<StackEvent>> _stackListeners = new List<IEventListener<StackEvent>>();
        private readonly List<IEventListener<DeltaSnapshot>> _deltaListeners = new List<IEventListener<DeltaSnapshot>>();
        private readonly List<IEventListener<ConfluenceEvent>> _confluenceListeners = new List<IEventListener<ConfluenceEvent>>();

        // Flattened arrays for hot-path dispatching (read-only once frozen)
        private IEventListener<TradeEvent>[] _tradeArray = new IEventListener<TradeEvent>[0];
        private IEventListener<BigTradeEvent>[] _bigTradeArray = new IEventListener<BigTradeEvent>[0];
        private IEventListener<ZoneEvent>[] _zoneArray = new IEventListener<ZoneEvent>[0];
        private IEventListener<AbsorptionEvent>[] _absorptionArray = new IEventListener<AbsorptionEvent>[0];
        private IEventListener<IcebergEvent>[] _icebergArray = new IEventListener<IcebergEvent>[0];
        private IEventListener<StackEvent>[] _stackArray = new IEventListener<StackEvent>[0];
        private IEventListener<DeltaSnapshot>[] _deltaArray = new IEventListener<DeltaSnapshot>[0];
        private IEventListener<ConfluenceEvent>[] _confluenceArray = new IEventListener<ConfluenceEvent>[0];

        private bool _isFrozen = false;

        /// <summary>
        /// Registers a listener. Must be called before freezing.
        /// </summary>
        public void Register<T>(IEventListener<T> listener) where T : struct
        {
            if (_isFrozen)
            {
                throw new InvalidOperationException("Cannot register listeners after EventBus has been frozen.");
            }

            if (listener == null) return;

            // Type check and assign listener to the appropriate channel
            if (listener is IEventListener<TradeEvent>)
            {
                IEventListener<TradeEvent> tradeListener = (IEventListener<TradeEvent>)listener;
                if (!_tradeListeners.Contains(tradeListener)) _tradeListeners.Add(tradeListener);
            }
            if (listener is IEventListener<BigTradeEvent>)
            {
                IEventListener<BigTradeEvent> bigTradeListener = (IEventListener<BigTradeEvent>)listener;
                if (!_bigTradeListeners.Contains(bigTradeListener)) _bigTradeListeners.Add(bigTradeListener);
            }
            if (listener is IEventListener<ZoneEvent>)
            {
                IEventListener<ZoneEvent> zoneListener = (IEventListener<ZoneEvent>)listener;
                if (!_zoneListeners.Contains(zoneListener)) _zoneListeners.Add(zoneListener);
            }
            if (listener is IEventListener<AbsorptionEvent>)
            {
                IEventListener<AbsorptionEvent> absorptionListener = (IEventListener<AbsorptionEvent>)listener;
                if (!_absorptionListeners.Contains(absorptionListener)) _absorptionListeners.Add(absorptionListener);
            }
            if (listener is IEventListener<IcebergEvent>)
            {
                IEventListener<IcebergEvent> icebergListener = (IEventListener<IcebergEvent>)listener;
                if (!_icebergListeners.Contains(icebergListener)) _icebergListeners.Add(icebergListener);
            }
            if (listener is IEventListener<StackEvent>)
            {
                IEventListener<StackEvent> stackListener = (IEventListener<StackEvent>)listener;
                if (!_stackListeners.Contains(stackListener)) _stackListeners.Add(stackListener);
            }
            if (listener is IEventListener<DeltaSnapshot>)
            {
                IEventListener<DeltaSnapshot> deltaListener = (IEventListener<DeltaSnapshot>)listener;
                if (!_deltaListeners.Contains(deltaListener)) _deltaListeners.Add(deltaListener);
            }
            if (listener is IEventListener<ConfluenceEvent>)
            {
                IEventListener<ConfluenceEvent> confluenceListener = (IEventListener<ConfluenceEvent>)listener;
                if (!_confluenceListeners.Contains(confluenceListener)) _confluenceListeners.Add(confluenceListener);
            }
        }

        /// <summary>
        /// Freezes the EventBus registration, converting internal lists into flat arrays.
        /// Must be called during indicator startup configure phase.
        /// </summary>
        public void Freeze()
        {
            _tradeArray = _tradeListeners.ToArray();
            _bigTradeArray = _bigTradeListeners.ToArray();
            _zoneArray = _zoneListeners.ToArray();
            _absorptionArray = _absorptionListeners.ToArray();
            _icebergArray = _icebergListeners.ToArray();
            _stackArray = _stackListeners.ToArray();
            _deltaArray = _deltaListeners.ToArray();
            _confluenceArray = _confluenceListeners.ToArray();
            
            _isFrozen = true;
        }

        public void Publish(ref TradeEvent ev)
        {
            IEventListener<TradeEvent>[] arr = _tradeArray;
            for (int i = 0; i < arr.Length; i++)
            {
                arr[i].OnEvent(ref ev);
            }
        }

        public void Publish(ref BigTradeEvent ev)
        {
            IEventListener<BigTradeEvent>[] arr = _bigTradeArray;
            for (int i = 0; i < arr.Length; i++)
            {
                arr[i].OnEvent(ref ev);
            }
        }

        public void Publish(ref ZoneEvent ev)
        {
            IEventListener<ZoneEvent>[] arr = _zoneArray;
            for (int i = 0; i < arr.Length; i++)
            {
                arr[i].OnEvent(ref ev);
            }
        }

        public void Publish(ref AbsorptionEvent ev)
        {
            IEventListener<AbsorptionEvent>[] arr = _absorptionArray;
            for (int i = 0; i < arr.Length; i++)
            {
                arr[i].OnEvent(ref ev);
            }
        }

        public void Publish(ref IcebergEvent ev)
        {
            IEventListener<IcebergEvent>[] arr = _icebergArray;
            for (int i = 0; i < arr.Length; i++)
            {
                arr[i].OnEvent(ref ev);
            }
        }

        public void Publish(ref StackEvent ev)
        {
            IEventListener<StackEvent>[] arr = _stackArray;
            for (int i = 0; i < arr.Length; i++)
            {
                arr[i].OnEvent(ref ev);
            }
        }

        public void Publish(ref DeltaSnapshot ev)
        {
            IEventListener<DeltaSnapshot>[] arr = _deltaArray;
            for (int i = 0; i < arr.Length; i++)
            {
                arr[i].OnEvent(ref ev);
            }
        }

        public void Publish(ref ConfluenceEvent ev)
        {
            IEventListener<ConfluenceEvent>[] arr = _confluenceArray;
            for (int i = 0; i < arr.Length; i++)
            {
                arr[i].OnEvent(ref ev);
            }
        }
    }
}
