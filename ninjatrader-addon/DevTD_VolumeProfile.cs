// ============================================================================
//  DevTD_VolumeProfile  –  NinjaTrader 8 Indicator  (v5)
//  Volume Profile: Daily / Weekly / Monthly / Session
//  VA, POC, VAH/VAL, Peaks & Valleys, Composite Profile
//  Merge / Unmerge / Reset-All via WPF context-menu popup
//
//  FIXES
//  ① Outline-only bars: 1-px vertical inset between adjacent rows removes the
//     "solid fill" visual artefact caused by touching DrawRectangle borders.
//  ② Composite width = % of ChartPanel.W (panel pixel width).
//  ③ Merge UI = WPF ContextMenu popup (dark styled), not chart-drawn boxes.
//     Options: Merge Left | Merge Right | Unmerge | Remove All
//  ④ Unmerge: original LevelMap snapshot saved on first merge and restored.
//  ⑤ All NT8 API casts correct:
//       GetValueByY(float)  GetSlotIndexByX(int)→double
//       GetXByBarIndex→double  GetYByValue→double
// ============================================================================
#region Using declarations
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Linq;
using System.Xml.Serialization;
using NinjaTrader.Cbi;
using NinjaTrader.Gui;
using NinjaTrader.Gui.Chart;
using NinjaTrader.Data;
using NinjaTrader.NinjaScript;
using NinjaTrader.Core.FloatingPoint;
#endregion

public enum VPProfileType { Daily, Weekly, Monthly, Session }

namespace NinjaTrader.NinjaScript.Indicators
{
    // =========================================================================
    //  Data structures
    // =========================================================================
    internal sealed class VPLevel
    {
        public double Price;
        public double Volume;
        public bool   InVA;
        public bool   IsPOC;
    }

    internal sealed class VPSession
    {
        public DateTime StartTime;
        public int      StartBar;
        public int      EndBar;
        public double   POC;
        public double   VAH;
        public double   VAL;
        public bool     IsComplete;
        public bool     Dirty        = true;
        public bool     Merged       = false;  // true → this session was absorbed
        public bool     WasMergedInto= false;  // true → this session absorbed others
        public double   LocalMaxVol  = 1.0;

        public readonly Dictionary<long, VPLevel> LevelMap  = new Dictionary<long, VPLevel>();
        public          List<VPLevel>             LevelList = new List<VPLevel>();
        public          List<double>              Peaks     = new List<double>();
        public          List<double>              Valleys   = new List<double>();

        // Snapshot taken before first merge so Unmerge can restore exact state
        public Dictionary<long, double> OrigVolumes = null;
        public DateTime                  OrigStartTime;
        public int                       OrigStartBar;
        public int                       OrigEndBar;
        public List<int>                 AbsorbedIdxs = new List<int>();
    }

    // =========================================================================
    //  Indicator
    // =========================================================================
    [Gui.CategoryOrder("Profile Settings", 1)]
    [Gui.CategoryOrder("Value Area",       2)]
    [Gui.CategoryOrder("Peak and Valley",  3)]
    [Gui.CategoryOrder("Colors",           4)]
    [Gui.CategoryOrder("General",          5)]
    public class DevTD_VolumeProfile : Indicator
    {
        // ── internal state ───────────────────────────────────────────────────
        private readonly List<VPSession> _sessions = new List<VPSession>();
        private VPSession  _cur;
        private double     _rowSize;
        private long       _rowTick;

        // ChartScale cached from last OnRender for use in the mouse handler
        private ChartScale _lastScale;

        // DirectX brushes
        private SharpDX.Direct2D1.SolidColorBrush _bIn, _bOut, _bCmpIn, _bCmpOut,
                                                   _bPOC, _bVAHL, _bPeak, _bValley;
        private SharpDX.Direct2D1.StrokeStyle      _dash;

        // =====================================================================
        //  Parameters
        // =====================================================================
        #region Parameters

        [NinjaScriptProperty]
        [Display(Name = "Profile Type", Order = 1, GroupName = "Profile Settings")]
        public VPProfileType ProfileType { get; set; }

        [NinjaScriptProperty]
        [Range(10, 200)]
        [Display(Name = "Profile Width %", Order = 2, GroupName = "Profile Settings")]
        public int ProfileWidthPct { get; set; }

        [NinjaScriptProperty]
        [Range(1, 50)]
        [Display(Name = "Ticks Per Row", Order = 3, GroupName = "Profile Settings")]
        public int TicksPerRow { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show Composite Profile", Order = 4, GroupName = "Profile Settings")]
        public bool ShowCompositeProfile { get; set; }

        [NinjaScriptProperty]
        [Range(1, 60)]
        [Display(Name = "Composite Width % (of panel)", Order = 5, GroupName = "Profile Settings")]
        public int CompositeWidthPct { get; set; }

        [NinjaScriptProperty]
        [Range(1, 5)]
        [Display(Name = "Profile Line Width (px)", Order = 6, GroupName = "Profile Settings")]
        public int ProfileLineWidth { get; set; }

        [NinjaScriptProperty]
        [Range(1, 100)]
        [Display(Name = "VA Percent", Order = 1, GroupName = "Value Area")]
        public int VAPct { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show Peaks", Order = 1, GroupName = "Peak and Valley")]
        public bool ShowPeaks { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show Valleys", Order = 2, GroupName = "Peak and Valley")]
        public bool ShowValleys { get; set; }

        [NinjaScriptProperty]
        [Range(1, 20)]
        [Display(Name = "Peak Valley Strength", Order = 3, GroupName = "Peak and Valley")]
        public int PeakValleyStrength { get; set; }

        // ── Colors ──────────────────────────────────────────────────────────
        [NinjaScriptProperty][XmlIgnore]
        [Display(Name = "Inside VA", Order = 1, GroupName = "Colors")]
        public System.Windows.Media.Color InsideVAColor { get; set; }
        [Browsable(false)]
        public string InsideVAColorS
        { get => C2H(InsideVAColor); set => InsideVAColor = H2C(value, InsideVAColor); }

        [NinjaScriptProperty][XmlIgnore]
        [Display(Name = "Outside VA", Order = 2, GroupName = "Colors")]
        public System.Windows.Media.Color OutsideVAColor { get; set; }
        [Browsable(false)]
        public string OutsideVAColorS
        { get => C2H(OutsideVAColor); set => OutsideVAColor = H2C(value, OutsideVAColor); }

        [NinjaScriptProperty][XmlIgnore]
        [Display(Name = "VAH / VAL Line", Order = 3, GroupName = "Colors")]
        public System.Windows.Media.Color VAHLColor { get; set; }
        [Browsable(false)]
        public string VAHLColorS
        { get => C2H(VAHLColor); set => VAHLColor = H2C(value, VAHLColor); }

        [NinjaScriptProperty][XmlIgnore]
        [Display(Name = "POC Line", Order = 4, GroupName = "Colors")]
        public System.Windows.Media.Color POCColor { get; set; }
        [Browsable(false)]
        public string POCColorS
        { get => C2H(POCColor); set => POCColor = H2C(value, POCColor); }

        [NinjaScriptProperty][XmlIgnore]
        [Display(Name = "Peak Marker", Order = 5, GroupName = "Colors")]
        public System.Windows.Media.Color PeakColor { get; set; }
        [Browsable(false)]
        public string PeakColorS
        { get => C2H(PeakColor); set => PeakColor = H2C(value, PeakColor); }

        [NinjaScriptProperty][XmlIgnore]
        [Display(Name = "Valley Marker", Order = 6, GroupName = "Colors")]
        public System.Windows.Media.Color ValleyColor { get; set; }
        [Browsable(false)]
        public string ValleyColorS
        { get => C2H(ValleyColor); set => ValleyColor = H2C(value, ValleyColor); }

        [NinjaScriptProperty]
        [Range(1, 100)]
        [Display(Name = "Outside VA Opacity %", Order = 7, GroupName = "Colors")]
        public int OutsideOpacity { get; set; }

        [NinjaScriptProperty]
        [Range(1, 100)]
        [Display(Name = "Inside VA Opacity %", Order = 8, GroupName = "Colors")]
        public int InsideOpacity { get; set; }

        [NinjaScriptProperty][XmlIgnore]
        [Display(Name = "Composite Inside VA", Order = 9, GroupName = "Colors")]
        public System.Windows.Media.Color CompositeInColor { get; set; }
        [Browsable(false)]
        public string CompositeInColorS
        { get => C2H(CompositeInColor); set => CompositeInColor = H2C(value, CompositeInColor); }

        [NinjaScriptProperty][XmlIgnore]
        [Display(Name = "Composite Outside VA", Order = 10, GroupName = "Colors")]
        public System.Windows.Media.Color CompositeOutColor { get; set; }
        [Browsable(false)]
        public string CompositeOutColorS
        { get => C2H(CompositeOutColor); set => CompositeOutColor = H2C(value, CompositeOutColor); }

        [NinjaScriptProperty]
        [Display(Name = "Show Price Line", Order = 1, GroupName = "General")]
        public bool ShowPriceLine { get; set; }

        #endregion

        // ── Color helpers ────────────────────────────────────────────────────
        private static string C2H(System.Windows.Media.Color c)
            => string.Format("#{0:X2}{1:X2}{2:X2}{3:X2}", c.A, c.R, c.G, c.B);

        private static System.Windows.Media.Color H2C(string s, System.Windows.Media.Color fb)
        {
            if (string.IsNullOrEmpty(s)) return fb;
            try
            {
                s = s.Trim().TrimStart('#');
                if (s.Length == 6) s = "FF" + s;
                if (s.Length != 8) return fb;
                byte a = byte.Parse(s.Substring(0, 2), NumberStyles.HexNumber);
                byte r = byte.Parse(s.Substring(2, 2), NumberStyles.HexNumber);
                byte g = byte.Parse(s.Substring(4, 2), NumberStyles.HexNumber);
                byte b = byte.Parse(s.Substring(6, 2), NumberStyles.HexNumber);
                return System.Windows.Media.Color.FromArgb(a, r, g, b);
            }
            catch { return fb; }
        }

        // =====================================================================
        //  OnStateChange
        // =====================================================================
        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Description         = "DevTD Volume Profile – outline bars, context-menu merge";
                Name                = "DevTD VolumeProfile";
                Calculate           = Calculate.OnPriceChange;
                IsOverlay           = true;
                DrawOnPricePanel    = true;
                IsAutoScale         = false;
                ZOrder              = -1;
                MaximumBarsLookBack = MaximumBarsLookBack.TwoHundredFiftySix;
                BarsRequiredToPlot  = 1;
                ScaleJustification  = NinjaTrader.Gui.Chart.ScaleJustification.Right;
                DisplayInDataBox    = false;

                ProfileType          = VPProfileType.Daily;
                ProfileWidthPct      = 80;
                TicksPerRow          = 4;
                ShowCompositeProfile = false;
                CompositeWidthPct    = 15;
                ProfileLineWidth     = 1;
                VAPct                = 70;
                ShowPeaks            = false;
                ShowValleys          = false;
                PeakValleyStrength   = 5;

                InsideVAColor     = System.Windows.Media.Color.FromArgb(255, 255, 140,   0);
                OutsideVAColor    = System.Windows.Media.Color.FromArgb(255, 125, 125, 124);
                VAHLColor         = System.Windows.Media.Color.FromArgb(255, 255, 140,   0);
                POCColor          = System.Windows.Media.Color.FromArgb(255, 255,  67, 100);
                PeakColor         = System.Windows.Media.Color.FromArgb(255, 255,  50,  50);
                ValleyColor       = System.Windows.Media.Color.FromArgb(255,  50, 200, 200);
                CompositeInColor  = System.Windows.Media.Color.FromArgb(255, 255, 140,   0);
                CompositeOutColor = System.Windows.Media.Color.FromArgb(255, 125, 125, 124);
                InsideOpacity     = 80;
                OutsideOpacity    = 50;
                ShowPriceLine     = true;
            }
            else if (State == State.Configure)
            {
                _sessions.Clear();
                _cur = null;
            }
            else if (State == State.DataLoaded)
            {
                if (ChartControl != null)
                {
                    ChartControl.MouseLeftButtonDown -= OnChartMouseDown;
                    ChartControl.MouseLeftButtonDown += OnChartMouseDown;
                }
            }
            else if (State == State.Terminated)
            {
                if (ChartControl != null)
                    ChartControl.MouseLeftButtonDown -= OnChartMouseDown;
                FreeBrushes();
            }
        }

        // =====================================================================
        //  OnBarUpdate
        // =====================================================================
        protected override void OnBarUpdate()
        {
            if (CurrentBar < 1) return;

            double rs = TickSize * TicksPerRow;
            if (rs != _rowSize)
            {
                _rowSize = rs;
                _rowTick = (long)Math.Round(rs / TickSize);
                _sessions.Clear();
                _cur = null;
            }

            DateTime t = Time[0];

            if (_cur == null || IsNewSession(t))
            {
                if (_cur != null)
                {
                    _cur.EndBar     = CurrentBar - 1;
                    _cur.IsComplete = true;
                    if (_cur.Dirty) Finalise(_cur);
                }
                _cur = new VPSession { StartTime = t, StartBar = CurrentBar, EndBar = CurrentBar };
                _sessions.Add(_cur);
            }

            double lo  = Low[0];
            double hi  = High[0];
            double vol = Volume[0];
            double rng = hi - lo;

            long keyLo = (long)Math.Floor(lo / _rowSize);
            long keyHi = (long)Math.Floor(hi / _rowSize);

            for (long key = keyLo; key <= keyHi; key++)
            {
                double rLo   = key * _rowSize;
                double rHi   = rLo + _rowSize;
                double ovlap = Math.Min(hi, rHi) - Math.Max(lo, rLo);
                double part  = rng > 0 ? vol * (ovlap / rng) : vol;

                VPLevel lvl;
                if (!_cur.LevelMap.TryGetValue(key, out lvl))
                {
                    lvl = new VPLevel { Price = rLo };
                    _cur.LevelMap[key] = lvl;
                }
                lvl.Volume += part;
            }

            _cur.EndBar = CurrentBar;
            _cur.Dirty  = true;
        }

        // =====================================================================
        //  Finalise
        // =====================================================================
        private void Finalise(VPSession s)
        {
            s.Dirty = false;
            if (s.LevelMap.Count == 0) return;

            s.LevelList = s.LevelMap.Values.OrderBy(l => l.Price).ToList();

            double total    = 0;
            double localMax = 0;
            VPLevel poc     = s.LevelList[0];

            foreach (var l in s.LevelList)
            {
                total += l.Volume;
                if (l.Volume > poc.Volume) poc = l;
                if (l.Volume > localMax)   localMax = l.Volume;
            }
            if (total <= 0) return;

            s.LocalMaxVol = localMax > 0 ? localMax : 1.0;
            s.POC         = poc.Price;

            double target = total * (VAPct / 100.0);
            double accum  = poc.Volume;
            int    up     = s.LevelList.IndexOf(poc);
            int    dn     = up;
            int    cnt    = s.LevelList.Count;

            while (accum < target)
            {
                double upV = (up + 1 < cnt) ? s.LevelList[up + 1].Volume : 0;
                double dnV = (dn - 1 >= 0)  ? s.LevelList[dn - 1].Volume : 0;
                if      (upV >= dnV && upV > 0) { up++; accum += upV; }
                else if (dnV > 0)               { dn--; accum += dnV; }
                else break;
            }

            s.VAH = s.LevelList[up].Price + _rowSize;
            s.VAL = s.LevelList[dn].Price;

            foreach (var l in s.LevelList)
            {
                l.InVA  = l.Price >= s.LevelList[dn].Price && l.Price <= s.LevelList[up].Price;
                l.IsPOC = l.Price.ApproxCompare(poc.Price) == 0;
            }

            s.Peaks.Clear();
            s.Valleys.Clear();
            if (ShowPeaks || ShowValleys)
            {
                int str = PeakValleyStrength;
                for (int i = str; i < cnt - str; i++)
                {
                    bool   isPk = true, isVl = true;
                    double v    = s.LevelList[i].Volume;
                    for (int j = 1; j <= str; j++)
                    {
                        if (v <= s.LevelList[i - j].Volume || v <= s.LevelList[i + j].Volume) isPk = false;
                        if (v >= s.LevelList[i - j].Volume || v >= s.LevelList[i + j].Volume) isVl = false;
                        if (!isPk && !isVl) break;
                    }
                    if (isPk && ShowPeaks)   s.Peaks.Add(s.LevelList[i].Price);
                    if (isVl && ShowValleys) s.Valleys.Add(s.LevelList[i].Price);
                }
            }
        }

        // =====================================================================
        //  Mouse → context menu
        // =====================================================================
        private void OnChartMouseDown(object sender,
                                       System.Windows.Input.MouseButtonEventArgs e)
        {
            if (ChartControl == null || _lastScale == null ||
                Bars == null || ChartBars == null) return;

            System.Windows.Point pt = e.GetPosition(ChartControl);

            double clickPrice = _lastScale.GetValueByY((float)pt.Y);
            int    barIdx     = (int)ChartControl.GetSlotIndexByX((int)pt.X);
            barIdx = Math.Max(0, Math.Min(barIdx, Bars.Count - 1));

            int idx = FindSessionAt(clickPrice, barIdx);
            if (idx < 0) return;

            ShowMergeMenu(idx);
        }

        private int FindSessionAt(double price, int barIdx)
        {
            for (int i = 0; i < _sessions.Count; i++)
            {
                var s = _sessions[i];
                if (s.Merged || s.LevelList.Count == 0) continue;

                if (barIdx < s.StartBar || barIdx > s.EndBar) continue;

                double lo = s.LevelList[0].Price - _rowSize;
                double hi = s.LevelList[s.LevelList.Count - 1].Price + _rowSize * 2;
                if (price < lo || price > hi) continue;

                return i;
            }
            return -1;
        }

        // =====================================================================
        //  Context-menu popup  (dark styled, matches NT8 UI)
        // =====================================================================
        private void ShowMergeMenu(int idx)
        {
            // Capture all required values before dispatching
            var s         = _sessions[idx];
            
            int leftIdx = -1;
            for (int i = idx - 1; i >= 0; i--)
            {
                if (!_sessions[i].Merged)
                {
                    leftIdx = i;
                    break;
                }
            }
            
            int rightIdx = -1;
            for (int i = idx + 1; i < _sessions.Count; i++)
            {
                if (!_sessions[i].Merged)
                {
                    rightIdx = i;
                    break;
                }
            }
            
            bool hasLeft  = leftIdx != -1;
            bool hasRight = rightIdx != -1;
            bool canUnmerge = s.WasMergedInto && s.OrigVolumes != null;

            ChartControl.Dispatcher.InvokeAsync(() =>
            {
                var menu = new System.Windows.Controls.ContextMenu();

                // Dark styling
                var darkBg = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromArgb(235, 28, 28, 28));
                var lightFg = System.Windows.Media.Brushes.WhiteSmoke;
                var border  = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromArgb(255, 70, 70, 70));

                menu.Background   = darkBg;
                menu.BorderBrush  = border;
                menu.BorderThickness = new System.Windows.Thickness(1);

                if (hasLeft)
                    menu.Items.Add(MakeItem("Merge Session Left",  lightFg, darkBg,
                        () => MergeSessions(idx, leftIdx)));

                if (hasRight)
                    menu.Items.Add(MakeItem("Merge Session Right", lightFg, darkBg,
                        () => MergeSessions(idx, rightIdx)));

                if (canUnmerge)
                    menu.Items.Add(MakeItem("Unmerge This Session", lightFg, darkBg,
                        () => UnmergeSession(idx)));

                menu.Items.Add(MakeItem("Remove All Splitting and Merging",
                    System.Windows.Media.Brushes.Tomato, darkBg,
                    () => ResetAllMerges()));

                menu.PlacementTarget = ChartControl;
                menu.Placement       =
                    System.Windows.Controls.Primitives.PlacementMode.MousePoint;
                menu.IsOpen = true;
            });
        }

        private static System.Windows.Controls.MenuItem MakeItem(
            string header,
            System.Windows.Media.Brush fg,
            System.Windows.Media.Brush bg,
            Action onClick)
        {
            var item = new System.Windows.Controls.MenuItem
            {
                Header     = header,
                Foreground = fg,
                Background = bg
            };
            item.Click += (o, e) => onClick();
            return item;
        }

        // =====================================================================
        //  Merge / Unmerge / Reset
        // =====================================================================
        private void MergeSessions(int dstIdx, int srcIdx)
        {
            if ((uint)dstIdx >= (uint)_sessions.Count) return;
            if ((uint)srcIdx >= (uint)_sessions.Count) return;

            var dst = _sessions[dstIdx];
            var src = _sessions[srcIdx];

            // Save snapshot before the very first merge so Unmerge can restore
            if (!dst.WasMergedInto)
            {
                dst.OrigVolumes   = new Dictionary<long, double>();
                foreach (var kv in dst.LevelMap)
                    dst.OrigVolumes[kv.Key] = kv.Value.Volume;
                dst.OrigStartTime = dst.StartTime;
                dst.OrigStartBar  = dst.StartBar;
                dst.OrigEndBar    = dst.EndBar;
            }

            // Absorb src volumes into dst
            foreach (var kv in src.LevelMap)
            {
                VPLevel lvl;
                if (!dst.LevelMap.TryGetValue(kv.Key, out lvl))
                {
                    lvl = new VPLevel { Price = kv.Value.Price };
                    dst.LevelMap[kv.Key] = lvl;
                }
                lvl.Volume += kv.Value.Volume;
            }

            dst.StartBar = Math.Min(dst.StartBar, src.StartBar);
            dst.EndBar   = Math.Max(dst.EndBar,   src.EndBar);
            if (dst.StartBar == src.StartBar) dst.StartTime = src.StartTime;

            dst.WasMergedInto = true;
            dst.AbsorbedIdxs.Add(srcIdx);
            dst.Dirty = true;
            src.Merged = true;

            Finalise(dst);
            ForceRefresh();
        }

        private void UnmergeSession(int dstIdx)
        {
            if ((uint)dstIdx >= (uint)_sessions.Count) return;
            var dst = _sessions[dstIdx];
            if (!dst.WasMergedInto || dst.OrigVolumes == null) return;

            // Restore volumes to the original snapshot
            // Remove any keys added by the merge that weren't originally there
            foreach (var key in dst.LevelMap.Keys.ToList())
            {
                if (dst.OrigVolumes.ContainsKey(key))
                    dst.LevelMap[key].Volume = dst.OrigVolumes[key];
                else
                    dst.LevelMap.Remove(key);
            }

            // Restore bar range and time
            dst.StartTime = dst.OrigStartTime;
            dst.StartBar  = dst.OrigStartBar;
            dst.EndBar    = dst.OrigEndBar;

            // Release absorbed sessions
            foreach (int i in dst.AbsorbedIdxs)
                if ((uint)i < (uint)_sessions.Count)
                    _sessions[i].Merged = false;

            dst.AbsorbedIdxs.Clear();
            dst.OrigVolumes   = null;
            dst.WasMergedInto = false;
            dst.Dirty         = true;

            Finalise(dst);
            ForceRefresh();
        }

        private void ResetAllMerges()
        {
            foreach (var s in _sessions)
            {
                if (s.WasMergedInto && s.OrigVolumes != null)
                {
                    foreach (var key in s.LevelMap.Keys.ToList())
                    {
                        if (s.OrigVolumes.ContainsKey(key))
                            s.LevelMap[key].Volume = s.OrigVolumes[key];
                        else
                            s.LevelMap.Remove(key);
                    }
                    s.StartTime = s.OrigStartTime;
                    s.StartBar  = s.OrigStartBar;
                    s.EndBar    = s.OrigEndBar;
                    s.AbsorbedIdxs.Clear();
                    s.OrigVolumes   = null;
                    s.WasMergedInto = false;
                    s.Dirty         = true;
                }
                s.Merged = false;
            }
            ForceRefresh();
        }

        // =====================================================================
        //  Session boundary
        // =====================================================================
        private bool IsNewSession(DateTime t)
        {
            switch (ProfileType)
            {
                case VPProfileType.Daily:
                    return t.Date != _cur.StartTime.Date;
                case VPProfileType.Weekly:
                    return WeekNum(t) != WeekNum(_cur.StartTime) || t.Year != _cur.StartTime.Year;
                case VPProfileType.Monthly:
                    return t.Year != _cur.StartTime.Year || t.Month != _cur.StartTime.Month;
                case VPProfileType.Session:
                    return Bars.IsFirstBarOfSession;
                default:
                    return t.Date != _cur.StartTime.Date;
            }
        }

        private static int WeekNum(DateTime d) =>
            CultureInfo.InvariantCulture.Calendar.GetWeekOfYear(
                d, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);

        // =====================================================================
        //  OnRender
        // =====================================================================
        protected override void OnRender(ChartControl cc, ChartScale cs)
        {
            if (RenderTarget == null || _sessions.Count == 0) return;

            _lastScale = cs;
            MakeBrushes();

            foreach (var s in _sessions)
                if (s.Dirty) Finalise(s);

            float panelW      = (float)ChartPanel.W;
            float panelRight  = (float)(ChartPanel.X + ChartPanel.W);
            float compMaxBarW = panelW * (CompositeWidthPct / 100f);
            float lw          = (float)ProfileLineWidth;

            for (int si = 0; si < _sessions.Count; si++)
            {
                var s = _sessions[si];
                if (s.Merged || s.LevelList.Count == 0) continue;

                float xS   = (float)cc.GetXByBarIndex(ChartBars, s.StartBar);
                float xE   = (float)cc.GetXByBarIndex(ChartBars, s.EndBar);
                float xNow = (float)cc.GetXByBarIndex(ChartBars, CurrentBar);

                float sessSpan = Math.Abs(xE - xS);
                float maxBarW  = sessSpan * (ProfileWidthPct / 100f);

                // ── Volume rows – horizontal lines ───────────────────────────
                DrawProfileLines(s.LevelList, xS, maxBarW, s.LocalMaxVol, cs, _bIn, _bOut, lw, true);

                // ── POC ───────────────────────────────────────────────────────
                float yPOC = (float)cs.GetYByValue(s.POC + _rowSize * 0.5);
                RenderTarget.DrawLine(
                    new SharpDX.Vector2(xS, yPOC),
                    new SharpDX.Vector2(xE, yPOC),
                    _bPOC, 1.5f);

                // ── VAH / VAL dashed ─────────────────────────────────────────
                float yVAH = (float)cs.GetYByValue(s.VAH);
                float yVAL = (float)cs.GetYByValue(s.VAL);
                DrawDash(xS, yVAH, xE, yVAH, 1f);
                DrawDash(xS, yVAL, xE, yVAL, 1f);

                if (s.IsComplete && si == _sessions.Count - 2)
                {
                    DrawDash(xE, yVAH, xNow, yVAH, 1f);
                    DrawDash(xE, yVAL, xNow, yVAL, 1f);
                }

                // ── Peaks / Valleys ───────────────────────────────────────────
                if (ShowPeaks)
                    foreach (double p in s.Peaks)
                    {
                        float yP = (float)cs.GetYByValue(p + _rowSize * 0.5);
                        RenderTarget.DrawLine(
                            new SharpDX.Vector2(xS, yP),
                            new SharpDX.Vector2(xE, yP),
                            _bPeak, 1f);
                    }

                if (ShowValleys)
                    foreach (double v in s.Valleys)
                    {
                        float yV = (float)cs.GetYByValue(v + _rowSize * 0.5);
                        RenderTarget.DrawLine(
                            new SharpDX.Vector2(xS, yV),
                            new SharpDX.Vector2(xE, yV),
                            _bValley, 1f);
                    }
            }

            if (ShowCompositeProfile)
                RenderComposite(cs, panelRight, compMaxBarW, lw);
        }

        // ── Dashed line ───────────────────────────────────────────────────────
        private void DrawDash(float x1, float y1, float x2, float y2, float w)
        {
            if (_dash == null)
            {
                var p = new SharpDX.Direct2D1.StrokeStyleProperties
                    { DashStyle = SharpDX.Direct2D1.DashStyle.Dash };
                _dash = new SharpDX.Direct2D1.StrokeStyle(
                    NinjaTrader.Core.Globals.D2DFactory, p);
            }
            RenderTarget.DrawLine(
                new SharpDX.Vector2(x1, y1),
                new SharpDX.Vector2(x2, y2),
                _bVAHL, w, _dash);
        }

        // ── Draw Profile Lines ────────────────────────────────────────────────
        private void DrawProfileLines(
            List<VPLevel> levels,
            float xBase,
            float maxBarW,
            double localMaxVol,
            ChartScale cs,
            SharpDX.Direct2D1.SolidColorBrush brIn,
            SharpDX.Direct2D1.SolidColorBrush brOut,
            float lw,
            bool drawToRight)
        {
            var activeLevels = levels.Where(l => l.Volume > 1e-5).ToList();
            int cnt = activeLevels.Count;
            if (cnt == 0) return;

            // 1. Find overall Y range to draw a single vertical base line
            float yMin = float.MaxValue;
            float yMax = float.MinValue;

            foreach (var l in activeLevels)
            {
                float yTop = (float)cs.GetYByValue(l.Price + _rowSize);
                float yBot = (float)cs.GetYByValue(l.Price);
                yMin = Math.Min(yMin, Math.Min(yTop, yBot));
                yMax = Math.Max(yMax, Math.Max(yTop, yBot));
            }

            // Draw the vertical base line
            RenderTarget.DrawLine(
                new SharpDX.Vector2(xBase, yMin),
                new SharpDX.Vector2(xBase, yMax),
                brOut, lw);

            // 2. Draw horizontal lines for each level
            foreach (var l in activeLevels)
            {
                float barW = (float)(l.Volume / localMaxVol) * maxBarW;
                if (barW < 1f) barW = 1f;

                float yTop = (float)cs.GetYByValue(l.Price + _rowSize);
                float yBot = (float)cs.GetYByValue(l.Price);
                float yMid = (yTop + yBot) * 0.5f;

                float xTip = drawToRight ? (xBase + barW) : (xBase - barW);
                SharpDX.Direct2D1.SolidColorBrush br = l.InVA ? brIn : brOut;

                RenderTarget.DrawLine(
                    new SharpDX.Vector2(xBase, yMid),
                    new SharpDX.Vector2(xTip, yMid),
                    br, lw);
            }
        }

        // =====================================================================
        //  Composite profile  ②  (width = % of panel pixel width)
        // =====================================================================
        private void RenderComposite(ChartScale cs,
                                      float panelRight, float maxBarW, float lw)
        {
            var map = new Dictionary<long, double>();
            foreach (var s in _sessions)
            {
                if (s.Merged) continue;
                foreach (var kv in s.LevelMap)
                {
                    double v;
                    map[kv.Key] = map.TryGetValue(kv.Key, out v)
                        ? v + kv.Value.Volume
                        : kv.Value.Volume;
                }
            }
            if (map.Count == 0) return;

            var    keys   = map.Keys.OrderBy(k => k).ToList();
            long   pocKey = keys.OrderByDescending(k => map[k]).First();
            double total  = 0;
            foreach (var kv in map) total += kv.Value;

            double target = total * (VAPct / 100.0);
            double accum  = map[pocKey];
            int    up     = keys.IndexOf(pocKey);
            int    dn     = up;
            int    cnt    = keys.Count;

            while (accum < target)
            {
                double upV = (up + 1 < cnt) ? map[keys[up + 1]] : 0;
                double dnV = (dn - 1 >= 0)  ? map[keys[dn - 1]] : 0;
                if      (upV >= dnV && upV > 0) { up++; accum += upV; }
                else if (dnV > 0)               { dn--; accum += dnV; }
                else break;
            }

            long   vahKey = keys[up];
            long   valKey = keys[dn];
            double cMax   = map.Values.Max();

            var compLevels = keys.Select(k => new VPLevel {
                Price = k * _rowSize,
                Volume = map[k],
                InVA = k >= valKey && k <= vahKey
            }).ToList();

            DrawProfileLines(compLevels, panelRight, maxBarW, cMax, cs, _bCmpIn, _bCmpOut, lw, false);
        }

        // =====================================================================
        //  Brush management
        // =====================================================================
        private void MakeBrushes()
        {
            if (_bIn != null) return;
            float iOp = InsideOpacity  / 100f;
            float oOp = OutsideOpacity / 100f;
            _bIn    = MkB(InsideVAColor,    iOp);
            _bOut   = MkB(OutsideVAColor,   oOp);
            _bCmpIn = MkB(CompositeInColor,  iOp);
            _bCmpOut= MkB(CompositeOutColor, oOp);
            _bPOC   = MkB(POCColor,   1f);
            _bVAHL  = MkB(VAHLColor,  1f);
            _bPeak  = MkB(PeakColor,  1f);
            _bValley= MkB(ValleyColor, 1f);
        }

        private SharpDX.Direct2D1.SolidColorBrush MkB(
            System.Windows.Media.Color c, float alpha)
        {
            var dx = new SharpDX.Color4(c.R / 255f, c.G / 255f, c.B / 255f, alpha);
            return new SharpDX.Direct2D1.SolidColorBrush(RenderTarget, dx);
        }

        private void FreeBrushes()
        {
            if (_bIn    != null) { _bIn.Dispose();    _bIn    = null; }
            if (_bOut   != null) { _bOut.Dispose();   _bOut   = null; }
            if (_bCmpIn != null) { _bCmpIn.Dispose(); _bCmpIn = null; }
            if (_bCmpOut!= null) { _bCmpOut.Dispose();_bCmpOut= null; }
            if (_bPOC   != null) { _bPOC.Dispose();   _bPOC   = null; }
            if (_bVAHL  != null) { _bVAHL.Dispose();  _bVAHL  = null; }
            if (_bPeak  != null) { _bPeak.Dispose();  _bPeak  = null; }
            if (_bValley!= null) { _bValley.Dispose();_bValley= null; }
            if (_dash   != null) { _dash.Dispose();   _dash   = null; }
        }

        public override void OnRenderTargetChanged() => FreeBrushes();
    }
}

#region NinjaScript generated code. Neither change nor remove.

namespace NinjaTrader.NinjaScript.Indicators
{
	public partial class Indicator : NinjaTrader.Gui.NinjaScript.IndicatorRenderBase
	{
		private DevTD_VolumeProfile[] cacheDevTD_VolumeProfile;
		public DevTD_VolumeProfile DevTD_VolumeProfile(VPProfileType profileType, int profileWidthPct, int ticksPerRow, bool showCompositeProfile, int compositeWidthPct, int profileLineWidth, int vAPct, bool showPeaks, bool showValleys, int peakValleyStrength, System.Windows.Media.Color insideVAColor, System.Windows.Media.Color outsideVAColor, System.Windows.Media.Color vAHLColor, System.Windows.Media.Color pOCColor, System.Windows.Media.Color peakColor, System.Windows.Media.Color valleyColor, int outsideOpacity, int insideOpacity, System.Windows.Media.Color compositeInColor, System.Windows.Media.Color compositeOutColor, bool showPriceLine)
		{
			return DevTD_VolumeProfile(Input, profileType, profileWidthPct, ticksPerRow, showCompositeProfile, compositeWidthPct, profileLineWidth, vAPct, showPeaks, showValleys, peakValleyStrength, insideVAColor, outsideVAColor, vAHLColor, pOCColor, peakColor, valleyColor, outsideOpacity, insideOpacity, compositeInColor, compositeOutColor, showPriceLine);
		}

		public DevTD_VolumeProfile DevTD_VolumeProfile(ISeries<double> input, VPProfileType profileType, int profileWidthPct, int ticksPerRow, bool showCompositeProfile, int compositeWidthPct, int profileLineWidth, int vAPct, bool showPeaks, bool showValleys, int peakValleyStrength, System.Windows.Media.Color insideVAColor, System.Windows.Media.Color outsideVAColor, System.Windows.Media.Color vAHLColor, System.Windows.Media.Color pOCColor, System.Windows.Media.Color peakColor, System.Windows.Media.Color valleyColor, int outsideOpacity, int insideOpacity, System.Windows.Media.Color compositeInColor, System.Windows.Media.Color compositeOutColor, bool showPriceLine)
		{
			if (cacheDevTD_VolumeProfile != null)
				for (int idx = 0; idx < cacheDevTD_VolumeProfile.Length; idx++)
					if (cacheDevTD_VolumeProfile[idx] != null && cacheDevTD_VolumeProfile[idx].ProfileType == profileType && cacheDevTD_VolumeProfile[idx].ProfileWidthPct == profileWidthPct && cacheDevTD_VolumeProfile[idx].TicksPerRow == ticksPerRow && cacheDevTD_VolumeProfile[idx].ShowCompositeProfile == showCompositeProfile && cacheDevTD_VolumeProfile[idx].CompositeWidthPct == compositeWidthPct && cacheDevTD_VolumeProfile[idx].ProfileLineWidth == profileLineWidth && cacheDevTD_VolumeProfile[idx].VAPct == vAPct && cacheDevTD_VolumeProfile[idx].ShowPeaks == showPeaks && cacheDevTD_VolumeProfile[idx].ShowValleys == showValleys && cacheDevTD_VolumeProfile[idx].PeakValleyStrength == peakValleyStrength && cacheDevTD_VolumeProfile[idx].InsideVAColor == insideVAColor && cacheDevTD_VolumeProfile[idx].OutsideVAColor == outsideVAColor && cacheDevTD_VolumeProfile[idx].VAHLColor == vAHLColor && cacheDevTD_VolumeProfile[idx].POCColor == pOCColor && cacheDevTD_VolumeProfile[idx].PeakColor == peakColor && cacheDevTD_VolumeProfile[idx].ValleyColor == valleyColor && cacheDevTD_VolumeProfile[idx].OutsideOpacity == outsideOpacity && cacheDevTD_VolumeProfile[idx].InsideOpacity == insideOpacity && cacheDevTD_VolumeProfile[idx].CompositeInColor == compositeInColor && cacheDevTD_VolumeProfile[idx].CompositeOutColor == compositeOutColor && cacheDevTD_VolumeProfile[idx].ShowPriceLine == showPriceLine && cacheDevTD_VolumeProfile[idx].EqualsInput(input))
						return cacheDevTD_VolumeProfile[idx];
			return CacheIndicator<DevTD_VolumeProfile>(new DevTD_VolumeProfile(){ ProfileType = profileType, ProfileWidthPct = profileWidthPct, TicksPerRow = ticksPerRow, ShowCompositeProfile = showCompositeProfile, CompositeWidthPct = compositeWidthPct, ProfileLineWidth = profileLineWidth, VAPct = vAPct, ShowPeaks = showPeaks, ShowValleys = showValleys, PeakValleyStrength = peakValleyStrength, InsideVAColor = insideVAColor, OutsideVAColor = outsideVAColor, VAHLColor = vAHLColor, POCColor = pOCColor, PeakColor = peakColor, ValleyColor = valleyColor, OutsideOpacity = outsideOpacity, InsideOpacity = insideOpacity, CompositeInColor = compositeInColor, CompositeOutColor = compositeOutColor, ShowPriceLine = showPriceLine }, input, ref cacheDevTD_VolumeProfile);
		}
	}
}

namespace NinjaTrader.NinjaScript.MarketAnalyzerColumns
{
	public partial class MarketAnalyzerColumn : MarketAnalyzerColumnBase
	{
		public Indicators.DevTD_VolumeProfile DevTD_VolumeProfile(VPProfileType profileType, int profileWidthPct, int ticksPerRow, bool showCompositeProfile, int compositeWidthPct, int profileLineWidth, int vAPct, bool showPeaks, bool showValleys, int peakValleyStrength, System.Windows.Media.Color insideVAColor, System.Windows.Media.Color outsideVAColor, System.Windows.Media.Color vAHLColor, System.Windows.Media.Color pOCColor, System.Windows.Media.Color peakColor, System.Windows.Media.Color valleyColor, int outsideOpacity, int insideOpacity, System.Windows.Media.Color compositeInColor, System.Windows.Media.Color compositeOutColor, bool showPriceLine)
		{
			return indicator.DevTD_VolumeProfile(Input, profileType, profileWidthPct, ticksPerRow, showCompositeProfile, compositeWidthPct, profileLineWidth, vAPct, showPeaks, showValleys, peakValleyStrength, insideVAColor, outsideVAColor, vAHLColor, pOCColor, peakColor, valleyColor, outsideOpacity, insideOpacity, compositeInColor, compositeOutColor, showPriceLine);
		}

		public Indicators.DevTD_VolumeProfile DevTD_VolumeProfile(ISeries<double> input , VPProfileType profileType, int profileWidthPct, int ticksPerRow, bool showCompositeProfile, int compositeWidthPct, int profileLineWidth, int vAPct, bool showPeaks, bool showValleys, int peakValleyStrength, System.Windows.Media.Color insideVAColor, System.Windows.Media.Color outsideVAColor, System.Windows.Media.Color vAHLColor, System.Windows.Media.Color pOCColor, System.Windows.Media.Color peakColor, System.Windows.Media.Color valleyColor, int outsideOpacity, int insideOpacity, System.Windows.Media.Color compositeInColor, System.Windows.Media.Color compositeOutColor, bool showPriceLine)
		{
			return indicator.DevTD_VolumeProfile(input, profileType, profileWidthPct, ticksPerRow, showCompositeProfile, compositeWidthPct, profileLineWidth, vAPct, showPeaks, showValleys, peakValleyStrength, insideVAColor, outsideVAColor, vAHLColor, pOCColor, peakColor, valleyColor, outsideOpacity, insideOpacity, compositeInColor, compositeOutColor, showPriceLine);
		}
	}
}

namespace NinjaTrader.NinjaScript.Strategies
{
	public partial class Strategy : NinjaTrader.Gui.NinjaScript.StrategyRenderBase
	{
		public Indicators.DevTD_VolumeProfile DevTD_VolumeProfile(VPProfileType profileType, int profileWidthPct, int ticksPerRow, bool showCompositeProfile, int compositeWidthPct, int profileLineWidth, int vAPct, bool showPeaks, bool showValleys, int peakValleyStrength, System.Windows.Media.Color insideVAColor, System.Windows.Media.Color outsideVAColor, System.Windows.Media.Color vAHLColor, System.Windows.Media.Color pOCColor, System.Windows.Media.Color peakColor, System.Windows.Media.Color valleyColor, int outsideOpacity, int insideOpacity, System.Windows.Media.Color compositeInColor, System.Windows.Media.Color compositeOutColor, bool showPriceLine)
		{
			return indicator.DevTD_VolumeProfile(Input, profileType, profileWidthPct, ticksPerRow, showCompositeProfile, compositeWidthPct, profileLineWidth, vAPct, showPeaks, showValleys, peakValleyStrength, insideVAColor, outsideVAColor, vAHLColor, pOCColor, peakColor, valleyColor, outsideOpacity, insideOpacity, compositeInColor, compositeOutColor, showPriceLine);
		}

		public Indicators.DevTD_VolumeProfile DevTD_VolumeProfile(ISeries<double> input , VPProfileType profileType, int profileWidthPct, int ticksPerRow, bool showCompositeProfile, int compositeWidthPct, int profileLineWidth, int vAPct, bool showPeaks, bool showValleys, int peakValleyStrength, System.Windows.Media.Color insideVAColor, System.Windows.Media.Color outsideVAColor, System.Windows.Media.Color vAHLColor, System.Windows.Media.Color pOCColor, System.Windows.Media.Color peakColor, System.Windows.Media.Color valleyColor, int outsideOpacity, int insideOpacity, System.Windows.Media.Color compositeInColor, System.Windows.Media.Color compositeOutColor, bool showPriceLine)
		{
			return indicator.DevTD_VolumeProfile(input, profileType, profileWidthPct, ticksPerRow, showCompositeProfile, compositeWidthPct, profileLineWidth, vAPct, showPeaks, showValleys, peakValleyStrength, insideVAColor, outsideVAColor, vAHLColor, pOCColor, peakColor, valleyColor, outsideOpacity, insideOpacity, compositeInColor, compositeOutColor, showPriceLine);
		}
	}
}

#endregion
