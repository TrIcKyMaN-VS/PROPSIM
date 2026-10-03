"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getWeeklyReview,
  saveWeeklyReview,
  getPreviousWeeklyReview,
  getDailyJournalsForDates,
  uploadImageFormData,
} from "@/app/actions/journal-actions";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { generateWeeklyPatterns } from "@/app/actions/weekly-review-ai-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WeekPicker } from "@/components/ui/week-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Trash, Save, Loader2, Sparkles, ClipboardCheck, BookOpen, Upload, X, ChevronDown, ChevronUp, AlertCircle, Pencil, Target, CheckCircle2, Circle, ShieldAlert, FileText, Flame, ArrowRight } from "lucide-react";
import {
  getRuleBookEntries,
  createRuleBookEntry,
  applyRuleVerdict,
  updateRuleBookStatus,
  syncRuleBookStats,
} from "@/app/actions/rulebook-actions";
import { usePropStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { fmtPnl } from "@/lib/format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getISOWeekKey, getWeekDates } from "@/lib/date-utils";

const getCurrentWeekKey = () => getISOWeekKey();



function AutoTextarea(props: React.ComponentProps<typeof Textarea>) {
  const [val, setVal] = useState(props.value || '')
  
  useEffect(() => {
    setVal(props.value || '')
  }, [props.value])



  return (
    <Textarea 
      {...props} 
      value={val}
      onChange={(e) => {
        setVal(e.target.value)
        if (props.onChange) props.onChange(e as any)
      }}
      onBlur={(e) => {
        if (props.onBlur) props.onBlur(e)
      }}
      onInput={(e) => {
        e.currentTarget.style.height = 'auto'
        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'
        if (props.onInput) props.onInput(e)
      }}
      className={props.className + " resize-none overflow-hidden min-h-[40px]"}
    />
  )
}

export default function WeeklyReviewPage() {
  const [weekOf, setWeekOf] = useState(getCurrentWeekKey());
  const router = useRouter();
  const rawTrades = usePropStore(s => s.trades);
  const tradePsychology = usePropStore(s => s.tradePsychology);
  const displayTimeMode = usePropStore(s => s.displayTimeMode);
  const pnlDisplayMode = usePropStore(s => s.pnlDisplayMode);
  const activeAccountId = usePropStore(s => s.activeAccountId);

  const allTrades = useMemo(() => {
    if (!activeAccountId) return rawTrades
    return rawTrades.filter(t => t.accountId === activeAccountId)
  }, [rawTrades, activeAccountId]);

  const account = usePropStore(s => s.accounts.find(a => a.id === activeAccountId));
  const accountBalance = account?.rules?.startingBalance ?? 50000;
  const [openTrades, setOpenTrades] = useState<Record<string, boolean>>({});
  const toggleTradeDetail = (id: string) => setOpenTrades(s => ({ ...s, [id]: !s[id] }));
  const [tradeViewImage, setTradeViewImage] = useState<string | null>(null);
  const [tradeImageZoomed, setTradeImageZoomed] = useState(false);

  // Derive Mon–Sun date strings for the selected weekOf key
  const weekDates = useMemo<string[]>(() => {
    return getWeekDates(weekOf);
  }, [weekOf]);

  // Filter all trades to this week, grouped by date
  const weekTradesByDay = useMemo(() => {
    const dateSet = new Set(weekDates);
    const grouped: Record<string, typeof allTrades> = {};
    allTrades.forEach(t => {
      const raw = new Date(Number(t.timestamp));
      const dateKey = displayTimeMode === "Exchange Time"
        ? (() => { const ny = new Date(raw.toLocaleString("en-US", { timeZone: "America/New_York" })); return `${ny.getFullYear()}-${String(ny.getMonth()+1).padStart(2,"0")}-${String(ny.getDate()).padStart(2,"0")}` })()
        : `${raw.getFullYear()}-${String(raw.getMonth()+1).padStart(2,"0")}-${String(raw.getDate()).padStart(2,"0")}`;
      if (!dateSet.has(dateKey)) return;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(t);
    });
    return grouped;
  }, [allTrades, weekDates, displayTimeMode]);

  const defaultPlannedRisk = usePropStore(s => s.defaultPlannedRisk) || 100;

  const weekTotalTrades = Object.values(weekTradesByDay).reduce((n, arr) => n + arr.length, 0);
  const weekTotalPnl = Object.values(weekTradesByDay).reduce((sum, arr) => sum + arr.reduce((s, t) => s + t.pnl, 0), 0);
  const weekTotalNetR = Object.values(weekTradesByDay).reduce((sum, arr) => sum + arr.reduce((s, t) => s + (t.netR ?? (t.pnl / defaultPlannedRisk)), 0), 0);
  const weekWins = Object.values(weekTradesByDay).reduce((n, arr) => n + arr.filter(t => t.pnl > 0).length, 0);
  const weekLosses = Object.values(weekTradesByDay).reduce((n, arr) => n + arr.filter(t => t.pnl <= 0).length, 0);

  const weekTradesList = useMemo(() => {
    return Object.values(weekTradesByDay).flat().sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  }, [weekTradesByDay]);

  const actualWinRatePct = weekTotalTrades > 0 ? (weekWins / weekTotalTrades) * 100 : 0;
  const actualLargestLossR = useMemo(() => {
    const losses = weekTradesList
      .filter(t => t.pnl < 0)
      .map(t => (t.netR ?? (t.pnl / defaultPlannedRisk)));
    if (losses.length === 0) return 0;
    return Math.min(...losses);
  }, [weekTradesList, defaultPlannedRisk]);

  // Discipline Tax — Total R lost specifically on trades that broke rules (PDF Page 11-12)
  const disciplineTaxTrades = useMemo(() => {
    return weekTradesList.filter(t => {
      const psych = t.psychology || tradePsychology.find(p => p.tradeId === t.id);
      const brokeRule = psych?.brokeRules || (t.mistakes && /broke\s+rule|rule\s+break|violated|model\s+broken/i.test(t.mistakes));
      return brokeRule && t.pnl < 0;
    });
  }, [weekTradesList, tradePsychology]);

  const disciplineTaxR = useMemo(() => {
    return disciplineTaxTrades.reduce((sum, t) => sum + (t.netR ?? (t.pnl / defaultPlannedRisk)), 0);
  }, [disciplineTaxTrades, defaultPlannedRisk]);

  const disciplineTaxDollar = useMemo(() => {
    return disciplineTaxTrades.reduce((sum, t) => sum + t.pnl, 0);
  }, [disciplineTaxTrades]);

  // Daily Journals for this week
  const [weekDailyJournals, setWeekDailyJournals] = useState<any[]>([]);

  const gradeColor = (g?: string) => {
    if (!g) return "border-border text-muted-foreground"
    if (g === "A+" || g === "A") return "border-green-500 text-green-400 bg-green-500/10"
    if (g === "B") return "border-blue-500 text-blue-400 bg-blue-500/10"
    if (g === "C") return "border-yellow-500 text-yellow-400 bg-yellow-500/10"
    return "border-red-500 text-red-400 bg-red-500/10"
  }

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Header state
  const [daysTradedCount, setDaysTradedCount] = useState<number | "">("");
  const [netR, setNetR] = useState("");

  // 1. Patterns
  const [repeatedMistakes, setRepeatedMistakes] = useState("");
  const [repeatedWinConditions, setRepeatedWinConditions] = useState("");
  const [emotionalTimingPatterns, setEmotionalTimingPatterns] = useState("");
  const [persistentPatterns, setPersistentPatterns] = useState<string | null>(null);

  // 2. Rules Built
  const [rulesBuilt, setRulesBuilt] = useState<
    { when: string; then: string; from: string }[]
  >([]);
  const [deleteRuleIdx, setDeleteRuleIdx] = useState<number | null>(null);
  const [deleteMissedScreenshotIdx, setDeleteMissedScreenshotIdx] = useState<number | null>(null);

  // 3. Backtest
  const [backtestTradesTaken, setBacktestTradesTaken] = useState<number | "">(
    "",
  );
  const [backtestTradesSkipped, setBacktestTradesSkipped] = useState<
    number | ""
  >("");
  const [backtestWinRate, setBacktestWinRate] = useState("");
  const [backtestNetR, setBacktestNetR] = useState("");
  const [backtestLargestLoss, setBacktestLargestLoss] = useState("");
  const [backtestNotes, setBacktestNotes] = useState("");

  // 4. Comparison
  const [actualNetR, setActualNetR] = useState("");
  const [ruleBasedNetR, setRuleBasedNetR] = useState("");
  const [comparisonDifference, setComparisonDifference] = useState("");
  const [whatDifferenceTellsMe, setWhatDifferenceTellsMe] = useState("");
  const [ruleSavedMost, setRuleSavedMost] = useState("");
  const [ruleFilteredGoodTrade, setRuleFilteredGoodTrade] = useState("");
  const [showSavedRulePicker, setShowSavedRulePicker] = useState(false);
  const [showFilteredRulePicker, setShowFilteredRulePicker] = useState(false);

  // 5. Commitment
  const [oneRuleNotBreak, setOneRuleNotBreak] = useState("");
  const [ruleStatusUpdates, setRuleStatusUpdates] = useState("");

  // Rule Accountability
  type RuleEval = {
    when: string;
    then: string;
    from: string;
    followStatus: "followed" | "broke" | "na" | "";
    helpStatus: "helped" | "no_diff" | "worse" | "";
    verdict: "keep" | "adjust" | "retire" | "";
    adjustmentNote: string;
  };
  const [previousWeekOf, setPreviousWeekOf] = useState<string | null>(null);
  const [previousRules, setPreviousRules] = useState<{ when: string; then: string; from: string }[]>([]);
  const [ruleEvaluations, setRuleEvaluations] = useState<RuleEval[]>([]);

  // Rule Book state
  const [ruleBookEntries, setRuleBookEntries] = useState<any[]>([]);
  // Map from "condition||action" -> ruleId for quick lookup
  const [ruleIdMap, setRuleIdMap] = useState<Record<string, string>>({});
  const [addingToRuleBook, setAddingToRuleBook] = useState<Record<number, boolean>>({});
  const [expandedRuleItems, setExpandedRuleItems] = useState<Record<string, boolean>>({});
  const toggleRuleItem = (id: string) => setExpandedRuleItems(prev => ({ ...prev, [id]: !prev[id] }));

  // Available rules for selection when checking "Filtered by Rule"
  const availableRulesList = useMemo(() => {
    const list: { id: string; label: string; title?: string | null; when: string; then: string; source: "book" | "new"; index: number }[] = [];
    ruleBookEntries
      .filter((r: any) => r.status !== "retired")
      .forEach((r: any, i: number) => {
        list.push({
          id: r.id,
          label: r.title ? `Rule #${i + 1}: ${r.title}` : `Rule #${i + 1}: WHEN ${r.condition} THEN ${r.action}`,
          title: r.title,
          when: r.condition,
          then: r.action,
          source: "book",
          index: i + 1,
        });
      });
    rulesBuilt.forEach((r, i) => {
      if (r.when?.trim() && r.then?.trim()) {
        const sig = r.when.trim() + "||" + r.then.trim();
        if (!ruleIdMap[sig]) {
          list.push({
            id: `new-${i}`,
            label: `New Rule #${i + 1}: WHEN ${r.when} THEN ${r.then}`,
            title: null,
            when: r.when,
            then: r.then,
            source: "new",
            index: i + 1,
          });
        }
      }
    });
    return list;
  }, [ruleBookEntries, rulesBuilt, ruleIdMap]);

  // Missed Trades
  type MissedTrade = {
    id: string;
    instrument: string;
    direction: "long" | "short";
    date: string;
    setupDescription: string;
    estimatedR: string;
    outcome: "win" | "loss" | "breakeven";
    whyMissed: string;          // free text — user types whatever reason
    realtimeValidity?: "yes_100" | "maybe" | "honest_no";
    ruleHelped?: boolean;       // true if rule correctly blocked a trade
    ruleId?: string;            // which rule filtered it
    ruleTitle?: string;         // display label of the rule
    screenshotUrl?: string;     // legacy single uploaded chart screenshot
    screenshots?: string[];     // multiple uploaded chart screenshots
  };
  const [missedTrades, setMissedTrades] = useState<MissedTrade[]>([]);
  const [showMissedForm, setShowMissedForm] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const emptyMissed = (): MissedTrade => ({
    id: "", instrument: "", direction: "long", date: new Date().toISOString().split("T")[0],
    setupDescription: "", estimatedR: "", outcome: "win", whyMissed: "", ruleHelped: false, ruleId: "", ruleTitle: "", screenshots: []
  });
  const [missedDraft, setMissedDraft] = useState<MissedTrade>(emptyMissed());
  const [expandedMissed, setExpandedMissed] = useState<Record<string, boolean>>({});
  const toggleMissed = (id: string) => setExpandedMissed(p => ({ ...p, [id]: !p[id] }));
  const [deleteMissedId, setDeleteMissedId] = useState<string | null>(null);

  // 3. Interactive Backtest Replay States
  const [replaySkippedTradeIds, setReplaySkippedTradeIds] = useState<Record<string, boolean>>({});
  const [replayIncludedMissedIds, setReplayIncludedMissedIds] = useState<Record<string, boolean>>({});
  const [isManualBacktestOverride, setIsManualBacktestOverride] = useState(false);

  // Load saved skipped trade IDs from localStorage
  useEffect(() => {
    if (!weekOf) return;
    try {
      const saved = localStorage.getItem(`propsim_replay_skipped_${weekOf}`);
      if (saved) setReplaySkippedTradeIds(JSON.parse(saved));
      const savedMissed = localStorage.getItem(`propsim_replay_missed_${weekOf}`);
      if (savedMissed) setReplayIncludedMissedIds(JSON.parse(savedMissed));
    } catch {}
  }, [weekOf]);

  const handleToggleReplaySkipped = (tradeId: string, skipped: boolean) => {
    setReplaySkippedTradeIds(prev => {
      const next = { ...prev, [tradeId]: skipped };
      try { localStorage.setItem(`propsim_replay_skipped_${weekOf}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleToggleReplayMissed = (missedId: string) => {
    setReplayIncludedMissedIds(prev => {
      const next = { ...prev, [missedId]: !prev[missedId] };
      try { localStorage.setItem(`propsim_replay_missed_${weekOf}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleKeepAllTrades = () => {
    setReplaySkippedTradeIds({});
    try { localStorage.setItem(`propsim_replay_skipped_${weekOf}`, JSON.stringify({})); } catch {}
  };

  const handleSkipAllLosses = () => {
    const next: Record<string, boolean> = {};
    weekTradesList.filter(t => t.pnl <= 0).forEach(t => { next[t.id] = true; });
    setReplaySkippedTradeIds(next);
    try { localStorage.setItem(`propsim_replay_skipped_${weekOf}`, JSON.stringify(next)); } catch {}
  };

  // Real-time calculation of all 5 metrics
  const replayCalculations = useMemo(() => {
    const takenActual = weekTradesList.filter(t => !replaySkippedTradeIds[t.id]);
    const skippedActual = weekTradesList.filter(t => !!replaySkippedTradeIds[t.id]);
    const includedMissed = missedTrades.filter(m => !!replayIncludedMissedIds[m.id]);

    const takenCount = takenActual.length + includedMissed.length;
    const skippedCount = skippedActual.length;

    const takenWins = takenActual.filter(t => t.pnl > 0).length + includedMissed.filter(m => m.outcome === "win").length;
    const winRatePct = takenCount > 0 ? (takenWins / takenCount) * 100 : 0;
    const winRateStr = takenCount > 0 ? `${winRatePct.toFixed(0)}%` : "0%";

    const actualRSum = takenActual.reduce((acc, t) => acc + (t.netR ?? (t.pnl / defaultPlannedRisk)), 0);
    const missedRSum = includedMissed.reduce((acc, m) => {
      const parsed = parseFloat(m.estimatedR);
      return acc + (isNaN(parsed) ? 0 : parsed);
    }, 0);
    const totalR = actualRSum + missedRSum;
    const netRStr = `${totalR >= 0 ? "+" : ""}${totalR.toFixed(1)}R`;

    const actualLossesR = takenActual
      .filter(t => t.pnl < 0)
      .map(t => (t.netR ?? (t.pnl / defaultPlannedRisk)));
    const missedLossesR = includedMissed
      .filter(m => m.outcome === "loss")
      .map(m => {
        const parsed = parseFloat(m.estimatedR);
        return isNaN(parsed) ? -1 : (parsed > 0 ? -parsed : parsed);
      });
    const allLossesR = [...actualLossesR, ...missedLossesR];
    const worstLossR = allLossesR.length > 0 ? Math.min(...allLossesR) : 0;
    const largestLossStr = worstLossR !== 0 ? `${worstLossR.toFixed(1)}R` : "0R";

    return {
      takenCount,
      skippedCount,
      winRateStr,
      winRatePct,
      totalR,
      netRStr,
      worstLossR,
      largestLossStr,
      takenActual,
      skippedActual,
      includedMissed,
    };
  }, [weekTradesList, replaySkippedTradeIds, missedTrades, replayIncludedMissedIds, defaultPlannedRisk]);

  // Sync live calculations into state for saving
  useEffect(() => {
    if (!isManualBacktestOverride && weekTradesList.length > 0) {
      setBacktestTradesTaken(replayCalculations.takenCount);
      setBacktestTradesSkipped(replayCalculations.skippedCount);
      setBacktestWinRate(replayCalculations.winRateStr);
      setBacktestNetR(replayCalculations.netRStr);
      setBacktestLargestLoss(replayCalculations.largestLossStr);
    }
  }, [replayCalculations, isManualBacktestOverride, weekTradesList.length]);

  const renderMissedForm = () => (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={missedDraft.date || ""}
                      onChange={e => setMissedDraft(d => ({ ...d, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Instrument</Label>
                    <Input
                      placeholder="NQ, ES..."
                      value={missedDraft.instrument}
                      onChange={e => setMissedDraft(d => ({ ...d, instrument: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Direction</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={missedDraft.direction}
                      onChange={e => setMissedDraft(d => ({ ...d, direction: e.target.value as "long" | "short" }))}
                    >
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Outcome</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={missedDraft.outcome}
                      onChange={e => setMissedDraft(d => ({ ...d, outcome: e.target.value as "win" | "loss" | "breakeven" }))}
                    >
                      <option value="win">Win</option>
                      <option value="loss">Loss</option>
                      <option value="breakeven">Breakeven</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Estimated R</Label>
                    <Input
                      placeholder="+2R, -1R..."
                      value={missedDraft.estimatedR}
                      onChange={e => setMissedDraft(d => ({ ...d, estimatedR: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Why did you miss it? <span className="text-muted-foreground">(free text &mdash; be honest)</span></Label>
                  <AutoTextarea
                    placeholder="e.g. Wasn't watching, was in a revenge trade, fear after 2 losses, rule blocked it, order didn't fill..."
                    value={missedDraft.whyMissed}
                    onChange={e => setMissedDraft(d => ({ ...d, whyMissed: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Setup description <span className="text-muted-foreground">(optional)</span></Label>
                  <AutoTextarea
                    placeholder="e.g. Clean breakout retest at previous day HOD with delta confirmation..."
                    value={missedDraft.setupDescription}
                    onChange={e => setMissedDraft(d => ({ ...d, setupDescription: e.target.value }))}
                  />
                </div>

                <div className={cn(
                  "rounded-xl border p-3.5 transition-all space-y-3",
                  missedDraft.ruleHelped
                    ? "border-emerald-500/40 bg-emerald-500/[0.04] shadow-sm"
                    : "border-border/60 bg-muted/10 hover:border-border"
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!missedDraft.ruleHelped}
                        onChange={e => {
                          const checked = e.target.checked;
                          setMissedDraft(d => ({
                            ...d,
                            ruleHelped: checked,
                            ruleId: checked ? d.ruleId : "",
                            ruleTitle: checked ? d.ruleTitle : "",
                          }));
                        }}
                        className="accent-emerald-500 h-4 w-4 rounded cursor-pointer"
                      />
                      <span className="text-sm font-semibold flex items-center gap-1.5">
                        <span>🛡️ Filtered by Rule</span>
                        <span className="text-xs text-muted-foreground font-normal hidden sm:inline">
                          &mdash; a trading rule kept you out of this setup
                        </span>
                      </span>
                    </label>

                    {missedDraft.ruleHelped && missedDraft.ruleId && (
                      <button
                        type="button"
                        onClick={() => setMissedDraft(d => ({ ...d, ruleId: "", ruleTitle: "" }))}
                        className="text-[11px] text-muted-foreground hover:text-destructive transition-colors font-medium cursor-pointer"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>

                  {missedDraft.ruleHelped && (
                    <div className="pt-2 border-t border-border/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-emerald-400">
                          Which rule prevented this trade?
                        </Label>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {availableRulesList.length} rule{availableRulesList.length !== 1 ? "s" : ""} available
                        </span>
                      </div>

                      {availableRulesList.length === 0 ? (
                        <div className="text-center py-4 px-3 border border-dashed border-border/60 rounded-lg text-xs text-muted-foreground bg-background/40">
                          No rules found. Add rules in Section 2 above or in the Master Rule Book.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {availableRulesList.map((r) => {
                            const isSelected = missedDraft.ruleId === r.id;
                            return (
                              <div
                                key={r.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setMissedDraft(d => ({ ...d, ruleId: "", ruleTitle: "" }));
                                  } else {
                                    setMissedDraft(d => ({ ...d, ruleId: r.id, ruleTitle: r.label }));
                                  }
                                }}
                                className={cn(
                                  "p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 select-none",
                                  isSelected
                                    ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/50"
                                    : "border-border/50 bg-background/60 hover:bg-background hover:border-border/80"
                                )}
                              >
                                <div className="pt-0.5 shrink-0">
                                  {isSelected ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-muted-foreground/40" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className={cn(
                                        "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0",
                                        isSelected
                                          ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                                          : "bg-muted text-muted-foreground border border-border/40"
                                      )}>
                                        {r.source === "new" ? `New Rule #${r.index}` : `Rule #${r.index}`}
                                      </span>
                                      {r.title && (
                                        <span className="text-xs font-bold text-foreground truncate">
                                          {r.title}
                                        </span>
                                      )}
                                    </div>
                                    {isSelected && (
                                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                                        ✓ Selected
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs leading-relaxed break-words">
                                    <span className="font-bold text-amber-400 mr-1.5">WHEN</span>
                                    <span className="text-foreground/90">{r.when}</span>
                                  </div>

                                  <div className="text-xs leading-relaxed break-words">
                                    <span className="font-bold text-emerald-400 mr-1.5">THEN</span>
                                    <span className="text-foreground/90">{r.then}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Chart screenshot upload */}
                <div className="space-y-1">
                  <Label className="text-xs">Chart Screenshots <span className="text-muted-foreground">(optional)</span></Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {missedDraft.screenshots?.map((url, idx) => (
                      <div key={idx} className="relative group w-full aspect-video rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer"
                        onClick={() => { setViewImage(url); setIsZoomed(false); }}
                      >
                        <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setDeleteMissedScreenshotIdx(idx);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-destructive text-white rounded opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border/40 rounded-xl py-6 text-center cursor-pointer hover:bg-muted/20 transition-colors group aspect-video">
                      {uploadingImg ? (
                        <><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Uploading...</span></>
                      ) : (
                        <><Upload className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" /><span className="text-xs text-muted-foreground">Click to upload images</span></>
                      )}
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleMissedImageUpload} disabled={uploadingImg} />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelMissedForm}>Cancel</Button>
                  <Button size="sm" onClick={saveMissedTrade} disabled={!missedDraft.instrument || !missedDraft.whyMissed || uploadingImg}>
                    {uploadingImg ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Uploading...</> : editingMissedId ? "Save Changes" : "Add Missed Trade"}
                  </Button>
                </div>
              </div>
  );
  const [editingMissedId, setEditingMissedId] = useState<string | null>(null);

  const startEditMissed = (t: MissedTrade, e: React.MouseEvent) => {
    e.stopPropagation();
    setMissedDraft(t);
    setEditingMissedId(t.id);
    setShowMissedForm(true);
    // Auto-expand the draft form into view by scrolling or just opening it
  };

  const cancelMissedForm = () => {
    setShowMissedForm(false);
    setMissedDraft(emptyMissed());
    setEditingMissedId(null);
  };

  const handleMissedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImg(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("prefix", "mt_" + weekOf);
        const url = await uploadImageFormData(formData);
        newUrls.push(url);
      }
      setMissedDraft(d => {
        const existing = [...(d.screenshots || []), ...(d.screenshotUrl ? [d.screenshotUrl] : [])];
        return { ...d, screenshots: [...existing, ...newUrls], screenshotUrl: undefined };
      });
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploadingImg(false);
    }
    e.target.value = "";
  };

  const saveMissedTrade = () => {
    if (!missedDraft.instrument || !missedDraft.whyMissed) return;
    if (editingMissedId) {
      setMissedTrades(prev => prev.map(t => t.id === editingMissedId ? missedDraft : t));
    } else {
      setMissedTrades(prev => [...prev, { ...missedDraft, id: Math.random().toString(36).slice(2) }]);
    }
    cancelMissedForm();
  };
  const removeMissedTrade = (id: string) => setMissedTrades(prev => prev.filter(t => t.id !== id));

  const updateEval = (idx: number, patch: Partial<RuleEval>) => {
    setRuleEvaluations(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...patch };
      // Clear helpStatus if user un-follows
      if (patch.followStatus && patch.followStatus !== "followed") {
        updated[idx].helpStatus = "";
      }
      // Clear adjustment fields when verdict changes away from adjust
      if (patch.verdict && patch.verdict !== "adjust") {
        updated[idx].adjustmentNote = "";
      }
      return updated;
    });
  };



  const loadRuleBook = async () => {
    try {
      const entries = await getRuleBookEntries();
      setRuleBookEntries(entries);
      const map: Record<string, string> = {};
      for (const e of entries) {
        if (e.status !== "retired") {
          map[e.condition + "||" + e.action] = e.id;
        }
      }
      setRuleIdMap(map);
      return entries;
    } catch {
      return [];
    }
  };

  const handleAddToRuleBook = async (idx: number) => {
    const rule = rulesBuilt[idx];
    if (!rule.when || !rule.then) return toast.error("Rule needs WHEN and THEN text first");
    setAddingToRuleBook(prev => ({ ...prev, [idx]: true }));
    try {
      const res = await createRuleBookEntry({
        condition: rule.when,
        action: rule.then,
        fromMistake: rule.from || undefined,
        weekAdded: weekOf,
      });
      if (res.isDuplicate) {
        toast.warning("Already in Rule Book");
      } else {
        toast.success("Added to Rule Book");
        await loadRuleBook();
      }
    } catch {
      toast.error("Failed to add to Rule Book");
    } finally {
      setAddingToRuleBook(prev => ({ ...prev, [idx]: false }));
    }
  };

  const handleUpdateRuleStatus = async (ruleId: string, newStatus: string) => {
    try {
      await updateRuleBookStatus(ruleId, newStatus);
      setRuleBookEntries(prev => prev.map(r => r.id === ruleId ? { ...r, status: newStatus } : r));
      toast.success(`Rule status updated to ${newStatus.toUpperCase()}`);
    } catch {
      toast.error("Failed to update rule status");
    }
  };

const cleanUnicodeEscapes = (str: string) => {
  if (!str) return str;
  return str
    .replace(/\\u2019/g, "'")
    .replace(/\\u2018/g, "'")
    .replace(/\\u201c/g, '"')
    .replace(/\\u201d/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
};

  const handleAutoFillPatterns = async () => {
    try {
      setIsGenerating(true)
      const res = await generateWeeklyPatterns(weekOf)
      setRepeatedMistakes(cleanUnicodeEscapes(res.repeatedMistakes || ""))
      setRepeatedWinConditions(cleanUnicodeEscapes(res.repeatedWinConditions || ""))
      setEmotionalTimingPatterns(cleanUnicodeEscapes(res.emotionalTimingPatterns || ""))
      // persistentPatterns is null when no prior week history exists (section hidden)
      setPersistentPatterns(res.persistentPatterns !== undefined ? (res.persistentPatterns !== null ? cleanUnicodeEscapes(res.persistentPatterns || "") : null) : null)
      toast.success("Successfully summarized daily journals!")
    } catch (err: any) {
      toast.error(err.message || "Failed to generate patterns")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleConvertPatternToRule = (patternText: string) => {
    // Clean leading bullets, dashes, icons, and label prefix
    const clean = patternText
      .replace(/^[-*•⚠️\s]+Persisting:\s*/i, "")
      .replace(/^[-*•⚠️\s]+/i, "")
      .trim();

    let whenClause = "Valid setup confirms with candle close at key level";
    let thenClause = "Execute immediately according to plan without second-guessing";

    if (/hesitat/i.test(clean)) {
      whenClause = "Valid setup meets all criteria on candle close at key level";
      thenClause = "Enter market order within 10 seconds — do not wait for another confirmation candle";
    } else if (/stop|trail/i.test(clean)) {
      whenClause = "Trade moves into profit before reaching planned take profit";
      thenClause = "Do not trail stop loss manually until 1R profit or structural pivot forms";
    } else if (/rush|early|before.*confirm/i.test(clean)) {
      whenClause = "Price approaches key level without complete candle close confirmation";
      thenClause = "Wait for full candle close confirmation before placing entry order";
    } else if (/overtrad|revenge|chase|spiral/i.test(clean)) {
      whenClause = "A trade hits stop loss or a valid setup was missed";
      thenClause = "Take a mandatory 15-minute screen pause before considering next trade";
    } else if (/absorp|aggress|order\s*flow|delta/i.test(clean)) {
      whenClause = "Delta Reload setup forms with absorption or aggression";
      thenClause = "Verify candle close at delta level before placing entry";
    }

    const newRule = {
      when: whenClause,
      then: thenClause,
      from: `Targeting persistent trap: "${clean.slice(0, 55)}..."`,
    };

    setRulesBuilt(prev => [...prev, newRule]);
    toast.success("Rule drafted in Section 2 targeting this persistent pattern!");

    setTimeout(() => {
      const el = document.getElementById("section-2-rules");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };
  

  useEffect(() => {

    async function loadData() {
      if (!weekOf) return;
      setLoading(true);
      // Load Rule Book entries to know which rules are already tracked
      const entries = await loadRuleBook();
      try {
        const data = await getWeeklyReview(weekOf);
        if (data) {
          setDaysTradedCount(data.daysTradedCount ?? "");
          setNetR(data.netR ?? "");
          setRepeatedMistakes(cleanUnicodeEscapes(data.repeatedMistakes ?? ""));
          setRepeatedWinConditions(cleanUnicodeEscapes(data.repeatedWinConditions ?? ""));
          setEmotionalTimingPatterns(cleanUnicodeEscapes(data.emotionalTimingPatterns ?? ""));

          if (data.rulesBuilt) {
            try {
              const parsed = JSON.parse(data.rulesBuilt);
              setRulesBuilt(parsed);
            } catch (e) {
              setRulesBuilt([]);
            }
          } else {
            // Auto-populate from Rule Book for this week
            const thisWeekRules = (entries || [])
              .filter((r: any) => r.weekAdded === weekOf && r.status !== "retired")
              .map((r: any) => ({
                when: r.condition,
                then: r.action,
                from: r.fromMistake || "",
              }));
            setRulesBuilt(thisWeekRules);
          }

          setBacktestTradesTaken(data.backtestTradesTaken ?? "");
          setBacktestTradesSkipped(data.backtestTradesSkipped ?? "");
          setBacktestWinRate(data.backtestWinRate ?? "");
          setBacktestNetR(data.backtestNetR ?? "");
          setBacktestLargestLoss(data.backtestLargestLoss ?? "");
          setBacktestNotes(data.backtestNotes ?? "");

          setActualNetR(data.actualNetR ?? "");
          setRuleBasedNetR(data.ruleBasedNetR ?? "");
          setComparisonDifference(data.comparisonDifference ?? "");
          setWhatDifferenceTellsMe(data.whatDifferenceTellsMe ?? "");
          setRuleSavedMost(data.ruleSavedMost ?? "");
          setRuleFilteredGoodTrade(data.ruleFilteredGoodTrade ?? "");

          setOneRuleNotBreak(data.oneRuleNotBreak ?? "");
          setRuleStatusUpdates(data.ruleStatusUpdates ?? "");

          // Load missed trades from Weekly Review
          let weeklyMissed: MissedTrade[] = [];
          if ((data as any).missedTrades) {
            try {
              const parsed = JSON.parse((data as any).missedTrades) as MissedTrade[];
              weeklyMissed = parsed.map(t => ({
                ...t,
                screenshots: t.screenshots || (t.screenshotUrl ? [t.screenshotUrl] : [])
              }));
            } catch { weeklyMissed = []; }
          }

          // Auto-pull daily missed setups and daily journals of this week
          try {
            const dailyJournals = await getDailyJournalsForDates(weekDates);
            setWeekDailyJournals(dailyJournals || []);
            const pulledDailyMissed: MissedTrade[] = [];
            dailyJournals.forEach(dj => {
              if (dj.missedTrades) {
                try {
                  const parsedDaily = JSON.parse(dj.missedTrades);
                  if (Array.isArray(parsedDaily)) {
                    parsedDaily.forEach((d: any) => {
                      const exists = weeklyMissed.some(wm => wm.id === d.id || (wm.date === d.date && wm.setupDescription === d.setup));
                      if (!exists) {
                        pulledDailyMissed.push({
                          id: d.id || `daily_${d.date}_${Date.now()}`,
                          instrument: d.setup || "NQ",
                          direction: d.direction || "long",
                          date: d.date || dj.date,
                          setupDescription: d.setup || "",
                          estimatedR: d.potentialR || "1",
                          outcome: d.outcome || "win",
                          whyMissed: d.reason || "",
                          screenshots: d.screenshots || [],
                        });
                      }
                    });
                  }
                } catch {}
              }
            });
            setMissedTrades([...weeklyMissed, ...pulledDailyMissed]);
          } catch {
            setMissedTrades(weeklyMissed);
          }
        } else {
          // Reset form for fresh week
          setDaysTradedCount("");
          setNetR("");
          setRepeatedMistakes("");
          setRepeatedWinConditions("");
          setEmotionalTimingPatterns("");
          
          // Auto-populate from Rule Book for this week if any
          const thisWeekRules = (entries || [])
            .filter((r: any) => r.weekAdded === weekOf && r.status !== "retired")
            .map((r: any) => ({
              when: r.condition,
              then: r.action,
              from: r.fromMistake || "",
            }));
          setRulesBuilt(thisWeekRules);

          setBacktestTradesTaken("");
          setBacktestTradesSkipped("");
          setBacktestWinRate("");
          setBacktestNetR("");
          setBacktestLargestLoss("");
          setBacktestNotes("");
          setActualNetR("");
          setRuleBasedNetR("");
          setComparisonDifference("");
          setWhatDifferenceTellsMe("");
          setRuleSavedMost("");
          setRuleFilteredGoodTrade("");
          setOneRuleNotBreak("");
          setRuleStatusUpdates("");

          // Auto-pull daily missed setups and daily journals for fresh week
          try {
            const dailyJournals = await getDailyJournalsForDates(weekDates);
            setWeekDailyJournals(dailyJournals || []);
            const pulledDailyMissed: MissedTrade[] = [];
            dailyJournals.forEach(dj => {
              if (dj.missedTrades) {
                try {
                  const parsedDaily = JSON.parse(dj.missedTrades);
                  if (Array.isArray(parsedDaily)) {
                    parsedDaily.forEach((d: any) => {
                      pulledDailyMissed.push({
                        id: d.id || `daily_${d.date}_${Date.now()}`,
                        instrument: d.setup || "NQ",
                        direction: d.direction || "long",
                        date: d.date || dj.date,
                        setupDescription: d.setup || "",
                        estimatedR: d.potentialR || "1",
                        outcome: d.outcome || "win",
                        whyMissed: d.reason || "",
                        screenshots: d.screenshots || [],
                      });
                    });
                  }
                } catch {}
              }
            });
            setMissedTrades(pulledDailyMissed);
          } catch {
            setMissedTrades([]);
          }
        }

        // Load running rules for Rule Accountability (from master RuleBook + previous reviews)
        try {
          const prev = await getPreviousWeeklyReview(weekOf);
          const rulesToEvaluate = (prev && prev.rules && prev.rules.length > 0)
            ? prev.rules
            : (entries || [])
                .filter((r: any) => r.status !== "retired")
                .map((r: any) => ({
                  when: r.condition,
                  then: r.action,
                  from: r.fromMistake || (r.weekAdded ? `Week ${r.weekAdded}` : "Rule Book"),
                  status: r.status,
                  id: r.id
                }));

          setPreviousWeekOf(prev?.previousWeekOf || "Master Rule Book");
          setPreviousRules(rulesToEvaluate);

          // Reconcile saved evaluations with current running rules
          let savedEvals: any[] = [];
          if ((data as any)?.ruleEvaluations) {
            try { savedEvals = JSON.parse((data as any).ruleEvaluations); } catch {}
          }
          const savedMap = new Map<string, any>();
          for (const ev of savedEvals) {
            savedMap.set(ev.when + "||" + ev.then, ev);
          }

          setRuleEvaluations(rulesToEvaluate.map((r: any) => {
            const existing = savedMap.get(r.when + "||" + r.then);
            if (existing) return existing;
            return {
              when: r.when,
              then: r.then,
              from: r.from,
              followStatus: "",
              helpStatus: "",
              verdict: "",
              adjustmentNote: "",
            };
          }));
        } catch {}
      } catch (err) {
        toast.error("Failed to load weekly review");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [weekOf]);

  const handleSave = async () => {
    if (!weekOf) {
      toast.error("Week is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        daysTradedCount:
          daysTradedCount === "" ? null : Number(daysTradedCount),
        netR: netR || null,
        repeatedMistakes: repeatedMistakes || null,
        repeatedWinConditions: repeatedWinConditions || null,
        emotionalTimingPatterns: emotionalTimingPatterns || null,
        rulesBuilt: rulesBuilt.length > 0 ? JSON.stringify(rulesBuilt) : null,
        backtestTradesTaken:
          backtestTradesTaken === "" ? null : Number(backtestTradesTaken),
        backtestTradesSkipped:
          backtestTradesSkipped === "" ? null : Number(backtestTradesSkipped),
        backtestWinRate: backtestWinRate || null,
        backtestNetR: backtestNetR || null,
        backtestLargestLoss: backtestLargestLoss || null,
        backtestNotes: backtestNotes || null,
        actualNetR: actualNetR || null,
        ruleBasedNetR: ruleBasedNetR || null,
        comparisonDifference: comparisonDifference || null,
        whatDifferenceTellsMe: whatDifferenceTellsMe || null,
        ruleSavedMost: ruleSavedMost || null,
        ruleFilteredGoodTrade: ruleFilteredGoodTrade || null,
        oneRuleNotBreak: oneRuleNotBreak || null,
        ruleStatusUpdates: ruleStatusUpdates || null,
        ruleEvaluations: (() => {
          // Auto-credit rule evaluations for rules that filtered missed trades
          const evals = [...ruleEvaluations];
          missedTrades.forEach(mt => {
            if (mt.ruleHelped && mt.ruleId) {
              const ruleObj = ruleBookEntries.find(r => r.id === mt.ruleId);
              if (ruleObj) {
                const existingIdx = evals.findIndex(e => e.when === ruleObj.condition && e.then === ruleObj.action);
                if (existingIdx === -1) {
                  evals.push({
                    when: ruleObj.condition,
                    then: ruleObj.action,
                    from: ruleObj.fromMistake || "",
                    followStatus: "followed",
                    helpStatus: mt.outcome === "loss" ? "helped" : "",
                    verdict: "",
                    adjustmentNote: "",
                  });
                } else {
                  if (!evals[existingIdx].followStatus) {
                    evals[existingIdx].followStatus = "followed";
                  }
                  if (!evals[existingIdx].helpStatus && mt.outcome === "loss") {
                    evals[existingIdx].helpStatus = "helped";
                  }
                }
              }
            }
          });
          return evals.length > 0 ? JSON.stringify(evals) : null;
        })(),
        missedTrades: missedTrades.length > 0 ? JSON.stringify(missedTrades) : null,
      };

      // Auto-add any new rules in rulesBuilt to Rule Book if not already there
      for (let i = 0; i < rulesBuilt.length; i++) {
        const r = rulesBuilt[i];
        if (r.when?.trim() && r.then?.trim() && !ruleIdMap[r.when + "||" + r.then]) {
          try {
            await createRuleBookEntry({
              condition: r.when.trim(),
              action: r.then.trim(),
              fromMistake: r.from?.trim() || undefined,
              weekAdded: weekOf,
            });
          } catch {}
        }
      }

      await saveWeeklyReview(weekOf, payload);

      // Sync rule verdicts to Rule Book
      const verdictPromises = ruleEvaluations
        .filter(ev => ev.verdict && (ruleIdMap[ev.when + "||" + ev.then]))
        .map(ev => {
          const ruleId = ruleIdMap[ev.when + "||" + ev.then];
          return applyRuleVerdict({
            ruleId,
            followStatus: ev.followStatus,
            helpStatus: ev.helpStatus,
            verdict: ev.verdict,
            adjustmentNote: ev.adjustmentNote,
          });
        });

      if (verdictPromises.length > 0) {
        await Promise.allSettled(verdictPromises);
      }

      // Sync and accurately recalculate total reviewCount, followCount, helpCount across all reviews
      try {
        await syncRuleBookStats();
      } catch (err) {
        console.error("Failed to sync rulebook stats:", err);
      }
      await loadRuleBook();

      toast.success("Weekly review saved successfully!");
    } catch (err) {
      toast.error("Failed to save weekly review");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = () => {
    setRulesBuilt([...rulesBuilt, { when: "", then: "", from: "" }]);
  };

  const updateRule = (
    index: number,
    field: keyof (typeof rulesBuilt)[0],
    value: string,
  ) => {
    const updated = [...rulesBuilt];
    updated[index][field] = value;
    setRulesBuilt(updated);
  };

  const removeRule = (index: number) => {
    const updated = [...rulesBuilt];
    updated.splice(index, 1);
    setRulesBuilt(updated);
  };

  const [showMasterRulesRef, setShowMasterRulesRef] = useState(false);

  // New rules built from this week (specifically being backtested in Section 3)
  const newRulesForBacktest = useMemo(() => {
    return rulesBuilt.filter((r) => r.when?.trim() && r.then?.trim());
  }, [rulesBuilt]);

  // Master running rules (from Rule Book)
  const masterRunningRules = useMemo(() => {
    return ruleBookEntries.filter((r: any) => r.status !== "retired");
  }, [ruleBookEntries]);

  // Rules that helped prevent losses in missed setups this week
  const lossSavingRules = useMemo(() => {
    const map = new Map<string, { ruleName: string; savedR: number }>();
    missedTrades.forEach(t => {
      if (t.ruleHelped && t.outcome === "loss") {
        const ruleLabel = t.ruleTitle ? (t.ruleTitle.includes(":") ? t.ruleTitle.split(":")[0] : t.ruleTitle) : "Rule";
        const key = t.ruleId || ruleLabel;
        const rVal = Math.abs(parseFloat(t.estimatedR) || 1);
        const existing = map.get(key) || { ruleName: ruleLabel, savedR: 0 };
        existing.savedR += rVal;
        map.set(key, existing);
      }
    });
    return Array.from(map.values());
  }, [missedTrades]);

  // Rules that filtered winning trades in missed setups this week
  const winFilteringRules = useMemo(() => {
    const map = new Map<string, { ruleName: string; missedR: number }>();
    missedTrades.forEach(t => {
      if (t.ruleHelped && t.outcome === "win") {
        const ruleLabel = t.ruleTitle ? (t.ruleTitle.includes(":") ? t.ruleTitle.split(":")[0] : t.ruleTitle) : "Rule";
        const key = t.ruleId || ruleLabel;
        const rVal = parseFloat(t.estimatedR) || 1;
        const existing = map.get(key) || { ruleName: ruleLabel, missedR: 0 };
        existing.missedR += rVal;
        map.set(key, existing);
      }
    });
    return Array.from(map.values());
  }, [missedTrades]);

  return (
    <>
      {/* Image Zoom Lightbox */}
      <Dialog open={!!viewImage} onOpenChange={(o) => { if (!o) { setIsZoomed(false); setViewImage(null); } }}>
        <DialogContent className="max-w-[95vw] w-fit p-1 bg-black/90 border-0 flex items-center justify-center z-[100]">
          {viewImage && (
            <img
              src={viewImage}
              alt="Chart screenshot"
              className={isZoomed ? "max-w-none max-h-none cursor-zoom-out" : "max-w-full max-h-[82vh] object-contain rounded-lg cursor-zoom-in"}
              onClick={e => { e.stopPropagation(); setIsZoomed(!isZoomed); }}
            />
          )}
        </DialogContent>
      </Dialog>

    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* HEADER */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Weekly Review</CardTitle>
            <CardDescription>
              End of week performance and reflection
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Review
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Week Of</Label>
              <WeekPicker value={weekOf} onChange={setWeekOf} />
            </div>
            <div className="space-y-2">
              <Label>Days Traded</Label>
              <Input
                type="number"
                value={daysTradedCount}
                onChange={(e) =>
                  setDaysTradedCount(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                placeholder="e.g. 5"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Net R</Label>
                <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-bold uppercase">
                  AUTO
                </Badge>
              </div>
              <Input
                value={`${weekTotalNetR > 0 ? "+" : ""}${weekTotalNetR.toFixed(2)}R`}
                readOnly
                className="bg-muted/50 cursor-not-allowed font-mono font-bold text-cyan-400"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1 text-xs">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  Discipline Tax
                </Label>
                <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold uppercase">
                  PDF P.11
                </Badge>
              </div>
              <Input
                value={disciplineTaxR < 0 ? `${disciplineTaxR.toFixed(2)}R (${fmtPnl(disciplineTaxDollar, pnlDisplayMode, accountBalance)})` : "0.00R (Clean 🛡️)"}
                readOnly
                title="Total R lost on trades that broke rules (Hayeder Trading Journal PDF p.11)"
                className={cn(
                  "cursor-not-allowed font-mono font-bold text-xs",
                  disciplineTaxR < 0 ? "text-rose-400 border-rose-500/40 bg-rose-500/5" : "text-emerald-400 border-emerald-500/40 bg-emerald-500/5"
                )}
              />
            </div>
          </div>

          {/* Review Protocol Banner */}
          <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-bold text-muted-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-primary" /> Review Protocol:
            </span>
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold flex items-center gap-1">
                1. Read Daily Digest &amp; Trade Log
              </span>
              <span className="text-muted-foreground/60">➔</span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold flex items-center gap-1">
                2. AI Pattern &amp; Persistence Audit
              </span>
              <span className="text-muted-foreground/60">➔</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                3. Convert Traps to Rules &amp; Backtest
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Zoom Lightbox for Trades */}
      <Dialog open={!!tradeViewImage} onOpenChange={(o) => { if (!o) { setTradeImageZoomed(false); setTradeViewImage(null); } }}>
        <DialogContent className="max-w-[95vw] w-fit p-1 bg-black/90 border-0 flex items-center justify-center z-[100]">
          {tradeViewImage && (
            <img
              src={tradeViewImage}
              alt="Chart screenshot"
              className={tradeImageZoomed ? "max-w-none max-h-none cursor-zoom-out" : "max-w-full max-h-[82vh] object-contain rounded-lg cursor-zoom-in"}
              onClick={e => { e.stopPropagation(); setTradeImageZoomed(!tradeImageZoomed); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* WEEK'S DAILY JOURNALS DIGEST */}
      <details className="group">
        <summary className="cursor-pointer select-none list-none flex items-center justify-between p-4 rounded-xl border bg-card text-card-foreground shadow-sm mb-4 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Week&apos;s Daily Journals Digest
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-2">
              <Badge variant="secondary" className="font-mono">
                {weekDailyJournals.length} written
              </Badge>
              <span>•</span>
              <span className="text-xs">
                {weekDailyJournals.filter(j => j.isRedDay).length > 0 ? (
                  <span className="text-rose-400 font-bold">{weekDailyJournals.filter(j => j.isRedDay).length} Red Day(s)</span>
                ) : (
                  <span className="text-emerald-400">0 Red Days</span>
                )}
              </span>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-open:-rotate-180" />
        </summary>

        <div className="space-y-4 pt-1 pb-6 px-1">
          {weekDates.map(date => {
            const dj = weekDailyJournals.find(j => j.date === date);
            const dateObj = new Date(date + "T12:00:00");
            const dayName = dateObj.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' });

            if (!dj) {
              return (
                <div key={date} className="p-3.5 rounded-xl border border-dashed border-border/60 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground/80">{dayName}</span>
                    <span>— No daily journal logged</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary hover:underline px-2"
                    onClick={() => router.push(`/app/daily?date=${date}`)}
                  >
                    + Write Journal
                  </Button>
                </div>
              );
            }

            return (
              <div key={date} className={cn("p-4 rounded-xl border transition-all space-y-3", dj.isRedDay ? "border-rose-500/30 bg-rose-500/5" : "border-border/60 bg-card/60")}>
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border/40 pb-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-sm tracking-tight">{dayName}</span>
                    {dj.isRedDay && (
                      <Badge variant="destructive" className="text-[10px] uppercase font-bold px-2 py-0">
                        🔴 Red Day
                      </Badge>
                    )}
                    {dj.stateCheck !== null && dj.stateCheck !== undefined && (
                      <Badge variant="outline" className="text-[10px] font-mono border-border/80">
                        Mental State: {dj.stateCheck}/10
                      </Badge>
                    )}
                    {dj.rulesBroken && (
                      <Badge variant="outline" className="text-[10px] font-mono text-rose-400 border-rose-500/30 bg-rose-500/10">
                        Broken: {dj.rulesBroken}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground text-[11px]">
                      Plan Acc: <strong className="text-foreground">{dj.planAccuracy ?? "—"}/10</strong> | Adh: <strong className="text-foreground">{dj.planAdherence ?? "—"}/10</strong>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[11px] text-primary hover:underline px-1.5 flex items-center gap-1"
                      onClick={() => router.push(`/app/daily?date=${date}`)}
                    >
                      View Day <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Journal Content Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
                  {/* Pre-Market Prep */}
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Pre-Market Context &amp; Key Levels
                    </div>
                    <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-3">
                      {dj.htfContext || dj.keyLevels ? `${dj.htfContext || ''} ${dj.keyLevels ? ' | ' + dj.keyLevels : ''}` : <span className="italic text-muted-foreground/60">No context logged</span>}
                    </p>
                  </div>

                  {/* Post-Session Reflection */}
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Post-Session Thought Process
                    </div>
                    <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-3">
                      {dj.overallThoughtProcess || <span className="italic text-muted-foreground/60">No reflection notes</span>}
                    </p>
                    {dj.isRedDay && dj.redCorrectiveAction && (
                      <p className="text-[11px] text-rose-300 font-semibold pt-1 border-t border-rose-500/20">
                        Action: {dj.redCorrectiveAction}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </details>

      {/* WEEK'S TRADE LOG */}
      <details className="group">
        <summary className="cursor-pointer select-none list-none flex items-center justify-between p-4 rounded-xl border bg-card text-card-foreground shadow-sm mb-6 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              Week's Trade Log
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-2">
              <Badge variant="secondary" className="font-mono">{weekTotalTrades} trades</Badge>
              <span>•</span>
              <span className={weekTotalPnl >= 0 ? "text-success font-bold" : "text-destructive font-bold"}>
                {fmtPnl(weekTotalPnl, pnlDisplayMode, accountBalance, { sign: true })}
              </span>
              <span>•</span>
              <span className="text-xs">{weekWins}W {weekLosses}L</span>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-open:-rotate-180" />
        </summary>
        
        <div className="space-y-8 pt-4 pb-6 px-2">
          {weekTotalTrades === 0 ? (
            <div className="text-center py-10 bg-card rounded-xl border border-dashed text-muted-foreground text-sm">
              No trades logged in the journal for this week.
            </div>
          ) : (
            weekDates.map(date => {
              const dayTrades = weekTradesByDay[date] || [];
              if (dayTrades.length === 0) return null;
              
              const dayPnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
              const dayNetR = dayTrades.reduce((s, t) => s + (t.netR ?? (t.pnl / defaultPlannedRisk)), 0);
              const dateObj = new Date(date + "T12:00:00");
              const dateDisplay = dateObj.toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' });

              return (
                <div key={date} className="relative group/day">
                  {/* Subtle timeline connector */}
                  <div className="absolute left-1.5 top-2 bottom-0 w-[2px] bg-border/40 rounded-full" />
                  
                  <div className="pl-6 space-y-4">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute -left-[27px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-background border-[3px] border-primary z-10 shadow-[0_0_0_4px_hsl(var(--background))]" />
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-base tracking-tight">{dateDisplay}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground border border-border/50">
                          {dayTrades.length} Trade{dayTrades.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <span className={cn(
                        "text-xs font-bold font-mono px-2.5 py-1 rounded-md border", 
                        dayPnl >= 0 ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"
                      )}>
                        {fmtPnl(dayPnl, pnlDisplayMode, accountBalance, { sign: true })}
                      </span>
                    </div>
                    
                    <div className="space-y-2.5">
                      {dayTrades.slice().sort((a,b) => b.timestamp - a.timestamp).map((t, idx) => {
                        const setupName = t.playbookName ?? t.instrument;
                        const grade = tradePsychology.find(p => p.tradeId === t.id)?.executionGrade;
                        const isOpen = !!openTrades[t.id];
                        
                        return (
                          <div key={t.id} className="border border-border/50 rounded-xl overflow-hidden bg-card/30 hover:bg-card/80 transition-colors shadow-sm">
                            <button
                              type="button"
                              onClick={() => toggleTradeDetail(t.id)}
                              className="w-full select-none flex items-center justify-between px-4 py-3 text-sm outline-none"
                            >
                            <span className="font-bold tracking-wide text-foreground flex items-center gap-3">
                              <span className="text-muted-foreground/60 uppercase text-[11px]">TRADE {dayTrades.length - idx}</span>
                              <span className="text-[14px]">{t.instrument?.toUpperCase()}</span>
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full",
                                t.direction === "long" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                              )}>
                                {t.direction}
                              </span>
                            </span>
                            <div className="flex items-center gap-4">
                              {grade && (
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider", gradeColor(grade))}>
                                  {grade} GRADE
                                </span>
                              )}
                              <span className={cn("font-mono font-bold text-[15px]", t.pnl >= 0 ? "text-success" : "text-destructive")}>
                                {fmtPnl(t.pnl, pnlDisplayMode, accountBalance, { sign: true })}
                              </span>
                              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "-rotate-180")} />
                            </div>
                          </button>

                          {isOpen && (
                            <div className="border-t border-border/60 p-4 space-y-4 bg-muted/5 font-mono text-sm">
                              {t.screenshots && t.screenshots.length > 0 && (
                                <div 
                                  className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer"
                                  onClick={() => { setTradeViewImage(t.screenshots![0].url); setTradeImageZoomed(false); }}
                                >
                                  <img
                                    src={t.screenshots[0].url}
                                    alt="Trade screenshot"
                                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                  />
                                </div>
                              )}

                              <div className="space-y-3 font-sans">
                                {/* Reasoning */}
                                <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400/70" /> Reasoning / logic / confirmation
                                  </div>
                                  <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                                    {t.reasonForEntry || <span className="italic text-muted-foreground/50">No reasoning provided</span>}
                                  </div>
                                </div>

                                {/* Expectation */}
                                <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400/70" /> Result vs expectation
                                  </div>
                                  <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                                    {t.resultVsExpectation || <span className="italic text-muted-foreground/50">No result provided</span>}
                                  </div>
                                </div>

                                {/* Mistakes */}
                                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-destructive/70 mb-1.5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive/70" /> Mistakes
                                  </div>
                                  <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                                    {t.mistakes || <span className="italic text-muted-foreground/50">No mistakes logged</span>}
                                  </div>
                                </div>

                                {/* Improvement */}
                                <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-warning/70 mb-1.5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-warning/70" /> How execution could improve
                                  </div>
                                  <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                                    {t.executionImprovement || <span className="italic text-muted-foreground/50">No improvement notes logged</span>}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex justify-end pt-2">
                                <button 
                                  onClick={() => router.push(`/app/journal/${t.id}`)}
                                  className="text-xs font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1"
                                >
                                  Full Edit <Target className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                </div>
              );
            })
          )}
        </div>
      </details>

      {/* 1. PATTERNS */}
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between w-full">
            <CardTitle>1. Patterns From The Daily Journals</CardTitle>
            <Button variant="outline" size="sm" onClick={handleAutoFillPatterns} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-amber-500" />}
              Auto-Fill from Journals
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Repeated mistakes</Label>
            <AutoTextarea
              value={repeatedMistakes}
              onChange={(e) => setRepeatedMistakes(e.target.value)}
              placeholder="What mistakes kept showing up this week?"
              className="min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Repeated conditions behind my best trades</Label>
            <AutoTextarea
              value={repeatedWinConditions}
              onChange={(e) => setRepeatedWinConditions(e.target.value)}
              placeholder="What did your winners have in common?"
              className="min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Emotional / timing patterns I noticed</Label>
            <AutoTextarea
              value={emotionalTimingPatterns}
              onChange={(e) => setEmotionalTimingPatterns(e.target.value)}
              placeholder="e.g. FOMO during NY open, bored in afternoon..."
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* PERSISTENT PATTERNS — Cross-Week Accountability (only shown when prior history exists) */}
      {persistentPatterns !== null && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <CardTitle className="text-sm font-black uppercase tracking-wider text-amber-500">
                ⚠️ Patterns Persisting From Previous Weeks
              </CardTitle>
            </div>
            <CardDescription className="text-xs mt-1 text-amber-400/80">
              These patterns appeared in prior weekly reviews AND reoccurred this week. Click &quot;Convert to Rule&quot; to build an enforceable IF/THEN rule.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {persistentPatterns.trim() === "" || persistentPatterns === "No persistent patterns found across the past 3 weeks." ? (
              <p className="text-sm text-muted-foreground italic">No persistent patterns found — none of last week&apos;s flagged issues reappeared this week.</p>
            ) : (
              <div className="space-y-2.5">
                {persistentPatterns.split("\n\n").filter(Boolean).map((line, i) => {
                  const trimmed = line.trim();
                  const isActionable = trimmed.startsWith("-") || trimmed.startsWith("⚠️") || trimmed.toLowerCase().includes("persisting");
                  return (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200">
                      <span className="flex-1 font-medium leading-relaxed">{trimmed}</span>
                      {isActionable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConvertPatternToRule(trimmed)}
                          className="h-7 text-xs font-bold shrink-0 self-start sm:self-center border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 hover:text-amber-100"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Convert to Rule
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. RULES BUILT */}
      <Card id="section-2-rules" className="scroll-mt-6">
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>2. Rules Built From This Week</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Turn recurring patterns and mistakes from this week into testable IF &rarr; THEN rules.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddRule} className="font-bold">
            <Plus className="w-4 h-4 mr-2" /> Add Rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {rulesBuilt.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6 border rounded-md border-dashed">
              No rules built this week. Click 'Add Rule' to create one.
            </div>
          ) : (
            rulesBuilt.map((rule, idx) => (
              <div
                key={idx}
                className="flex flex-col md:flex-row gap-4 items-start md:items-end border p-4 rounded-md bg-muted/20"
              >
                <div className="flex-1 space-y-2 w-full">
                  <Label>WHEN</Label>
                  <AutoTextarea value={rule.when}
                    onChange={(e) => updateRule(idx, "when", e.target.value)}
                    placeholder="e.g. I feel FOMO"
                  />
                </div>
                <div className="flex-1 space-y-2 w-full">
                  <Label>THEN</Label>
                  <AutoTextarea value={rule.then}
                    onChange={(e) => updateRule(idx, "then", e.target.value)}
                    placeholder="e.g. I will step away for 10 mins"
                  />
                </div>
                <div className="flex-1 space-y-2 w-full">
                  <Label>From</Label>
                  <AutoTextarea value={rule.from}
                    onChange={(e) => updateRule(idx, "from", e.target.value)}
                    placeholder="e.g. Wednesday's tilt"
                  />
                </div>
                <div className="flex flex-col gap-2 mt-2 md:mt-0">
                  {/* Rule Book button */}
                  {ruleIdMap[rule.when + "||" + rule.then] ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-success px-2 py-1 rounded-full border border-success/30 bg-success/10 whitespace-nowrap">
                      <BookOpen className="w-3 h-3" /> In Rule Book
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs whitespace-nowrap"
                      disabled={!!addingToRuleBook[idx]}
                      onClick={() => handleAddToRuleBook(idx)}
                    >
                      <BookOpen className="w-3 h-3 mr-1" />
                      {addingToRuleBook[idx] ? "Adding..." : "+ Rule Book"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteRuleIdx(idx)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 3. BACKTEST */}
      <Card>
        <CardHeader>
          <CardTitle>
            3. Backtest Of This Same Week With Rules Applied
          </CardTitle>
          <CardDescription>
            Replay the same week bar by bar with your rules in force. What didn't follow these rules is skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PDF Page 9 Rule Log — Rules applied for replay */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Rule Log &mdash; New Rules Built This Week (Applied for Replay)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Replay the same week with your new rules in force. Any trade that violated these rules is counted as skipped.
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-[11px] font-bold">
                {newRulesForBacktest.length} New Rule{newRulesForBacktest.length === 1 ? "" : "s"} Built
              </Badge>
            </div>

            {newRulesForBacktest.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg bg-background/50 space-y-1">
                <p className="font-medium text-foreground">No new rules built in Section 2 yet.</p>
                <p>Add new rules above in Section 2 from this week's mistakes to backtest them against your charts.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-background/80">
                {newRulesForBacktest.map((rule, rIdx) => (
                  <div key={rIdx} className="p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="font-mono font-black text-muted-foreground text-xs shrink-0 mt-0.5">
                        RULE #{rIdx + 1}
                      </span>
                      <div className="space-y-1 min-w-0">
                        <div className="text-foreground">
                          <span className="font-black text-amber-500 mr-1.5 uppercase tracking-wider text-[10px]">WHEN</span>
                          <span className="font-medium">{rule.when}</span>
                        </div>
                        <div className="text-foreground">
                          <span className="font-black text-emerald-500 mr-1.5 uppercase tracking-wider text-[10px]">THEN</span>
                          <span className="font-medium">{rule.then}</span>
                        </div>
                        {rule.from && (
                          <div className="text-[11px] text-muted-foreground italic">
                            Born from mistake: {rule.from}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <Badge 
                        variant="outline" 
                        className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 border-amber-500/30"
                      >
                        NEW (TESTING)
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Collapsible reference to Master Rule Book */}
            {masterRunningRules.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMasterRulesRef(!showMasterRulesRef)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
                >
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showMasterRulesRef && "rotate-180")} />
                  {showMasterRulesRef ? "Hide" : "Show"} Master Rule Book Reference ({masterRunningRules.length} existing rules)
                </button>

                {showMasterRulesRef && (
                  <div className="mt-2.5 divide-y divide-border/40 overflow-hidden rounded-lg border border-border/50 bg-background/50 text-[11px]">
                    {masterRunningRules.map((r: any, idx: number) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-2 text-muted-foreground">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-foreground mr-1.5">#{idx + 1}</span>
                          {r.title && (
                            <span className="font-bold text-primary mr-2">[{r.title}]</span>
                          )}
                          <span className="text-amber-400 font-semibold mr-1">WHEN</span> {r.condition}{" "}
                          <span className="text-emerald-400 font-semibold mx-1">&rarr; THEN</span> {r.action}
                        </div>
                        <Badge variant="outline" className="font-mono text-[9px] uppercase shrink-0">
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5-Metric Backtest Replay HUD */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* 1. Trades Taken */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 shadow-sm space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Trades Taken
                </div>
                <div className="text-2xl font-black font-mono text-foreground flex items-baseline gap-2">
                  <span>{backtestTradesTaken === "" ? 0 : backtestTradesTaken}</span>
                  {weekTotalTrades > 0 && (
                    <span className="text-[11px] font-normal text-muted-foreground">
                      of {weekTotalTrades}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {replayCalculations.skippedCount === 0 ? "All trades taken" : `${replayCalculations.takenCount} followed rules`}
                </div>
              </div>

              {/* 2. Trades Skipped */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 shadow-sm space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Trades Skipped
                </div>
                <div className="text-2xl font-black font-mono text-amber-400 flex items-baseline gap-2">
                  <span>{backtestTradesSkipped === "" ? 0 : backtestTradesSkipped}</span>
                  {weekTotalTrades > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      {((Number(backtestTradesSkipped || 0) / weekTotalTrades) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">Filtered by rules</div>
              </div>

              {/* 3. Win Rate */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 shadow-sm space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Win Rate
                </div>
                <div className="text-2xl font-black font-mono text-foreground flex items-baseline gap-2">
                  <span>{backtestWinRate || "0%"}</span>
                  {weekTotalTrades > 0 && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border",
                      replayCalculations.winRatePct >= actualWinRatePct
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-destructive/15 text-destructive border-destructive/30"
                    )}>
                      {replayCalculations.winRatePct >= actualWinRatePct ? "+" : ""}
                      {(replayCalculations.winRatePct - actualWinRatePct).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  Actual: {actualWinRatePct.toFixed(0)}%
                </div>
              </div>

              {/* 4. Net R */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 shadow-sm space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Net R
                </div>
                <div className={cn(
                  "text-2xl font-black font-mono flex items-baseline gap-2",
                  replayCalculations.totalR >= 0 ? "text-emerald-400" : "text-destructive"
                )}>
                  <span>{backtestNetR || "0R"}</span>
                  {weekTotalTrades > 0 && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border",
                      (replayCalculations.totalR - weekTotalNetR) >= 0
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-destructive/15 text-destructive border-destructive/30"
                    )}>
                      {(replayCalculations.totalR - weekTotalNetR) >= 0 ? "+" : ""}
                      {(replayCalculations.totalR - weekTotalNetR).toFixed(1)}R
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  Actual: {weekTotalNetR >= 0 ? "+" : ""}{weekTotalNetR.toFixed(1)}R
                </div>
              </div>

              {/* 5. Largest Loss */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 shadow-sm space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Largest Loss
                </div>
                <div className="text-2xl font-black font-mono text-foreground flex items-baseline gap-2">
                  <span className={backtestLargestLoss?.startsWith("-") ? "text-destructive" : "text-foreground"}>
                    {backtestLargestLoss || "0R"}
                  </span>
                  {actualLargestLossR < 0 && replayCalculations.worstLossR > actualLargestLossR && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      +{(replayCalculations.worstLossR - actualLargestLossR).toFixed(1)}R saved
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  Actual: {actualLargestLossR.toFixed(1)}R
                </div>
              </div>
            </div>

            {/* Interactive Trade Filter Box */}
            <div className="rounded-xl border border-border/60 bg-muted/10 p-3.5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <span>Filter Week's Trades For Replay</span>
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Toggle trades that violated your rules to <strong>Skipped</strong>. Metrics update automatically.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {weekTradesList.length > 0 && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs cursor-pointer"
                        onClick={handleKeepAllTrades}
                      >
                        Keep All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                        onClick={handleSkipAllLosses}
                      >
                        🛡️ Skip All Losses
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setIsManualBacktestOverride(!isManualBacktestOverride)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    {isManualBacktestOverride ? "Use Auto Mode" : "Manual Edit"}
                  </Button>
                </div>
              </div>

              {/* Manual Override Inputs (shown if manual mode is enabled) */}
              {isManualBacktestOverride && (
                <div className="p-3.5 rounded-lg border border-amber-500/40 bg-amber-500/5 space-y-3">
                  <div className="text-xs font-semibold text-amber-400">Manual Override Mode Active</div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Trades Taken</Label>
                      <Input
                        type="number"
                        value={backtestTradesTaken}
                        onChange={(e) => setBacktestTradesTaken(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Trades Skipped</Label>
                      <Input
                        type="number"
                        value={backtestTradesSkipped}
                        onChange={(e) => setBacktestTradesSkipped(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Win Rate</Label>
                      <Input
                        value={backtestWinRate}
                        onChange={(e) => setBacktestWinRate(e.target.value)}
                        placeholder="e.g. 55%"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Net R</Label>
                      <Input
                        value={backtestNetR}
                        onChange={(e) => setBacktestNetR(e.target.value)}
                        placeholder="e.g. +4R"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Largest Loss</Label>
                      <Input
                        value={backtestLargestLoss}
                        onChange={(e) => setBacktestLargestLoss(e.target.value)}
                        placeholder="e.g. -1R"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Week's Trades List */}
              {weekTradesList.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg bg-background/50">
                  No trades found in your journal for this week. Enter replay numbers manually or log trades in your journal.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {weekTradesList.map((t, idx) => {
                    const isSkipped = !!replaySkippedTradeIds[t.id];
                    const tradeR = (t.netR ?? (t.pnl / defaultPlannedRisk));
                    const rawDate = new Date(Number(t.timestamp));
                    const formattedDate = rawDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 transition-all select-none",
                          isSkipped
                            ? "border-amber-500/30 bg-amber-500/[0.04] opacity-80"
                            : "border-border/60 bg-background/80 hover:bg-background"
                        )}
                      >
                        {/* Trade Info */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="font-mono text-muted-foreground text-[10px] shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                            {formattedDate}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0",
                            t.direction === "long" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                          )}>
                            {t.direction}
                          </span>
                          <span className="font-bold text-foreground shrink-0">{t.instrument}</span>
                          <span className={cn(
                            "font-mono font-bold shrink-0",
                            t.pnl >= 0 ? "text-emerald-400" : "text-destructive"
                          )}>
                            {t.pnl >= 0 ? "+" : ""}{tradeR.toFixed(1)}R
                          </span>
                          {t.mistakes && (
                            <span className="text-[10px] text-destructive/80 italic truncate hidden md:inline">
                              ⚠️ {t.mistakes}
                            </span>
                          )}
                        </div>

                        {/* Segmented Action Button */}
                        <div className="flex items-center gap-1 shrink-0 bg-muted/40 p-0.5 rounded-lg border border-border/50">
                          <button
                            type="button"
                            onClick={() => handleToggleReplaySkipped(t.id, false)}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                              !isSkipped
                                ? "bg-emerald-500 text-black shadow-sm font-black"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            ✓ Taken
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleReplaySkipped(t.id, true)}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                              isSkipped
                                ? "bg-amber-500 text-black shadow-sm font-black"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            ✗ Skipped
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Optional: Include Missed Setups into Replay */}
              {missedTrades.length > 0 && (
                <div className="pt-2 border-t border-border/40 space-y-1.5">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Include Valid Missed Setups in Replay (Optional):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {missedTrades.map(m => {
                      const isIncluded = !!replayIncludedMissedIds[m.id];
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleToggleReplayMissed(m.id)}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer",
                            isIncluded
                              ? "border-emerald-500/80 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40 font-bold"
                              : "border-border bg-background/50 text-muted-foreground hover:border-border/80"
                          )}
                        >
                          <span>{isIncluded ? "✓" : "+"}</span>
                          <span className="font-semibold">{m.instrument} {m.direction}</span>
                          <span className="font-mono text-emerald-400 font-bold">{m.estimatedR || "+1R"}</span>
                          {m.date && <span className="text-[10px] text-muted-foreground">({m.date})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes on the replay</Label>
            <AutoTextarea
              value={backtestNotes}
              onChange={(e) => setBacktestNotes(e.target.value)}
              placeholder="Observations from replaying the week with strict rules..."
              className="min-h-[80px]"
            />
          </div>

          {/* â”â”â” MISSED TRADES â”â”â” */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Missed Valid Setups</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Log setups you spotted (or missed) during the replay</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (showMissedForm && !editingMissedId) {
                    cancelMissedForm();
                  } else {
                    cancelMissedForm();
                    setShowMissedForm(true);
                  }
                }}
              >
                {showMissedForm && !editingMissedId ? "Cancel" : "+ Add Missed Setup"}
              </Button>
            </div>


            {/* Add new form at top */}
            {showMissedForm && !editingMissedId && renderMissedForm()}

            {/* Logged missed trades list */}
            {missedTrades.length > 0 && (
              <div className="space-y-2">
                {missedTrades.map(t => {
                  const expanded = expandedMissed[t.id]

                  if (t.id === editingMissedId) {
                    return <div key={t.id} className="my-2">{renderMissedForm()}</div>;
                  }

                  return (
                    <div
                      key={t.id}
                      className={`rounded-lg border text-sm relative transition-all ${
                        t.ruleHelped
                          ? "border-success/30 bg-success/5"
                          : "border-border bg-muted/20"
                      }`}
                    >
                      <div 
                        className="flex items-center justify-between gap-2 p-3 cursor-pointer group"
                        onClick={() => toggleMissed(t.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground mr-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mr-1" />}
                          {t.date && (
                            <span className="text-[11px] font-mono text-muted-foreground/90 bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                              {t.date}
                            </span>
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.direction === "long" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                            {t.direction.toUpperCase()}
                          </span>
                          <span className="font-semibold">{t.instrument}</span>
                          {t.estimatedR && (
                            <span className={`text-xs font-mono font-bold ${t.outcome === "win" ? "text-success" : t.outcome === "loss" ? "text-destructive" : "text-muted-foreground"}`}>
                              {t.estimatedR} &bull; {t.outcome.toUpperCase()}
                            </span>
                          )}
                          {t.ruleHelped && (
                            <span className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-full border",
                              t.outcome === "loss"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                            )}>
                              {t.outcome === "loss" ? "🛡️ " : "⚠️ "}
                              {t.ruleTitle ? (t.ruleTitle.includes(":") ? t.ruleTitle.split(":")[0] : t.ruleTitle) : "Rule"}
                              {t.outcome === "loss"
                                ? ` saved you (${t.estimatedR ? `${t.estimatedR} prevented` : "loss prevented"})`
                                : ` filtered this (${t.estimatedR ? `${t.estimatedR} missed` : "winner filtered"})`
                              }
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => startEditMissed(t, e)}
                            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteMissedId(t.id);
                            }}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {expanded && (
                        <div className="px-3 pb-4 pt-1 border-t border-border/40 mt-1 space-y-1.5">
                          {t.ruleTitle && (
                            <p className="text-xs font-medium text-foreground bg-muted/40 px-2.5 py-1 rounded border border-border/50">
                              <span className="text-primary font-bold mr-1">Filtered by:</span> {t.ruleTitle}
                            </p>
                          )}
                          <p className="text-muted-foreground text-xs"><span className="font-medium text-foreground">Missed:</span> {t.whyMissed}</p>
                          {t.setupDescription && <p className="text-muted-foreground text-xs italic"><span className="font-medium text-foreground not-italic">Plan:</span> {t.setupDescription}</p>}
                          {t.screenshots && t.screenshots.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-3">
                              {t.screenshots.map((url, idx) => (
                                <div
                                  key={idx}
                                  className="group/img relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer w-64 max-w-full"
                                  onClick={(e) => { e.stopPropagation(); setViewImage(url); setIsZoomed(false); }}
                                >
                                  <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-200 group-hover/img:scale-[1.03]" />
                                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center">
                                    <span className="opacity-0 group-hover/img:opacity-100 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded transition-opacity">Click to zoom</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Summary bar */}
                {(() => {
                  const missedWins = missedTrades.filter(t => !t.ruleHelped && t.outcome === "win")
                  const ruleSaved = missedTrades.filter(t => t.ruleHelped)
                  const missedWinR = missedWins.map(t => parseFloat(t.estimatedR) || 0).reduce((a, b) => a + b, 0)
                  const ruleSavedR = ruleSaved.filter(t => t.outcome === "loss").map(t => Math.abs(parseFloat(t.estimatedR) || 0)).reduce((a, b) => a + b, 0)
                  return (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-muted-foreground">Missed opportunity cost</p>
                        <p className={`font-bold text-sm mt-0.5 ${missedWinR > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {missedWinR > 0 ? `+${missedWinR.toFixed(1)}R missed` : "\u2014"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rule protection saved</p>
                        <p className={`font-bold text-sm mt-0.5 ${ruleSavedR > 0 ? "text-success" : "text-muted-foreground"}`}>
                          {ruleSavedR > 0 ? `${ruleSavedR.toFixed(1)}R protected` : "\u2014"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total logged</p>
                        <p className="font-bold text-sm mt-0.5">{missedTrades.length} setup{missedTrades.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. COMPARISON */}
      <Card>
        <CardHeader>
          <CardTitle>4. Comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Actual Net R</Label>
                <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-bold uppercase">
                  AUTO
                </Badge>
              </div>
              <Input
                value={actualNetR !== "" ? actualNetR : (weekTotalNetR !== 0 ? `${weekTotalNetR > 0 ? "+" : ""}${weekTotalNetR.toFixed(2)}R` : "")}
                onChange={(e) => setActualNetR(e.target.value)}
                placeholder="e.g. -2R"
                className="font-mono font-bold text-cyan-400"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rule-Based Net R</Label>
                {replayCalculations.netRStr && (
                  <button
                    type="button"
                    onClick={() => setRuleBasedNetR(replayCalculations.netRStr)}
                    className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer"
                  >
                    Fill: {replayCalculations.netRStr}
                  </button>
                )}
              </div>
              <Input
                value={ruleBasedNetR !== "" ? ruleBasedNetR : (backtestNetR || "")}
                onChange={(e) => setRuleBasedNetR(e.target.value)}
                placeholder="e.g. +4R"
                className="font-mono font-bold text-emerald-400"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Difference</Label>
                {weekTotalTrades > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const diff = (replayCalculations.totalR - weekTotalNetR);
                      setComparisonDifference(`${diff >= 0 ? "+" : ""}${diff.toFixed(1)}R ${diff >= 0 ? "edge gained" : "lost"}`);
                    }}
                    className="text-[10px] font-mono text-primary hover:underline cursor-pointer"
                  >
                    Fill: {(replayCalculations.totalR - weekTotalNetR) >= 0 ? "+" : ""}{(replayCalculations.totalR - weekTotalNetR).toFixed(1)}R
                  </button>
                )}
              </div>
              <Input
                value={comparisonDifference}
                onChange={(e) => setComparisonDifference(e.target.value)}
                placeholder="e.g. +3.5R edge gained"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>What the difference tells me</Label>
            <AutoTextarea
              value={whatDifferenceTellsMe}
              onChange={(e) => setWhatDifferenceTellsMe(e.target.value)}
              placeholder="e.g. My strategy is fine, my execution is the issue."
              className="min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <Label>Rule that would have saved the most</Label>
                <div className="flex items-center gap-1.5">
                  {(newRulesForBacktest.length > 0 || masterRunningRules.length > 0) && (
                    <button
                      type="button"
                      onClick={() => setShowSavedRulePicker(!showSavedRulePicker)}
                      className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      <BookOpen className="w-3 h-3" />
                      {showSavedRulePicker ? "Hide Rules" : `Select from Rules (${masterRunningRules.length + newRulesForBacktest.length})`}
                    </button>
                  )}
                  {lossSavingRules.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">Click to fill:</span>
                  )}
                </div>
              </div>

              {/* Simulation Detected Loss Saving Rules */}
              {lossSavingRules.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {lossSavingRules.map((ls, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRuleSavedMost(`${ls.ruleName} (prevented ${ls.savedR.toFixed(1)}R loss)`)}
                      className="text-xs px-2 py-0.5 rounded-full border border-success/30 bg-success/10 text-success hover:bg-success/20 transition-colors text-left"
                    >
                      🛡️ {ls.ruleName} ({ls.savedR.toFixed(1)}R saved)
                    </button>
                  ))}
                </div>
              )}

              {/* Click-to-select Rule List from Rule Book and New Rules */}
              {showSavedRulePicker && (newRulesForBacktest.length > 0 || masterRunningRules.length > 0) && (
                <div className="p-2.5 rounded-lg border border-border/70 bg-muted/20 space-y-1.5 max-h-48 overflow-y-auto animate-in fade-in duration-200">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                    Click any rule to auto-fill (or edit below):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {newRulesForBacktest.map((r, i) => (
                      <button
                        key={`new-save-${i}`}
                        type="button"
                        onClick={() => {
                          setRuleSavedMost(`New Rule #${i + 1}: WHEN ${r.when} THEN ${r.then}`);
                          setShowSavedRulePicker(false);
                        }}
                        className="text-left text-xs px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 hover:border-amber-500/60 transition-colors max-w-full truncate"
                        title={`WHEN ${r.when} -> THEN ${r.then}`}
                      >
                        <span className="font-bold text-amber-400 mr-1">New #{i + 1}</span> WHEN {r.when} THEN {r.then}
                      </button>
                    ))}
                    {masterRunningRules.map((r: any, i: number) => {
                      const displayTitle = r.title ? `Rule #${i + 1}: ${r.title}` : `Rule #${i + 1}: WHEN ${r.condition} THEN ${r.action}`;
                      return (
                        <button
                          key={`master-save-${i}`}
                          type="button"
                          onClick={() => {
                            setRuleSavedMost(displayTitle);
                            setShowSavedRulePicker(false);
                          }}
                          className="text-left text-xs px-2.5 py-1 rounded-md border border-border/70 bg-muted/40 hover:border-primary/60 hover:bg-primary/5 transition-colors max-w-full truncate"
                          title={`WHEN ${r.condition} -> THEN ${r.action}`}
                        >
                          <span className="font-bold text-primary mr-1">#{i + 1}</span> {r.title ? r.title : `WHEN ${r.condition} THEN ${r.action}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <AutoTextarea value={ruleSavedMost}
                onChange={(e) => setRuleSavedMost(e.target.value)}
                placeholder="e.g. Stop trading after 2 losses, or select a rule from Rule Book above"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <Label>
                  Rule that filtered out a good trade (needs adjusting)
                </Label>
                <div className="flex items-center gap-1.5">
                  {(newRulesForBacktest.length > 0 || masterRunningRules.length > 0) && (
                    <button
                      type="button"
                      onClick={() => setShowFilteredRulePicker(!showFilteredRulePicker)}
                      className="text-[11px] font-medium text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <BookOpen className="w-3 h-3" />
                      {showFilteredRulePicker ? "Hide Rules" : `Select from Rules (${masterRunningRules.length + newRulesForBacktest.length})`}
                    </button>
                  )}
                  {winFilteringRules.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">Click to fill:</span>
                  )}
                </div>
              </div>

              {/* Simulation Detected Win Filtering Rules */}
              {winFilteringRules.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {winFilteringRules.map((wf, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRuleFilteredGoodTrade(`${wf.ruleName} (filtered +${wf.missedR.toFixed(1)}R trade)`)}
                      className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors text-left"
                    >
                      ⚠️ {wf.ruleName} (+{wf.missedR.toFixed(1)}R missed)
                    </button>
                  ))}
                </div>
              )}

              {/* Click-to-select Rule List from Rule Book and New Rules */}
              {showFilteredRulePicker && (newRulesForBacktest.length > 0 || masterRunningRules.length > 0) && (
                <div className="p-2.5 rounded-lg border border-border/70 bg-muted/20 space-y-1.5 max-h-48 overflow-y-auto animate-in fade-in duration-200">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                    Click any rule to auto-fill (or edit below):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {newRulesForBacktest.map((r, i) => (
                      <button
                        key={`new-filter-${i}`}
                        type="button"
                        onClick={() => {
                          setRuleFilteredGoodTrade(`New Rule #${i + 1}: WHEN ${r.when} THEN ${r.then}`);
                          setShowFilteredRulePicker(false);
                        }}
                        className="text-left text-xs px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 hover:border-amber-500/60 transition-colors max-w-full truncate"
                        title={`WHEN ${r.when} -> THEN ${r.then}`}
                      >
                        <span className="font-bold text-amber-400 mr-1">New #{i + 1}</span> WHEN {r.when} THEN {r.then}
                      </button>
                    ))}
                    {masterRunningRules.map((r: any, i: number) => {
                      const displayTitle = r.title ? `Rule #${i + 1}: ${r.title}` : `Rule #${i + 1}: WHEN ${r.condition} THEN ${r.action}`;
                      return (
                        <button
                          key={`master-filter-${i}`}
                          type="button"
                          onClick={() => {
                            setRuleFilteredGoodTrade(displayTitle);
                            setShowFilteredRulePicker(false);
                          }}
                          className="text-left text-xs px-2.5 py-1 rounded-md border border-border/70 bg-muted/40 hover:border-primary/60 hover:bg-primary/5 transition-colors max-w-full truncate"
                          title={`WHEN ${r.condition} -> THEN ${r.action}`}
                        >
                          <span className="font-bold text-primary mr-1">#{i + 1}</span> {r.title ? r.title : `WHEN ${r.condition} THEN ${r.action}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <AutoTextarea value={ruleFilteredGoodTrade}
                onChange={(e) => setRuleFilteredGoodTrade(e.target.value)}
                placeholder="e.g. Too tight trailing stop, or select a rule from Rule Book above"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. COMMITMENT */}
      <Card>
        <CardHeader>
          <CardTitle>5. Commitment For Next Week</CardTitle>
          <CardDescription>
            Choose the single rule you commit to following next week above all else, and note any status transitions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>The ONE rule I will not break</Label>
              {(newRulesForBacktest.length > 0 || masterRunningRules.length > 0) && (
                <span className="text-xs text-muted-foreground">Click a rule below to select it:</span>
              )}
            </div>
            {(newRulesForBacktest.length > 0 || masterRunningRules.length > 0) && (
              <div className="flex gap-2 flex-wrap pb-1">
                {newRulesForBacktest.map((r, i) => (
                  <button
                    key={`new-${i}`}
                    type="button"
                    onClick={() => setOneRuleNotBreak(`New Rule #${i + 1}: ${r.then}`)}
                    className="text-left text-xs px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 hover:border-amber-500/60 transition-colors max-w-xs truncate"
                    title={`WHEN ${r.when} -> THEN ${r.then}`}
                  >
                    <span className="font-bold text-amber-400 mr-1">New #{i + 1}</span> {r.then}
                  </button>
                ))}
                {masterRunningRules.map((r: any, i: number) => {
                  const displayTitle = r.title ? `Rule #${i + 1}: ${r.title}` : `Rule #${i + 1}: ${r.action}`;
                  return (
                    <button
                      key={`master-${i}`}
                      type="button"
                      onClick={() => setOneRuleNotBreak(displayTitle)}
                      className="text-left text-xs px-2.5 py-1 rounded-md border border-border/70 bg-muted/30 hover:border-primary/60 hover:bg-primary/5 transition-colors max-w-xs truncate"
                      title={`WHEN ${r.condition} -> THEN ${r.action}`}
                    >
                      <span className="font-bold text-primary mr-1">#{i + 1}</span> {r.title || r.action}
                    </button>
                  );
                })}
              </div>
            )}
            <AutoTextarea value={oneRuleNotBreak}
              onChange={(e) => setOneRuleNotBreak(e.target.value)}
              placeholder="e.g. I will wait for confirmation of my side before entering the trade"
              className="font-semibold text-primary"
            />
          </div>
          {/* Rule status updates — testing / active / retired */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <Label className="text-sm font-semibold text-foreground">Rule Status Updates (Testing / Active / Retired)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Maintain your master list. Rules surviving 3+ weeks graduate from Testing to Active. Retire rules that cost more than they saved.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {ruleBookEntries.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const allExp = ruleBookEntries.length > 0 && ruleBookEntries.every((r, i) => !!expandedRuleItems[r.id || `rule-${i}`]);
                      if (allExp) {
                        setExpandedRuleItems({});
                      } else {
                        const next: Record<string, boolean> = {};
                        ruleBookEntries.forEach((r, i) => { next[r.id || `rule-${i}`] = true; });
                        setExpandedRuleItems(next);
                      }
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground h-7 px-2.5 cursor-pointer"
                  >
                    {ruleBookEntries.length > 0 && ruleBookEntries.every((r, i) => !!expandedRuleItems[r.id || `rule-${i}`]) ? (
                      <><ChevronUp className="w-3.5 h-3.5 mr-1" /> Collapse All</>
                    ) : (
                      <><ChevronDown className="w-3.5 h-3.5 mr-1" /> Expand All</>
                    )}
                  </Button>
                )}
                <Badge variant="outline" className="font-mono text-xs">
                  {ruleBookEntries.length} Master Rule{ruleBookEntries.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </div>

            {ruleBookEntries.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg bg-background/50">
                No rules currently in your master Rule Book. Create rules in Section 2 to begin tracking statuses.
              </div>
            ) : (
              <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-background/60">
                {ruleBookEntries.map((rule: any, idx: number) => {
                  const status = rule.status || "testing";
                  const evalItem = ruleEvaluations.find(e => e.when === rule.condition && e.then === rule.action);
                  const evalIdx = ruleEvaluations.findIndex(e => e.when === rule.condition && e.then === rule.action);
                  const ruleKey = rule.id || `rule-${idx}`;
                  const isExpanded = !!expandedRuleItems[ruleKey];

                  // Matching weekly missed trades impact
                  const matchingMissed = missedTrades.filter(
                    mt => mt.ruleHelped && (
                      mt.ruleId === rule.id || 
                      (mt.ruleTitle && mt.ruleTitle.includes(rule.condition))
                    )
                  );
                  const lossesBlocked = matchingMissed.filter(mt => mt.outcome === "loss");
                  const winsFiltered = matchingMissed.filter(mt => mt.outcome === "win");
                  const totalSavedR = lossesBlocked.reduce((acc, m) => acc + Math.abs(parseFloat(m.estimatedR) || 1), 0);
                  const totalMissedR = winsFiltered.reduce((acc, m) => acc + (parseFloat(m.estimatedR) || 1), 0);

                  return (
                    <div key={ruleKey} className="transition-colors">
                      {/* Toggle row header */}
                      <div
                        onClick={() => toggleRuleItem(ruleKey)}
                        className={cn(
                          "p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors",
                          isExpanded ? "bg-muted/30" : "hover:bg-muted/20"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <ChevronDown className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0",
                            !isExpanded && "-rotate-90"
                          )} />
                          <span className="font-mono font-bold text-xs text-muted-foreground shrink-0">
                            #{idx + 1}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-[9px] uppercase font-bold px-1.5 py-0 shrink-0",
                              status === "active"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : status === "testing"
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {status === "testing" ? "Testing (W1-3)" : status}
                          </Badge>

                          <div className="flex items-center gap-1.5 text-xs truncate min-w-0 flex-1">
                            <span className="font-bold text-amber-500 text-[10px] shrink-0 uppercase">WHEN</span>
                            <span className="text-foreground/90 font-medium truncate">{rule.condition}</span>
                            <span className="font-bold text-emerald-500 text-[10px] shrink-0 uppercase mx-0.5">&rarr; THEN</span>
                            <span className="text-foreground/90 font-medium truncate">{rule.action}</span>
                          </div>
                        </div>

                        {/* Right badges: Weekly Impact & Followed Status */}
                        <div className="flex items-center gap-2 shrink-0">
                          {lossesBlocked.length > 0 && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                              🛡️ +{totalSavedR.toFixed(1)}R
                            </span>
                          )}
                          {winsFiltered.length > 0 && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                              ⚠️ +{totalMissedR.toFixed(1)}R
                            </span>
                          )}

                          {evalItem?.followStatus === "followed" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 shrink-0">
                              Followed {evalItem.helpStatus === "helped" ? "· Helped ✓" : evalItem.helpStatus === "worse" ? "· Worse ✗" : ""}
                            </span>
                          ) : evalItem?.followStatus === "broke" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30 shrink-0">
                              Broke It ✗
                            </span>
                          ) : evalItem?.followStatus === "na" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
                              No Opp
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 italic hidden sm:inline shrink-0">
                              Unreviewed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded Drawer */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 space-y-3.5 border-t border-border/40 bg-muted/[0.04]">
                          {/* Full WHEN & THEN description & Status Selector */}
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="text-foreground text-xs">
                                <span className="font-bold text-amber-500 mr-1.5 uppercase text-[10px] tracking-wider">WHEN</span>
                                <span className="font-medium leading-relaxed">{rule.condition}</span>
                              </div>
                              <div className="text-foreground text-xs">
                                <span className="font-bold text-emerald-500 mr-1.5 uppercase text-[10px] tracking-wider">THEN</span>
                                <span className="font-medium leading-relaxed">{rule.action}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap pt-0.5">
                                {rule.fromMistake && (
                                  <span className="italic">From: {rule.fromMistake}</span>
                                )}
                                {rule.weekAdded && (
                                  <span className="font-mono">Born: {rule.weekAdded}</span>
                                )}
                                {(rule.reviewCount > 0 || rule.helpCount > 0) && (
                                  <span className="font-mono text-primary font-semibold">
                                    Reviewed {rule.reviewCount || 0}x &bull; Helped {rule.helpCount || 0}x
                                  </span>
                                )}
                                {matchingMissed.length > 0 && (
                                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                    {lossesBlocked.length > 0 && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                        🛡️ Blocked {lossesBlocked.length} loss{lossesBlocked.length !== 1 ? "es" : ""} this week (+{totalSavedR.toFixed(1)}R protected)
                                      </span>
                                    )}
                                    {winsFiltered.length > 0 && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                        ⚠️ Filtered {winsFiltered.length} winner{winsFiltered.length !== 1 ? "s" : ""} this week (+{totalMissedR.toFixed(1)}R missed)
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 3-way status toggle */}
                            <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 p-1 rounded-lg border border-border/60">
                              {(["testing", "active", "retired"] as const).map((s) => {
                                const isSelected = status === s;
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateRuleStatus(rule.id, s);
                                    }}
                                    className={cn(
                                      "px-2.5 py-1 rounded-md font-mono text-[10px] font-bold uppercase transition-all",
                                      isSelected
                                        ? s === "active"
                                          ? "bg-emerald-500 text-black shadow-sm font-black"
                                          : s === "testing"
                                          ? "bg-amber-500 text-black shadow-sm font-black"
                                          : "bg-muted-foreground/30 text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                    )}
                                  >
                                    {s === "testing" ? "Testing (W1-3)" : s}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Adherence & Effectiveness for this review week */}
                          <div className="pt-2 border-t border-border/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-muted/20 p-2.5 rounded-lg text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Followed this week?
                              </span>
                              {(["followed", "broke", "na"] as const).map((opt) => {
                                const current = evalItem?.followStatus;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (evalIdx !== -1) {
                                        updateEval(evalIdx, { followStatus: opt });
                                      } else {
                                        setRuleEvaluations(prev => [
                                          ...prev,
                                          {
                                            when: rule.condition,
                                            then: rule.action,
                                            from: rule.fromMistake || "",
                                            followStatus: opt,
                                            helpStatus: "",
                                            verdict: "",
                                            adjustmentNote: "",
                                          }
                                        ]);
                                      }
                                    }}
                                    className={cn(
                                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors",
                                      current === opt
                                        ? opt === "followed"
                                          ? "bg-success text-success-foreground border-success"
                                          : opt === "broke"
                                          ? "bg-destructive text-destructive-foreground border-destructive"
                                          : "bg-muted text-foreground border-border"
                                        : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                                    )}
                                  >
                                    {opt === "followed" ? "Followed" : opt === "broke" ? "Broke It" : "No Opportunity"}
                                  </button>
                                );
                              })}
                            </div>

                            {evalItem?.followStatus === "followed" && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Did it help?
                                </span>
                                {(["helped", "no_diff", "worse"] as const).map((opt) => {
                                  const currentHelp = evalItem?.helpStatus;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (evalIdx !== -1) {
                                          updateEval(evalIdx, { helpStatus: opt });
                                        }
                                      }}
                                      className={cn(
                                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors",
                                        currentHelp === opt
                                          ? opt === "helped"
                                            ? "bg-success text-success-foreground border-success"
                                            : opt === "worse"
                                            ? "bg-destructive text-destructive-foreground border-destructive"
                                            : "bg-muted text-foreground border-border"
                                          : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                                      )}
                                    >
                                      {opt === "helped" ? "Yes, helped" : opt === "no_diff" ? "No difference" : "Made worse"}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-muted-foreground">Notes on rule transitions &amp; status updates (optional)</Label>
              <AutoTextarea
                value={ruleStatusUpdates}
                onChange={(e) => setRuleStatusUpdates(e.target.value)}
                placeholder="e.g. Rule #4 graduated to Active after 3 winning weeks. Rule #1 kept in Testing."
                className="min-h-[70px] text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button size="lg" onClick={handleSave} disabled={saving || loading}>
          {saving ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          Save Weekly Review
        </Button>
      </div>
    </div>

    {/* Delete Missed Trade Confirmation */}
    <Dialog open={!!deleteMissedId} onOpenChange={(o) => !o && setDeleteMissedId(null)}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center gap-4 py-4 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Delete Missed Setup</h3>
            <p className="text-sm text-muted-foreground mt-1">Are you sure you want to remove this logged setup? This action cannot be undone.</p>
          </div>
          <div className="flex justify-center gap-3 mt-2 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteMissedId(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={() => {
              if (deleteMissedId) removeMissedTrade(deleteMissedId);
              setDeleteMissedId(null);
            }}>
              Yes, delete it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Rule Confirmation Dialog */}
    <AlertDialog open={deleteRuleIdx !== null} onOpenChange={(open) => !open && setDeleteRuleIdx(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this rule built from this week?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDeleteRuleIdx(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (deleteRuleIdx !== null) {
                removeRule(deleteRuleIdx);
                setDeleteRuleIdx(null);
                toast.success("Rule removed");
              }
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Delete Missed Trade Screenshot Confirmation Dialog */}
    <AlertDialog open={deleteMissedScreenshotIdx !== null} onOpenChange={(open) => !open && setDeleteMissedScreenshotIdx(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Screenshot?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove this chart screenshot from your draft?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDeleteMissedScreenshotIdx(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (deleteMissedScreenshotIdx !== null) {
                setMissedDraft(d => ({ ...d, screenshots: d.screenshots?.filter((_, i) => i !== deleteMissedScreenshotIdx) }));
                setDeleteMissedScreenshotIdx(null);
              }
            }}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
