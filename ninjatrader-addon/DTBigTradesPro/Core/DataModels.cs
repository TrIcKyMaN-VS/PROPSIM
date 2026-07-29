using System;

namespace NinjaTrader.NinjaScript.Indicators.DTBigTradesProCore
{
    /// <summary>
    /// Represents the aggressiveness level of a trade based on its volume.
    /// </summary>
    public enum TradeClassification
    {
        Retail,
        Professional,
        Institutional,
        Block,
        Extreme
    }

    /// <summary>
    /// Represents trade direction (Buy = Aggressive buyer hitting ask, Sell = Aggressive seller hitting bid).
    /// </summary>
    public enum TradeDirection
    {
        Unknown = 0,
        Buy = 1,
        Sell = -1
    }

    /// <summary>
    /// Supported liquidity zone classification types.
    /// </summary>
    public enum ZoneType
    {
        InstitutionalTrade,
        BlockTrade,
        ExtremeTrade,
        Absorption,
        Iceberg,
        Stack,
        Confluence
    }

    /// <summary>
    /// Represents a raw trade captured from the market data stream.
    /// </summary>
    public struct TradeEvent
    {
        public long TimestampTicks;
        public double Price;
        public double Volume;
        public double Bid;
        public double Ask;
        public TradeDirection Direction;

        public TradeEvent(long timestampTicks, double price, double volume, double bid, double ask, TradeDirection direction)
        {
            TimestampTicks = timestampTicks;
            Price = price;
            Volume = volume;
            Bid = bid;
            Ask = ask;
            Direction = direction;
        }
    }

    /// <summary>
    /// Represents a trade classified as a "Big Trade".
    /// </summary>
    public struct BigTradeEvent
    {
        public long TimestampTicks;
        public double Price;
        public double Volume;
        public TradeDirection Direction;
        public TradeClassification Classification;
        public bool IsAggregated;
        public int AggregatedCount;

        public BigTradeEvent(long timestampTicks, double price, double volume, TradeDirection direction, TradeClassification classification, bool isAggregated, int aggregatedCount)
        {
            TimestampTicks = timestampTicks;
            Price = price;
            Volume = volume;
            Direction = direction;
            Classification = classification;
            IsAggregated = isAggregated;
            AggregatedCount = aggregatedCount;
        }
    }

    /// <summary>
    /// Represents a historical or active liquidity zone.
    /// </summary>
    public struct ZoneEvent
    {
        public double Price;
        public TradeDirection Direction;
        public long CreationTime;
        public double Strength;
        public int RetestCount;
        public ZoneType ZoneType;
        public double ZoneScore;
        public bool IsBroken;
        public bool IsActive;

        public ZoneEvent(double price, TradeDirection direction, long creationTime, double strength, ZoneType zoneType, double zoneScore)
        {
            Price = price;
            Direction = direction;
            CreationTime = creationTime;
            Strength = strength;
            RetestCount = 0;
            ZoneType = zoneType;
            ZoneScore = zoneScore;
            IsBroken = false;
            IsActive = true;
        }
    }

    /// <summary>
    /// Represents an aggressive volume absorption event.
    /// </summary>
    public struct AbsorptionEvent
    {
        public double Price;
        public TradeDirection Direction;
        public double Volume;
        public double Delta;
        public double StrengthScore;
        public long Timestamp;

        public AbsorptionEvent(double price, TradeDirection direction, double volume, double delta, double strengthScore, long timestamp)
        {
            Price = price;
            Direction = direction;
            Volume = volume;
            Delta = delta;
            StrengthScore = strengthScore;
            Timestamp = timestamp;
        }
    }

    /// <summary>
    /// Represents an iceberg order detection event.
    /// </summary>
    public struct IcebergEvent
    {
        public double Price;
        public TradeDirection Direction;
        public double CumulativeVolume;
        public int ExecutionCount;
        public double StrengthScore;
        public long Timestamp;

        public IcebergEvent(double price, TradeDirection direction, double cumulativeVolume, int executionCount, double strengthScore, long timestamp)
        {
            Price = price;
            Direction = direction;
            CumulativeVolume = cumulativeVolume;
            ExecutionCount = executionCount;
            StrengthScore = strengthScore;
            Timestamp = timestamp;
        }
    }

    /// <summary>
    /// Represents a weighted confluence event of multiple order flow signals.
    /// </summary>
    public struct ConfluenceEvent
    {
        public double Price;
        public double ConfluenceScore;
        public int EventCount;
        public long Timestamp;
        public TradeDirection Direction;
        public double Strength;

        public ConfluenceEvent(double price, double confluenceScore, int eventCount, long timestamp, TradeDirection direction, double strength)
        {
            Price = price;
            ConfluenceScore = confluenceScore;
            EventCount = eventCount;
            Timestamp = timestamp;
            Direction = direction;
            Strength = strength;
        }
    }

    /// <summary>
    /// Type of localized visual shape markers.
    /// </summary>
    public enum MarkerType
    {
        Absorption,
        Iceberg,
        Confluence
    }

    /// <summary>
    /// Localized marker model for drawing squares, diamonds, and gold stars.
    /// </summary>
    public struct RenderMarker
    {
        public double Price;
        public TradeDirection Direction;
        public double Strength;
        public long Timestamp;
        public MarkerType Type;
        public bool IsInvalid;
        public bool IsOverridden;

        public RenderMarker(double price, TradeDirection direction, double strength, long timestamp, MarkerType type)
        {
            Price = price;
            Direction = direction;
            Strength = strength;
            Timestamp = timestamp;
            Type = type;
            IsInvalid = false;
            IsOverridden = false;
        }
    }

    /// <summary>
    /// Represents a stack of aggressive trades occurring in close proximity.
    /// </summary>
    public struct StackEvent
    {
        public double PriceRegion;
        public TradeDirection Direction;
        public double Score;
        public int Count;
        public long TimestampTicks;

        public StackEvent(double priceRegion, TradeDirection direction, double score, int count, long timestampTicks)
        {
            PriceRegion = priceRegion;
            Direction = direction;
            Score = score;
            Count = count;
            TimestampTicks = timestampTicks;
        }
    }

    /// <summary>
    /// A snapshot of cumulative and current delta indicators.
    /// </summary>
    public struct DeltaSnapshot
    {
        public double CurrentDelta;
        public double BarDelta;
        public double SessionDelta;
        public double CumulativeDelta;
        public double BuyVolume;
        public double SellVolume;
        public long Timestamp;

        public DeltaSnapshot(double currentDelta, double barDelta, double sessionDelta, double cumulativeDelta, double buyVolume, double sellVolume, long timestamp)
        {
            CurrentDelta = currentDelta;
            BarDelta = barDelta;
            SessionDelta = sessionDelta;
            CumulativeDelta = cumulativeDelta;
            BuyVolume = buyVolume;
            SellVolume = sellVolume;
            Timestamp = timestamp;
        }
    }

    /// <summary>
    /// Lightweight render model representing a trade bubble.
    /// </summary>
    public struct RenderTradeBubble
    {
        public double Price;
        public TradeDirection Direction;
        public double Size;
        public TradeClassification Classification;
        public long Timestamp;
        public double Volume;
        public int BarIndex;

        public RenderTradeBubble(double price, TradeDirection direction, double size, TradeClassification classification, long timestamp, double volume, int barIndex)
        {
            Price = price;
            Direction = direction;
            Size = size;
            Classification = classification;
            Timestamp = timestamp;
            Volume = volume;
            BarIndex = barIndex;
        }
    }

    /// <summary>
    /// Lightweight render model representing a liquidity zone.
    /// </summary>
    public struct RenderZone
    {
        public double Price;
        public TradeDirection Direction;
        public double Strength;
        public double Score;
        public int RetestCount;
        public ZoneType ZoneType;
        public bool IsBroken;
        public long CreationTime;

        public RenderZone(double price, TradeDirection direction, double strength, double score, int retestCount, ZoneType zoneType, bool isBroken, long creationTime)
        {
            Price = price;
            Direction = direction;
            Strength = strength;
            Score = score;
            RetestCount = retestCount;
            ZoneType = zoneType;
            IsBroken = isBroken;
            CreationTime = creationTime;
        }
    }

    /// <summary>
    /// Lightweight render model representing a chart label.
    /// </summary>
    public struct RenderLabel
    {
        public string Text;
        public float X;
        public float Y;
        public System.Windows.Media.Color Color;

        public RenderLabel(string text, float x, float y, System.Windows.Media.Color color)
        {
            Text = text;
            X = x;
            Y = y;
            Color = color;
        }
    }

    /// <summary>
    /// Lightweight render model representing a dashboard KPI item.
    /// </summary>
    public struct RenderDashboardItem
    {
        public string Label;
        public string Value;
        public System.Windows.Media.Color Color;

        public RenderDashboardItem(string label, string value, System.Windows.Media.Color color)
        {
            Label = label;
            Value = value;
            Color = color;
        }
    }
}
