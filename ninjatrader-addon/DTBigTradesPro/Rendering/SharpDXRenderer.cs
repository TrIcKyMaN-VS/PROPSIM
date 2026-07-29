using System;
using SharpDX;
using SharpDX.Direct2D1;
using SharpDX.DirectWrite;
using NinjaTrader.Gui;
using NinjaTrader.Gui.Chart;
using NinjaTrader.NinjaScript;

namespace NinjaTrader.NinjaScript.Indicators.DTBigTradesProCore
{
    /// <summary>
    /// Handles visual drawing of aggregated big trade bubbles with centered numerical volume labels.
    /// Implements proportional sizing and a 30-minute fading lifecycle with zero allocations inside the OnRender thread.
    /// Compatible with C# 5.
    /// </summary>
    public class SharpDXRenderer : IDisposable
    {
        private readonly RendererCache _cache;
        private readonly SettingsManager _settings;

        // Device-independent resources
        private TextFormat _textFormat;
        private TextFormat _dashTextFormat;
        private TextLayout[] _retestLayouts;

        // Device-dependent resources
        private SolidColorBrush _greenBrush;
        private SolidColorBrush _purpleBrush;
        private SolidColorBrush _yellowBrush;
        private SolidColorBrush _redBrush;
        private SolidColorBrush _grayBrush;
        private SolidColorBrush _textBrush;
        private SolidColorBrush _dashBgBrush;
        private SolidColorBrush _dashBorderBrush;
        private SolidColorBrush _bubbleBorderBrush;

        // Cache layouts
        private TextLayout _watermarkTextLayout;
        private string _lastWatermarkText;

        private TextLayout _dashboardTextLayout;
        private string _lastDashboardText;

        // Pre-allocated drawing cache arrays to ensure zero heap allocations
        private readonly RenderTradeBubble[] _tempBubbles = new RenderTradeBubble[1024];
        private readonly TextLayout[] _tempBubbleLayouts = new TextLayout[1024];
        private readonly RenderZone[] _tempZones = new RenderZone[512];

        // Frame and timer metrics
        private int _frameCount;
        private long _lastFpsUpdateTicks;
        private int _fps;

        public SharpDXRenderer(RendererCache cache, SettingsManager settings)
        {
            if (cache == null) throw new ArgumentNullException("cache");
            if (settings == null) throw new ArgumentNullException("settings");
            _cache = cache;
            _settings = settings;

            // DirectWrite Factory creation
            var dwFactory = NinjaTrader.Core.Globals.DirectWriteFactory;

            // Watermark and labels format
            _textFormat = new TextFormat(
                dwFactory,
                "Segoe UI",
                FontWeight.SemiBold,
                FontStyle.Normal,
                FontStretch.Normal,
                12.0f
            );

            // Dashboard compact text format
            _dashTextFormat = new TextFormat(
                dwFactory,
                "Consolas",
                FontWeight.Normal,
                FontStyle.Normal,
                FontStretch.Normal,
                11.0f
            );

            // Pre-allocate retest count labels ("x1" to "x5+")
            _retestLayouts = new TextLayout[5];
            for (int i = 0; i < 5; i++)
            {
                string label = i == 4 ? "x5+" : string.Format("x{0}", i + 1);
                _retestLayouts[i] = new TextLayout(
                    dwFactory,
                    label,
                    _textFormat,
                    40.0f,
                    15.0f
                );
            }
        }

        public void OnRenderTargetChanged(RenderTarget renderTarget)
        {
            DisposeDeviceDependent();

            if (renderTarget != null && !renderTarget.IsDisposed)
            {
                _greenBrush = new SolidColorBrush(renderTarget, new Color4(0.06f, 0.73f, 0.51f, 1.0f));
                _purpleBrush = new SolidColorBrush(renderTarget, new Color4(0.58f, 0.0f, 0.82f, 1.0f));
                _yellowBrush = new SolidColorBrush(renderTarget, new Color4(0.96f, 0.62f, 0.04f, 1.0f));
                _redBrush = new SolidColorBrush(renderTarget, new Color4(0.94f, 0.27f, 0.27f, 1.0f));
                _grayBrush = new SolidColorBrush(renderTarget, new Color4(0.5f, 0.5f, 0.5f, 1.0f));
                _textBrush = new SolidColorBrush(renderTarget, new Color4(1.0f, 1.0f, 1.0f, 1.0f)); // Solid white for text
                _dashBgBrush = new SolidColorBrush(renderTarget, new Color4(0.05f, 0.05f, 0.05f, 0.75f));
                _dashBorderBrush = new SolidColorBrush(renderTarget, new Color4(1.0f, 1.0f, 1.0f, 0.15f));
                _bubbleBorderBrush = new SolidColorBrush(renderTarget, new Color4(1.0f, 1.0f, 1.0f, 0.4f)); // Semi-transparent white border
            }
        }

        private float GetBubbleOpacity(ref RenderTradeBubble bubble, long currentTicks)
        {
            double ageMinutes = (currentTicks - bubble.Timestamp) / (10000000.0 * 60.0);
            if (ageMinutes < 0) ageMinutes = 0;

            if (ageMinutes <= 10.0)
            {
                return 1.0f;
            }
            else if (ageMinutes <= 20.0)
            {
                return 0.7f;
            }
            else if (ageMinutes <= 30.0)
            {
                return 0.4f;
            }
            else
            {
                return 0.0f;
            }
        }

        public void Draw(RenderTarget renderTarget, ChartControl chartControl, ChartScale chartScale, int panelIndex)
        {
            if (renderTarget == null || renderTarget.IsDisposed) return;
            if (_greenBrush == null) return; // Guard against uninitialized device resources

            PerformanceMode perfMode = _settings.PerfMode;
            bool showBubbles = _settings.ShowTradeBubbles;
            bool showZones = _settings.ShowZones && (perfMode != PerformanceMode.UltraFast);
            bool showDashboard = _settings.ShowDashboard && (perfMode != PerformanceMode.UltraFast);
            bool showRetests = perfMode == PerformanceMode.Full;

            long currentTicks = DateTime.UtcNow.Ticks;
            bool isDiag = _settings.DiagnosticsModeSetting == DiagnosticsMode.ON;

            // 1. Watermark text creation (Once per second under DiagnosticsMode)
            if (_watermarkTextLayout == null || (isDiag && currentTicks - _lastFpsUpdateTicks >= 10000000))
            {
                if (_lastFpsUpdateTicks == 0)
                {
                    _lastFpsUpdateTicks = currentTicks;
                }

                double elapsedSeconds = (currentTicks - _lastFpsUpdateTicks) / 10000000.0;
                if (elapsedSeconds > 0)
                {
                    _fps = (int)Math.Round(_frameCount / elapsedSeconds);
                }
                _frameCount = 0;
                _lastFpsUpdateTicks = currentTicks;

                string text;
                if (isDiag)
                {
                    double avgLat;
                    double maxLat;
                    long memDelta;
                    _cache.GetDiagnostics(out avgLat, out maxLat, out memDelta);

                    string memStr;
                    if (Math.Abs(memDelta) >= 1048576)
                        memStr = string.Format("{0:F2} MB", memDelta / 1048576.0);
                    else
                        memStr = string.Format("{0:F0} KB", memDelta / 1024.0);

                    text = string.Format("{0} | FPS: {1} | Lat: {2:F1}us (Max: {3:F1}us) | Mem: {4}",
                        _settings.WatermarkText, _fps, avgLat, maxLat, memStr);
                }
                else
                {
                    text = _settings.WatermarkText;
                }

                if (_watermarkTextLayout == null || text != _lastWatermarkText)
                {
                    if (_watermarkTextLayout != null) _watermarkTextLayout.Dispose();
                    _watermarkTextLayout = new TextLayout(
                        NinjaTrader.Core.Globals.DirectWriteFactory,
                        text,
                        _textFormat,
                        600.0f,
                        25.0f
                    );
                    _lastWatermarkText = text;
                }
            }

            _frameCount++;

            // 2. Retrieve panel dimensions
            if (chartControl == null || chartControl.ChartPanels.Count <= panelIndex) return;
            var chartPanel = chartControl.ChartPanels[panelIndex];
            if (chartPanel == null) return;

            float panelX = chartPanel.X;
            float panelY = chartPanel.Y;
            float panelW = chartPanel.W;
            float panelH = chartPanel.H;

            // Fetch last tick timestamp for managing bubble fading relative to market data stream
            long dataTimeTicks = _cache.GetLastEventTimestampTicks();
            if (dataTimeTicks == 0) dataTimeTicks = DateTime.UtcNow.Ticks;

            // ==========================================
            // LAYER 1: LIQUIDITY ZONES (Bottommost - disabled by default)
            // ==========================================
            if (showZones)
            {
                int zoneCount = _cache.GetActiveZones(_tempZones, _settings.MaximumVisibleZones);
                float zoneBaseOpacity = (100.0f - _settings.ZoneTransparency) / 100.0f;

                for (int i = 0; i < zoneCount; i++)
                {
                    RenderZone zone = _tempZones[i];
                    if (zone.IsBroken) continue;

                    float y = chartScale.GetYByValue(zone.Price);
                    float xStart = chartControl.GetXByTime(new DateTime(zone.CreationTime));
                    float xEnd = panelX + panelW;

                    if (xStart < panelX) xStart = panelX;

                    float scoreScale = (float)(zone.Score / 100.0);
                    if (scoreScale > 1.0f) scoreScale = 1.0f;
                    if (scoreScale < 0.1f) scoreScale = 0.1f;

                    float finalOpacity = zoneBaseOpacity * scoreScale;

                    SolidColorBrush zoneBrush = _greenBrush;
                    if (zone.Direction == TradeDirection.Sell)
                    {
                        zoneBrush = _redBrush;
                    }

                    zoneBrush.Opacity = finalOpacity;
                    renderTarget.DrawLine(new Vector2(xStart, y), new Vector2(xEnd, y), zoneBrush, 2.0f);

                    if (showRetests && zone.RetestCount > 0)
                    {
                        int retestIdx = Math.Min(zone.RetestCount - 1, 4);
                        TextLayout retestLayout = _retestLayouts[retestIdx];
                        if (retestLayout != null)
                        {
                            _textBrush.Opacity = finalOpacity;
                            renderTarget.DrawTextLayout(
                                new Vector2(xEnd - 30.0f, y - 16.0f),
                                retestLayout,
                                _textBrush
                            );
                        }
                    }
                }
            }

            // ==========================================
            // LAYER 2: BIG TRADE BUBBLES
            // ==========================================
            if (showBubbles)
            {
                int maxBubbles = _settings.MaximumVisibleBubbles;
                int bubbleCount = _cache.GetTradeBubbles(_tempBubbles, _tempBubbleLayouts, maxBubbles);

                for (int i = 0; i < bubbleCount; i++)
                {
                    RenderTradeBubble bubble = _tempBubbles[i];
                    float radius = (float)bubble.Size / 2.0f;

                    float x = chartControl.GetXByTime(new DateTime(bubble.Timestamp));
                    float y = chartScale.GetYByValue(bubble.Price);

                    if (x < panelX - radius || x > panelX + panelW + radius) continue;

                    float opacity = GetBubbleOpacity(ref bubble, dataTimeTicks);
                    if (opacity <= 0.0f) continue; // Hidden after 30 minutes

                    SolidColorBrush fillBrush = _grayBrush;
                    if (bubble.Direction == TradeDirection.Buy)
                        fillBrush = _greenBrush;
                    else if (bubble.Direction == TradeDirection.Sell)
                        fillBrush = _purpleBrush; // Sell Bubble is Purple

                    fillBrush.Opacity = opacity;
                    _bubbleBorderBrush.Opacity = opacity;

                    // Draw bubble circle and border
                    renderTarget.FillEllipse(new Ellipse(new Vector2(x, y), radius, radius), fillBrush);
                    renderTarget.DrawEllipse(new Ellipse(new Vector2(x, y), radius, radius), _bubbleBorderBrush, 1.5f);

                    // Centered volume label rendering
                    TextLayout volLayout = _tempBubbleLayouts[i];
                    if (volLayout != null)
                    {
                        _textBrush.Opacity = opacity;
                        renderTarget.DrawTextLayout(new Vector2(x - 50.0f, y - 10.0f), volLayout, _textBrush);
                    }
                }

                Array.Clear(_tempBubbleLayouts, 0, bubbleCount);
            }

            // Reset brush opacities to full for static UI rendering
            _textBrush.Opacity = 1.0f;
            _greenBrush.Opacity = 1.0f;
            _purpleBrush.Opacity = 1.0f;
            _yellowBrush.Opacity = 1.0f;
            _redBrush.Opacity = 1.0f;

            // 3. Draw Watermark
            float wmWidth = _watermarkTextLayout.Metrics.Width;
            float wmHeight = _watermarkTextLayout.Metrics.Height;
            float margin = 10.0f;

            float wmX = 0, wmY = 0;
            switch (_settings.WatermarkLoc)
            {
                case WatermarkLocation.TopLeft:
                    wmX = panelX + margin;
                    wmY = panelY + margin;
                    break;
                case WatermarkLocation.TopRight:
                    wmX = panelX + panelW - (wmWidth + 8.0f) - margin;
                    wmY = panelY + margin;
                    break;
                case WatermarkLocation.BottomLeft:
                    wmX = panelX + margin;
                    wmY = panelY + panelH - wmHeight - margin;
                    break;
                case WatermarkLocation.BottomRight:
                    wmX = panelX + panelW - (wmWidth + 8.0f) - margin;
                    wmY = panelY + panelH - wmHeight - margin;
                    break;
            }

            float wmDotRadius = 4.0f;
            float wmDotSpacing = 6.0f;
            float wmDotX = wmX + wmDotRadius;
            float wmDotY = wmY + (wmHeight / 2.0f);

            StatusIndicatorColor status = _cache.GetStatusColor();
            SolidColorBrush statusBrush = _greenBrush;
            if (status == StatusIndicatorColor.Yellow)
                statusBrush = _yellowBrush;
            else if (status == StatusIndicatorColor.Red)
                statusBrush = _redBrush;

            renderTarget.FillEllipse(new Ellipse(new Vector2(wmDotX, wmDotY), wmDotRadius, wmDotRadius), statusBrush);
            renderTarget.DrawTextLayout(new Vector2(wmDotX + wmDotRadius + wmDotSpacing, wmY), _watermarkTextLayout, _textBrush);

            // 4. Draw Lightweight Dashboard (disabled by default)
            if (showDashboard)
            {
                if (_dashboardTextLayout == null || currentTicks - _lastFpsUpdateTicks >= 10000000)
                {
                    DeltaSnapshot delta;
                    _cache.TryGetDeltaSnapshot(out delta);

                    string statusStr = "Running";
                    if (status == StatusIndicatorColor.Yellow) statusStr = "Historical";
                    else if (status == StatusIndicatorColor.Red) statusStr = "Disconnected";

                    double largestTrade = 0;
                    double largestBuy = 0;
                    double largestSell = 0;
                    
                    _cache.GetLargestTrades(out largestTrade, out largestBuy, out largestSell);

                    string text = string.Format(
                        "DTBigTrades Pro Dashboard\n" +
                        "-------------------------\n" +
                        "Current Delta: {0:N0}\n" +
                        "Session Delta: {1:N0}\n" +
                        "Largest Trade: {2:N0}\n" +
                        "Largest Buy:   {3:N0}\n" +
                        "Largest Sell:  {4:N0}\n" +
                        "Active Zones:  {5}\n" +
                        "Status:        {6}",
                        delta.CurrentDelta,
                        delta.SessionDelta,
                        largestTrade,
                        largestBuy,
                        largestSell,
                        0,
                        statusStr
                    );

                    if (_dashboardTextLayout == null || text != _lastDashboardText)
                    {
                        if (_dashboardTextLayout != null) _dashboardTextLayout.Dispose();
                        _dashboardTextLayout = new TextLayout(
                            NinjaTrader.Core.Globals.DirectWriteFactory,
                            text,
                            _dashTextFormat,
                            220.0f,
                            140.0f
                        );
                        _lastDashboardText = text;
                    }
                }

                if (_dashboardTextLayout != null)
                {
                    float dashW = _dashboardTextLayout.Metrics.Width;
                    float dashH = _dashboardTextLayout.Metrics.Height;
                    float padding = 8.0f;
                    float boxW = dashW + (padding * 2.0f);
                    float boxH = dashH + (padding * 2.0f);

                    float dashX = 0, dashY = 0;
                    switch (_settings.DashboardPosition)
                    {
                        case WatermarkLocation.TopLeft:
                            dashX = panelX + margin;
                            dashY = panelY + margin;
                            break;
                        case WatermarkLocation.TopRight:
                            dashX = panelX + panelW - boxW - margin;
                            dashY = panelY + margin;
                            break;
                        case WatermarkLocation.BottomLeft:
                            dashX = panelX + margin;
                            dashY = panelY + panelH - boxH - margin;
                            break;
                        case WatermarkLocation.BottomRight:
                            dashX = panelX + panelW - boxW - margin;
                            dashY = panelY + panelH - boxH - margin;
                            break;
                    }

                    if (_settings.DashboardPosition == _settings.WatermarkLoc)
                    {
                        float verticalOffset = wmHeight + 12.0f;
                        if (_settings.DashboardPosition == WatermarkLocation.TopLeft ||
                            _settings.DashboardPosition == WatermarkLocation.TopRight)
                        {
                            dashY += verticalOffset;
                        }
                        else
                        {
                            dashY -= verticalOffset;
                        }
                    }

                    RoundedRectangle roundedRect = new RoundedRectangle();
                    roundedRect.Rect = new RectangleF(dashX, dashY, boxW, boxH);
                    roundedRect.RadiusX = 4.0f;
                    roundedRect.RadiusY = 4.0f;

                    renderTarget.FillRoundedRectangle(roundedRect, _dashBgBrush);
                    renderTarget.DrawRoundedRectangle(roundedRect, _dashBorderBrush, 1.0f);

                    renderTarget.DrawTextLayout(new Vector2(dashX + padding, dashY + padding), _dashboardTextLayout, _textBrush);
                }
            }
        }

        private void DisposeDeviceDependent()
        {
            if (_greenBrush != null) { _greenBrush.Dispose(); _greenBrush = null; }
            if (_purpleBrush != null) { _purpleBrush.Dispose(); _purpleBrush = null; }
            if (_yellowBrush != null) { _yellowBrush.Dispose(); _yellowBrush = null; }
            if (_redBrush != null) { _redBrush.Dispose(); _redBrush = null; }
            if (_grayBrush != null) { _grayBrush.Dispose(); _grayBrush = null; }
            if (_textBrush != null) { _textBrush.Dispose(); _textBrush = null; }
            if (_dashBgBrush != null) { _dashBgBrush.Dispose(); _dashBgBrush = null; }
            if (_dashBorderBrush != null) { _dashBorderBrush.Dispose(); _dashBorderBrush = null; }
            if (_bubbleBorderBrush != null) { _bubbleBorderBrush.Dispose(); _bubbleBorderBrush = null; }
        }

        private void DisposeDeviceIndependent()
        {
            if (_textFormat != null) { _textFormat.Dispose(); _textFormat = null; }
            if (_dashTextFormat != null) { _dashTextFormat.Dispose(); _dashTextFormat = null; }
            if (_watermarkTextLayout != null) { _watermarkTextLayout.Dispose(); _watermarkTextLayout = null; }
            if (_dashboardTextLayout != null) { _dashboardTextLayout.Dispose(); _dashboardTextLayout = null; }

            if (_retestLayouts != null)
            {
                for (int i = 0; i < _retestLayouts.Length; i++)
                {
                    if (_retestLayouts[i] != null)
                    {
                        _retestLayouts[i].Dispose();
                    }
                }
                _retestLayouts = null;
            }
        }

        public void Dispose()
        {
            DisposeDeviceDependent();
            DisposeDeviceIndependent();
        }
    }
}
