using System;

namespace NinjaTrader.NinjaScript.Indicators.DTBigTradesProCore
{
    /// <summary>
    /// Contract for the Trade Ingestion and Aggressor Detection Engine.
    /// </summary>
    public interface ITradeEngine : IEventListener<TradeEvent>
    {
        LockFreeRingBuffer<TradeEvent> TradeBuffer { get; }
        
        // Diagnostic counters
        long BuyTradeCount { get; }
        long SellTradeCount { get; }
        long UnknownTradeCount { get; }
        double UnknownTradePercentage { get; }

        // Largest trade statistics
        double LargestTradeVolume { get; }
        double LargestBuyVolume { get; }
        double LargestSellVolume { get; }

        /// <summary>
        /// Ingests a raw market tick, determines the aggressor, and broadcasts the TradeEvent.
        /// </summary>
        void ProcessTick(long timestampTicks, double price, double volume, double bid, double ask);
    }

    /// <summary>
    /// Contract for the volume accumulation tracking engine.
    /// </summary>
    public interface IVolumeEngine : IEventListener<TradeEvent>
    {
        double TotalBuyVolume { get; }
        double TotalSellVolume { get; }
        void ResetVolume();
    }

    /// <summary>
    /// Contract for calculating trade delta and CVD indicators.
    /// </summary>
    public interface IDeltaEngine : IEventListener<TradeEvent>
    {
        double CurrentDelta { get; }
        double BarDelta { get; }
        double SessionDelta { get; }
        double CumulativeDelta { get; }

        // Diagnostic properties
        double LargestPositiveDelta { get; }
        double LargestNegativeDelta { get; }
        double TotalBuyVolume { get; }
        double TotalSellVolume { get; }

        DeltaSnapshot GetSnapshot();
        void ResetBarDelta();
        void ResetSessionDelta();
    }

    /// <summary>
    /// Contract for the dynamic and adaptive size thresholds engine.
    /// </summary>
    public interface IThresholdEngine : IEventListener<TradeEvent>
    {
        double RetailThreshold { get; }
        double ProfessionalThreshold { get; }
        double InstitutionalThreshold { get; }
        double BlockThreshold { get; }
        double ExtremeThreshold { get; }
        double RollingAverage { get; }

        // Statistics counters
        long ProfessionalCount { get; }
        long InstitutionalCount { get; }
        long BlockCount { get; }
        long ExtremeCount { get; }

        TradeClassification Classify(double volume);
    }

    /// <summary>
    /// Contract for the Liquidity Zone Engine.
    /// </summary>
    public interface IZoneEngine : IEventListener<BigTradeEvent>
    {
        int ActiveZoneCount { get; }
        int BrokenZoneCount { get; }
        int RetiredZoneCount { get; }

        ZoneEvent HighestScoreZone { get; }
        ZoneEvent MostRetestedZone { get; }

        /// <summary>
        /// Copies current active zones into the pre-allocated dest array. Returns count copied.
        /// </summary>
        int GetActiveZones(ZoneEvent[] dest);

        /// <summary>
        /// Copies current broken zones into the pre-allocated dest array. Returns count copied.
        /// </summary>
        int GetBrokenZones(ZoneEvent[] dest);

        /// <summary>
        /// Copies current retired zones into the pre-allocated dest array. Returns count copied.
        /// </summary>
        int GetRetiredZones(ZoneEvent[] dest);

        void AddZone(double price, TradeDirection direction, ZoneType type, double score, long creationTime);
        void RemoveZone(double price);
        void BreakZone(double price, long breakTime);
        void RetestZone(double price);
    }

    /// <summary>
    /// Contract for the Volume Absorption Detection Engine.
    /// </summary>
    public interface IAbsorptionEngine : IEventListener<TradeEvent>
    {
        long TotalAbsorptionCount { get; }
        long BuyAbsorptionCount { get; }
        long SellAbsorptionCount { get; }
        double MaxAbsorptionVolume { get; }
        void Reset();
    }

    /// <summary>
    /// Contract for the Iceberg Order Detection Engine.
    /// </summary>
    public interface IIcebergEngine : IEventListener<TradeEvent>
    {
        long TotalIcebergCount { get; }
        long BuyIcebergCount { get; }
        long SellIcebergCount { get; }
        double MaxIcebergVolume { get; }
        void Reset();
    }
}
