"use client";

import { useState, useEffect } from "react";
import {
  getWeeklyReview,
  saveWeeklyReview,
  getPreviousWeeklyReview,
} from "@/app/actions/journal-actions";
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
import { Plus, Trash, Save, Loader2, Sparkles, ClipboardCheck, BookOpen } from "lucide-react";
import {
  getRuleBookEntries,
  createRuleBookEntry,
  applyRuleVerdict,
} from "@/app/actions/rulebook-actions";

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
      }}
      onBlur={(e) => {
        if (props.onChange) {
          props.onChange(e as any)
        }
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
    } catch {}
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

  const handleAutoFillPatterns = async () => {
    try {
      setIsGenerating(true)
      const res = await generateWeeklyPatterns(weekOf)
      setRepeatedMistakes(res.repeatedMistakes || "")
      setRepeatedWinConditions(res.repeatedWinConditions || "")
      setEmotionalTimingPatterns(res.emotionalTimingPatterns || "")
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
      await loadRuleBook();
      try {
        const data = await getWeeklyReview(weekOf);
        if (data) {
          setDaysTradedCount(data.daysTradedCount ?? "");
          setNetR(data.netR ?? "");
          setRepeatedMistakes(data.repeatedMistakes ?? "");
          setRepeatedWinConditions(data.repeatedWinConditions ?? "");
          setEmotionalTimingPatterns(data.emotionalTimingPatterns ?? "");

          if (data.rulesBuilt) {
            try {
              setRulesBuilt(JSON.parse(data.rulesBuilt));
            } catch (e) {
              setRulesBuilt([]);
            }
          } else {
            setRulesBuilt([]);
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

          // Load saved evaluations for this week
          if ((data as any).ruleEvaluations) {
            try {
              setRuleEvaluations(JSON.parse((data as any).ruleEvaluations));
            } catch { setRuleEvaluations([]); }
          } else {
            setRuleEvaluations([]);
          }
        } else {
          // Reset form
          setDaysTradedCount("");
          setNetR("");
          setRepeatedMistakes("");
          setRepeatedWinConditions("");
          setEmotionalTimingPatterns("");
          setRulesBuilt([]);
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
          setRuleEvaluations([]);
        }

        // Always load previous week's rules (regardless of whether current week exists)
        try {
          const prev = await getPreviousWeeklyReview(weekOf);
          if (prev && prev.rules.length > 0) {
            setPreviousWeekOf(prev.previousWeekOf);
            setPreviousRules(prev.rules);
            // If no saved evals yet, init blank evals for each previous rule
            if (!((data as any)?.ruleEvaluations)) {
              setRuleEvaluations(prev.rules.map(r => ({
                when: r.when,
                then: r.then,
                from: r.from,
                followStatus: "",
                helpStatus: "",
                verdict: "",
                adjustmentNote: "",
              })));
            }
          } else {
            setPreviousWeekOf(null);
            setPreviousRules([]);
          }
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
      };

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

  return (
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
              <Label>Net R (Actual)</Label>
              <Input
                value={netR}
                onChange={(e) => setNetR(e.target.value)}
                placeholder="e.g. 2.5R"
              />
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* RULE ACCOUNTABILITY */}
      {previousRules.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Last Week's Rule Accountability</CardTitle>
                <CardDescription className="mt-0.5">
                  Rate how you followed the rules you built in{" "}
                  <span className="font-semibold text-foreground">{previousWeekOf}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {ruleEvaluations.map((ev, idx) => (
              <div key={idx} className="border border-border/60 rounded-xl p-4 space-y-4 bg-muted/10">
                {/* Rule summary */}
                <div className="space-y-0.5">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">When</div>
                  <div className="text-sm text-foreground">{ev.when || <span className="italic text-muted-foreground">—</span>}</div>
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">Then</div>
                  <div className="text-sm text-foreground">{ev.then || <span className="italic text-muted-foreground">—</span>}</div>
                  {ev.from && (
                    <div className="text-xs text-muted-foreground mt-1">From: {ev.from}</div>
                  )}
                </div>

                {/* Follow Status */}
                <div className="space-y-2">
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
            ))}
          </CardContent>
        </Card>
      )}

      {/* 2. RULES BUILT */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>2. Rules Built From This Week</CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddRule}>
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
                    onClick={() => removeRule(idx)}
                    className="text-destructive"
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
        </CardHeader>
        <CardContent className="space-y-6">
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
              <Label>Actual Net R</Label>
              <Input
                value={actualNetR}
                onChange={(e) => setActualNetR(e.target.value)}
                placeholder="e.g. -2R"
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>The ONE rule I will not break</Label>
            <AutoTextarea value={oneRuleNotBreak}
              onChange={(e) => setOneRuleNotBreak(e.target.value)}
              placeholder="e.g. I will wait for a 5min candle close before entry"
              className="font-semibold text-primary"
            />
          </div>
          <div className="space-y-2">
            <Label>Rule status updates (Testing / Active / Retired)</Label>
            <AutoTextarea
              value={ruleStatusUpdates}
              onChange={(e) => setRuleStatusUpdates(e.target.value)}
              placeholder="e.g. Active: No PM trading. Retired: Old moving average cross."
              className="min-h-[100px]"
            />
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
  );
}
