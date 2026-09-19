"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getWeeklyReview,
  saveWeeklyReview,
  getPreviousWeeklyReview,
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
import { Plus, Trash, Save, Loader2, Sparkles, ClipboardCheck, BookOpen, Upload, X, ChevronDown, ChevronUp, AlertCircle, Pencil, Target } from "lucide-react";
import {
  getRuleBookEntries,
  createRuleBookEntry,
  applyRuleVerdict,
  updateRuleBookStatus,
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

const getCurrentWeekKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const numberOfDays = Math.floor(
    (d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000),
  );
  const week = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
  return `${year}-W${week.toString().padStart(2, "0")}`;
};


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
    const [yearStr, wStr] = weekOf.split("-W");
    const year = Number(yearStr);
    const week = Number(wStr);
    // ISO week: Jan 4 is always in week 1
    const jan4 = new Date(year, 0, 4);
    const mondayOfW1 = new Date(jan4);
    mondayOfW1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
    const monday = new Date(mondayOfW1);
    monday.setDate(mondayOfW1.getDate() + (week - 1) * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
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

  // Missed Trades
  type MissedTrade = {
    id: string;
    instrument: string;
    direction: "long" | "short";
    date: string;
    setupDescription: string;
    estimatedR: string;
    outcome: "win" | "loss" | "breakeven";
    whyMissed: string;          // free text â€” user types whatever reason
    realtimeValidity: "yes_100" | "maybe" | "honest_no";
    ruleHelped?: boolean;       // true if rule correctly blocked a losing trade
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
    setupDescription: "", estimatedR: "", outcome: "win", whyMissed: "", realtimeValidity: "yes_100", ruleHelped: false, screenshots: []
  });
  const [missedDraft, setMissedDraft] = useState<MissedTrade>(emptyMissed());
  const [expandedMissed, setExpandedMissed] = useState<Record<string, boolean>>({});
  const toggleMissed = (id: string) => setExpandedMissed(p => ({ ...p, [id]: !p[id] }));
  const [deleteMissedId, setDeleteMissedId] = useState<string | null>(null);
  const renderMissedForm = () => (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

                {/* Hindsight reality check */}
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <Label className="text-xs font-semibold text-amber-500">&#x26A0;&#xFE0F; Hindsight Reality Check</Label>
                  <p className="text-xs text-muted-foreground">"Would you have taken this trade IN REAL TIME, with only the info available then?"</p>
                  <div className="flex flex-col gap-1.5">
                    {(["yes_100", "maybe", "honest_no"] as const).map(v => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="realtimeValidity"
                          value={v}
                          checked={missedDraft.realtimeValidity === v}
                          onChange={() => setMissedDraft(d => ({ ...d, realtimeValidity: v }))}
                          className="accent-primary"
                        />
                        <span className="text-sm">
                          {v === "yes_100" && <><span className="text-success font-medium">Yes, 100%</span> &mdash; I had a clear plan for this level</>}
                          {v === "maybe" && <><span className="text-amber-500 font-medium">Maybe</span> &mdash; not sure I'd have seen it live</>}
                          {v === "honest_no" && <><span className="text-destructive font-medium">Honest no</span> &mdash; only obvious in hindsight</>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={!!missedDraft.ruleHelped}
                      onChange={e => setMissedDraft(d => ({ ...d, ruleHelped: e.target.checked }))}
                      className="accent-success"
                    />
                    A rule correctly prevented this (it would have been a bad trade)
                  </label>
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

  // Rule Book state
  const [ruleBookEntries, setRuleBookEntries] = useState<any[]>([]);
  // Map from "condition||action" -> ruleId for quick lookup
  const [ruleIdMap, setRuleIdMap] = useState<Record<string, string>>({});
  const [addingToRuleBook, setAddingToRuleBook] = useState<Record<number, boolean>>({});

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
      toast.success("Successfully summarized daily journals!")
    } catch (err: any) {
      toast.error(err.message || "Failed to generate patterns")
    } finally {
      setIsGenerating(false)
    }
  }
  
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

          // Load missed trades
          if ((data as any).missedTrades) {
            try {
              const parsed = JSON.parse((data as any).missedTrades) as MissedTrade[];
              setMissedTrades(parsed.map(t => ({
                ...t,
                screenshots: t.screenshots || (t.screenshotUrl ? [t.screenshotUrl] : [])
              })));
            } catch { setMissedTrades([]); }
          } else {
            setMissedTrades([]);
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
          setMissedTrades([]);
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
        ruleEvaluations: ruleEvaluations.length > 0 ? JSON.stringify(ruleEvaluations) : null,
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
        await loadRuleBook();
      }

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* RULE ACCOUNTABILITY (PDF Mentorship Framework) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Rule Accountability &amp; Evaluation</CardTitle>
              <CardDescription className="mt-0.5">
                Evaluate adherence and effectiveness of your running rules ({previousWeekOf || "Master Rule Book"})
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs font-mono gap-1 text-muted-foreground hover:text-foreground">
            <a href="/app/rule-book" target="_blank" rel="noopener noreferrer">
              <BookOpen className="w-3.5 h-3.5" /> Open Rule Book
            </a>
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {ruleEvaluations.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-xl space-y-2">
              <p className="font-semibold text-foreground">No running rules to evaluate yet.</p>
              <p className="text-xs max-w-md mx-auto">
                Turn your weekly repeated mistakes into rules in Section 2 below. Once created, they join your running Rule Book and are reviewed here every weekend.
              </p>
            </div>
          ) : (
            ruleEvaluations.map((ev, idx) => (
              <div key={idx} className="border border-border/60 rounded-xl p-4 space-y-4 bg-muted/10">
                {/* Rule summary */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-muted-foreground">RULE #{idx + 1}</span>
                    {ruleIdMap[ev.when + "||" + ev.then] && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                        IN RULE BOOK
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-500 mt-1">When (Trigger)</div>
                  <div className="text-sm text-foreground font-medium">{ev.when || <span className="italic text-muted-foreground">&mdash;</span>}</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-500 mt-2">Then (Action)</div>
                  <div className="text-sm text-foreground font-medium">{ev.then || <span className="italic text-muted-foreground">&mdash;</span>}</div>
                  {ev.from && (
                    <div className="text-xs text-muted-foreground mt-1 italic">Born from: {ev.from}</div>
                  )}
                </div>

                {/* Follow Status */}
                <div className="space-y-2 pt-1 border-t border-border/40">
                  <Label className="text-xs uppercase tracking-widest font-bold">Did you follow this rule?</Label>
                  <div className="flex gap-2 flex-wrap">
                    {(["followed", "broke", "na"] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateEval(idx, { followStatus: opt })}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          ev.followStatus === opt
                            ? opt === "followed" ? "bg-success text-success-foreground border-success"
                              : opt === "broke" ? "bg-destructive text-destructive-foreground border-destructive"
                              : "bg-muted text-foreground border-border"
                            : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                        }`}
                      >
                        {opt === "followed" ? "Followed" : opt === "broke" ? "Broke It" : "No Opportunity"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Help Status — only if followed */}
                {ev.followStatus === "followed" && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold">Did following it help?</Label>
                    <div className="flex gap-2 flex-wrap">
                      {(["helped", "no_diff", "worse"] as const).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateEval(idx, { helpStatus: opt })}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                            ev.helpStatus === opt
                              ? opt === "helped" ? "bg-success text-success-foreground border-success"
                                : opt === "worse" ? "bg-destructive text-destructive-foreground border-destructive"
                                : "bg-muted text-foreground border-border"
                              : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                          }`}
                        >
                          {opt === "helped" ? "Yes, it helped" : opt === "no_diff" ? "No difference" : "Made it worse"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verdict */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold">Verdict</Label>
                  <div className="flex gap-2 flex-wrap">
                    {(["keep", "adjust", "retire"] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateEval(idx, { verdict: opt })}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          ev.verdict === opt
                            ? opt === "keep" ? "bg-success text-success-foreground border-success"
                              : opt === "retire" ? "bg-destructive text-destructive-foreground border-destructive"
                              : "bg-amber-500 text-white border-amber-500"
                            : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                        }`}
                      >
                        {opt === "keep" ? "Keep" : opt === "adjust" ? "Adjust" : "Retire"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Adjustment note — only if verdict is adjust */}
                {ev.verdict === "adjust" && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold">How should this rule change?</Label>
                    <AutoTextarea
                      value={ev.adjustmentNote}
                      onChange={(e) => updateEval(idx, { adjustmentNote: e.target.value })}
                      placeholder="e.g. Instead of 10 mins, I'll step away for only 3 mins..."
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 2. RULES BUILT */}
      <Card>
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
                          <span className="font-bold text-foreground mr-2">#{idx + 1}</span>
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

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Trades Taken</Label>
              <Input
                type="number"
                value={backtestTradesTaken}
                onChange={(e) =>
                  setBacktestTradesTaken(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Trades Skipped</Label>
              <Input
                type="number"
                value={backtestTradesSkipped}
                onChange={(e) =>
                  setBacktestTradesSkipped(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Win Rate</Label>
              <Input
                value={backtestWinRate}
                onChange={(e) => setBacktestWinRate(e.target.value)}
                placeholder="e.g. 55%"
              />
            </div>
            <div className="space-y-2">
              <Label>Net R</Label>
              <Input
                value={backtestNetR}
                onChange={(e) => setBacktestNetR(e.target.value)}
                placeholder="e.g. +4R"
              />
            </div>
            <div className="space-y-2">
              <Label>Largest Loss</Label>
              <Input
                value={backtestLargestLoss}
                onChange={(e) => setBacktestLargestLoss(e.target.value)}
                placeholder="e.g. -1R"
              />
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
                  const isConfirmed = t.realtimeValidity === "yes_100"
                  const isMaybe = t.realtimeValidity === "maybe"
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
                          : isConfirmed
                          ? "border-border bg-muted/20"
                          : "border-border bg-muted/10 opacity-70"
                      }`}
                    >
                      <div 
                        className="flex items-center justify-between gap-2 p-3 cursor-pointer group"
                        onClick={() => toggleMissed(t.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground mr-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mr-1" />}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.direction === "long" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                            {t.direction.toUpperCase()}
                          </span>
                          <span className="font-semibold">{t.instrument}</span>
                          {t.estimatedR && (
                            <span className={`text-xs font-mono font-bold ${t.outcome === "win" ? "text-success" : t.outcome === "loss" ? "text-destructive" : "text-muted-foreground"}`}>
                              {t.estimatedR} &bull; {t.outcome.toUpperCase()}
                            </span>
                          )}
                          {t.ruleHelped && <span className="text-xs text-success font-medium">&#x2713; Rule saved you</span>}
                          {!isConfirmed && (
                            <span className="text-xs text-muted-foreground italic">
                              {isMaybe ? "(maybe - unconfirmed)" : "(hindsight only)"}
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
                        <div className="px-3 pb-4 pt-1 border-t border-border/40 mt-1">
                          <p className="text-muted-foreground text-xs"><span className="font-medium text-foreground">Missed:</span> {t.whyMissed}</p>
                          {t.setupDescription && <p className="text-muted-foreground mt-2 text-xs italic"><span className="font-medium text-foreground not-italic">Plan:</span> {t.setupDescription}</p>}
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
                  const confirmed = missedTrades.filter(t => t.realtimeValidity === "yes_100" && !t.ruleHelped)
                  const ruleSaved = missedTrades.filter(t => t.ruleHelped)
                  const confirmedWinR = confirmed.filter(t => t.outcome === "win").map(t => parseFloat(t.estimatedR) || 0).reduce((a, b) => a + b, 0)
                  const ruleSavedR = ruleSaved.filter(t => t.outcome === "loss").map(t => Math.abs(parseFloat(t.estimatedR) || 0)).reduce((a, b) => a + b, 0)
                  return (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-muted-foreground">Confirmed opportunity cost</p>
                        <p className={`font-bold text-sm mt-0.5 ${confirmedWinR > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {confirmedWinR > 0 ? `+${confirmedWinR.toFixed(1)}R missed` : "\u2014"}
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
              <Label>Rule-Based Net R</Label>
              <Input
                value={ruleBasedNetR}
                onChange={(e) => setRuleBasedNetR(e.target.value)}
                placeholder="e.g. +4R"
              />
            </div>
            <div className="space-y-2">
              <Label>Difference</Label>
              <Input
                value={comparisonDifference}
                onChange={(e) => setComparisonDifference(e.target.value)}
                placeholder="e.g. 6R missed"
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
              <Label>Rule that would have saved the most</Label>
              <AutoTextarea value={ruleSavedMost}
                onChange={(e) => setRuleSavedMost(e.target.value)}
                placeholder="e.g. Stop trading after 2 losses"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Rule that filtered out a good trade (needs adjusting)
              </Label>
              <AutoTextarea value={ruleFilteredGoodTrade}
                onChange={(e) => setRuleFilteredGoodTrade(e.target.value)}
                placeholder="e.g. Too tight trailing stop"
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
                {masterRunningRules.map((r: any, i: number) => (
                  <button
                    key={`master-${i}`}
                    type="button"
                    onClick={() => setOneRuleNotBreak(`Rule #${i + 1}: ${r.action}`)}
                    className="text-left text-xs px-2.5 py-1 rounded-md border border-border/70 bg-muted/30 hover:border-primary/60 hover:bg-primary/5 transition-colors max-w-xs truncate"
                    title={`WHEN ${r.condition} -> THEN ${r.action}`}
                  >
                    <span className="font-bold text-primary mr-1">#{i + 1}</span> {r.action}
                  </button>
                ))}
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
              <Badge variant="outline" className="font-mono text-xs">
                {ruleBookEntries.length} Master Rule{ruleBookEntries.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {ruleBookEntries.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg bg-background/50">
                No rules currently in your master Rule Book. Create rules in Section 2 to begin tracking statuses.
              </div>
            ) : (
              <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-background/60">
                {ruleBookEntries.map((rule: any, idx: number) => {
                  const status = rule.status || "testing";
                  return (
                    <div key={rule.id || idx} className="p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs hover:bg-muted/20 transition-colors">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="font-mono font-bold text-muted-foreground text-xs shrink-0 mt-0.5">
                          #{idx + 1}
                        </span>
                        <div className="space-y-1 min-w-0">
                          <div className="text-foreground">
                            <span className="font-bold text-amber-500 mr-1.5 uppercase text-[10px] tracking-wider">WHEN</span>
                            <span className="font-medium">{rule.condition}</span>
                          </div>
                          <div className="text-foreground">
                            <span className="font-bold text-emerald-500 mr-1.5 uppercase text-[10px] tracking-wider">THEN</span>
                            <span className="font-medium">{rule.action}</span>
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
                          </div>
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
                              onClick={() => handleUpdateRuleStatus(rule.id, s)}
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
