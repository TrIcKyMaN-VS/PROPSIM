"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { 
  Plus, Save, Trash2, ChevronDown, ChevronRight, History, Loader2, 
  Search, ShieldCheck, Zap, Archive, BookOpen, ArrowRight, AlertCircle, 
  CheckCircle2, Sparkles, Filter, Bookmark, TrendingUp
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  getRuleBookEntries,
  createRuleBookEntry,
  updateRuleBookStatus,
  deleteRuleBookEntry,
} from "@/app/actions/rulebook-actions"

const STATUS_CONFIG: Record<string, { label: string; badge: string; border: string; glow: string }> = {
  active: {
    label: "Active",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    border: "border-l-4 border-l-emerald-500",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.08)]",
  },
  testing: {
    label: "Testing",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    border: "border-l-4 border-l-amber-500",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.08)]",
  },
  retired: {
    label: "Retired",
    badge: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    border: "border-l-4 border-l-slate-600",
    glow: "",
  },
}

export default function RuleBookPage() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "reviewed">("newest")
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({})

  const [form, setForm] = useState({
    condition: "",
    action: "",
    fromMistake: "",
  })

  const load = async () => {
    try {
      const data = await getRuleBookEntries()
      setRules(data)
    } catch {
      toast.error("Failed to load rules")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.condition.trim() || !form.action.trim()) {
      return toast.error("WHEN condition and THEN action are required")
    }
    setSaving(true)
    try {
      const res = await createRuleBookEntry({ ...form, fromMistake: form.fromMistake || undefined })
      if (res.isDuplicate) {
        toast.warning("This rule already exists in your Rule Book")
      } else {
        toast.success("Rule added to Rule Book")
        setAdding(false)
        setForm({ condition: "", action: "", fromMistake: "" })
        await load()
      }
    } catch {
      toast.error("Failed to save rule")
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateRuleBookStatus(id, status)
      setRules(prev => prev.map(r => r.id === id ? { ...r, status } : r))
      toast.success(`Rule status updated to ${status.toUpperCase()}`)
    } catch {
      toast.error("Failed to update status")
    }
  }

  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    try {
      await deleteRuleBookEntry(id)
      setRules(prev => prev.filter(r => r.id !== id))
      toast.success("Rule deleted")
      setDeleteRuleId(null)
    } catch {
      toast.error("Failed to delete rule")
    }
  }

  // Filter & Search Logic
  const filteredRules = useMemo(() => {
    let result = [...rules]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r => 
        r.condition?.toLowerCase().includes(q) ||
        r.action?.toLowerCase().includes(q) ||
        r.fromMistake?.toLowerCase().includes(q) ||
        r.weekAdded?.toLowerCase().includes(q)
      )
    }
    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sortBy === "oldest") {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    } else if (sortBy === "reviewed") {
      result.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
    }
    return result
  }, [rules, searchQuery, sortBy])

  const active = useMemo(() => filteredRules.filter(r => r.status === "active"), [filteredRules])
  const testing = useMemo(() => filteredRules.filter(r => r.status === "testing"), [filteredRules])
  const retired = useMemo(() => filteredRules.filter(r => r.status === "retired"), [filteredRules])

  const totalCount = rules.length
  const activeCount = rules.filter(r => r.status === "active").length
  const testingCount = rules.filter(r => r.status === "testing").length
  const retiredCount = rules.filter(r => r.status === "retired").length

  const RuleCard = ({ rule, index }: { rule: any; index: number }) => {
    const history: any[] = rule.adjustmentHistory || []
    const isHistoryOpen = !!expandedHistory[rule.id]
    const promoteReady = rule.status === "testing" && (rule.reviewCount || 0) >= 2 && (rule.helpCount || 0) >= 2
    const cfg = STATUS_CONFIG[rule.status] || STATUS_CONFIG.testing

    return (
      <div className={`group relative rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl p-5 md:p-6 transition-all duration-300 hover:border-primary/40 ${cfg.border} ${cfg.glow}`}>
        
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-3 mb-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-muted/60 border border-border text-[11px] font-black uppercase tracking-wider text-foreground font-mono">
              RULE #{index + 1}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {new Date(rule.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            {rule.weekAdded && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {rule.weekAdded}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Status Custom Dropdown Select */}
            <select
              className={`text-xs font-bold uppercase tracking-wider border rounded-lg px-2.5 py-1.5 cursor-pointer bg-background/80 focus:ring-2 focus:ring-primary/40 outline-none transition-all ${cfg.badge}`}
              value={rule.status}
              onChange={e => handleStatusChange(rule.id, e.target.value)}
            >
              <option value="testing">⚡ TESTING</option>
              <option value="active">✓ ACTIVE</option>
              <option value="retired">✕ RETIRED</option>
            </select>

            {/* Trash Delete Button */}
            <button
              onClick={() => setDeleteRuleId(rule.id)}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
              title="Delete Rule"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Core WHEN & THEN Condition Blocks */}
        <div className="space-y-3">
          {/* WHEN Clause */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20">
            <div className="shrink-0 p-1.5 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">WHEN (TRIGGER)</div>
              <p className="text-sm font-semibold text-foreground/95 leading-relaxed">{rule.condition}</p>
            </div>
          </div>

          {/* THEN Clause */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20">
            <div className="shrink-0 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">THEN (ACTION)</div>
              <p className="text-sm font-semibold text-foreground/95 leading-relaxed">{rule.action}</p>
            </div>
          </div>
        </div>

        {/* Born From Mistake Context Note */}
        {rule.fromMistake && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/80 bg-muted/20 px-3 py-2 rounded-lg border border-border/40 italic">
            <Bookmark className="w-3.5 h-3.5 text-primary shrink-0" />
            <span><strong className="not-italic text-foreground/90 font-medium">Source:</strong> {rule.fromMistake}</span>
          </div>
        )}

        {/* Promote Notification Banner */}
        {promoteReady && (
          <div className="mt-4 flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-semibold shadow-inner">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Proven 2+ times in review. Ready to promote to <strong>Active Rule</strong>?</span>
            </div>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white h-7 px-3 text-xs font-bold"
              onClick={() => handleStatusChange(rule.id, "active")}
            >
              Promote Now
            </Button>
          </div>
        )}

        {/* Bottom Metrics Bar & Adjustment History */}
        <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
              <BookOpen className="w-3.5 h-3.5 text-primary" /> Reviewed: <strong className="text-foreground">{rule.reviewCount || 0}x</strong>
            </span>
            <span className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Followed: <strong className="text-foreground">{rule.followCount || 0}x</strong>
            </span>
            <span className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" /> Helped: <strong className="text-foreground">{rule.helpCount || 0}x</strong>
            </span>
          </div>

          {/* History Collapsible Button */}
          {history.length > 0 && (
            <div>
              <button
                onClick={() => setExpandedHistory(prev => ({ ...prev, [rule.id]: !prev[rule.id] }))}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-sans"
              >
                <History className="w-3.5 h-3.5 text-primary" />
                <span>{history.length} adjustment{history.length > 1 ? "s" : ""}</span>
                {isHistoryOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Expanded Adjustment History View */}
        {isHistoryOpen && history.length > 0 && (
          <div className="mt-3 space-y-2 border-l-2 border-primary/40 pl-3.5 pt-1 text-xs text-muted-foreground">
            {history.map((h: any, hi: number) => (
              <div key={hi} className="space-y-0.5 bg-muted/30 p-2.5 rounded-lg border border-border/30">
                <div className="font-semibold text-foreground font-mono">{new Date(h.date).toLocaleDateString()}</div>
                <div className="line-through opacity-70">Was: {h.oldCondition} ➔ {h.oldAction}</div>
                {h.note && <div className="italic text-primary/80">Note: {h.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">Rule Book</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
              MASTER CATALOG
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Rules forged from actual trade execution & mistakes, tracked and enforced over time.
          </p>
        </div>
        <Button onClick={() => setAdding(!adding)} size="lg" className="shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New Rule
        </Button>
      </div>

      {/* Stats Summary Cards (Cybernetic HUD Vibe) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-card/50 backdrop-blur-md border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Rules</p>
              <h3 className="text-2xl font-black font-mono text-foreground mt-1">{totalCount}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border-emerald-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Active</p>
              <h3 className="text-2xl font-black font-mono text-emerald-400 mt-1">{activeCount}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border-amber-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">In Testing</p>
              <h3 className="text-2xl font-black font-mono text-amber-400 mt-1">{testingCount}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border-slate-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Retired</p>
              <h3 className="text-2xl font-black font-mono text-slate-400 mt-1">{retiredCount}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-400">
              <Archive className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Rule Form Modal/Drawer */}
      {adding && (
        <Card className="border-primary/50 shadow-2xl bg-card/90 backdrop-blur-xl animate-in slide-in-from-top-4 duration-200">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base uppercase tracking-wider flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" /> Draft New Trading Rule
            </CardTitle>
            <CardDescription>Specify the trigger condition and your non-negotiable execution response.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> WHEN (Condition / Trigger)
              </Label>
              <Textarea
                placeholder="e.g. Price reaches key GEX level after 9:30 AM NY open..."
                value={form.condition}
                onChange={e => setForm({ ...form, condition: e.target.value })}
                className="bg-muted/20 resize-none h-20 border-border/80 focus:border-amber-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" /> THEN (Action / Execution Plan)
              </Label>
              <Textarea
                placeholder="e.g. Wait for orderbook absorption before placing limit order..."
                value={form.action}
                onChange={e => setForm({ ...form, action: e.target.value })}
                className="bg-muted/20 resize-none h-20 border-border/80 focus:border-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5" /> Born from mistake / Trade Note (Optional)
              </Label>
              <Input
                placeholder="e.g. Chased market order on Aug 28 and hit daily loss limit"
                value={form.fromMistake}
                onChange={e => setForm({ ...form, fromMistake: e.target.value })}
                className="bg-muted/20 border-border/80"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? "Saving..." : "Save Rule"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Sort Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search rules, triggers, or notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-card/50 border-border/60"
          />
        </div>

        {/* Sort Select Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="text-xs font-semibold bg-card border border-border/60 rounded-lg px-3 py-1.5 text-foreground outline-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="reviewed">Most Reviewed</option>
          </select>
        </div>
      </div>

      {/* Content Skeleton Loader */}
      {loading ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-7 w-24" />
              </div>
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : rules.length === 0 && !adding ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl bg-card/20 space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <h3 className="text-base font-bold text-foreground">Your Rule Book is empty</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Rules added from your Weekly Review or created manually will be tracked and displayed here.
          </p>
          <Button onClick={() => setAdding(true)} variant="outline" className="mt-2">
            <Plus className="w-4 h-4 mr-2" /> Add Your First Rule
          </Button>
        </div>
      ) : (
        /* Tabs Container (ALL, TESTING, ACTIVE, RETIRED) */
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-card/80 p-1 rounded-xl border border-border/60">
            <TabsTrigger value="all" className="font-bold text-xs">
              All ({filteredRules.length})
            </TabsTrigger>
            <TabsTrigger value="testing" className="font-bold text-xs text-amber-400 data-[state=active]:bg-amber-500/10">
              Testing ({testing.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="font-bold text-xs text-emerald-400 data-[state=active]:bg-emerald-500/10">
              Active ({active.length})
            </TabsTrigger>
            <TabsTrigger value="retired" className="font-bold text-xs text-slate-400 data-[state=active]:bg-slate-500/10">
              Retired ({retired.length})
            </TabsTrigger>
          </TabsList>

          {/* ALL Tab Content */}
          <TabsContent value="all" className="space-y-4">
            {filteredRules.length > 0 ? (
              <div className="space-y-4">
                {filteredRules.map((r, i) => <RuleCard key={r.id} rule={r} index={i} />)}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border/60 rounded-xl">
                No rules matching search criteria.
              </div>
            )}
          </TabsContent>

          {/* TESTING Tab Content */}
          <TabsContent value="testing" className="space-y-4">
            {testing.length > 0 ? (
              <div className="space-y-4">
                {testing.map((r, i) => <RuleCard key={r.id} rule={r} index={i} />)}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border/60 rounded-xl">
                No rules currently in testing phase.
              </div>
            )}
          </TabsContent>

          {/* ACTIVE Tab Content */}
          <TabsContent value="active" className="space-y-4">
            {active.length > 0 ? (
              <div className="space-y-4">
                {active.map((r, i) => <RuleCard key={r.id} rule={r} index={i} />)}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border/60 rounded-xl">
                No active rules yet. Test rules first to promote them here.
              </div>
            )}
          </TabsContent>

          {/* RETIRED Tab Content */}
          <TabsContent value="retired" className="space-y-4">
            {retired.length > 0 ? (
              <div className="space-y-4 opacity-75">
                {retired.map((r, i) => <RuleCard key={r.id} rule={r} index={i} />)}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border/60 rounded-xl">
                No retired rules.
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Delete Rule Confirmation Dialog */}
      <AlertDialog open={deleteRuleId !== null} onOpenChange={(open) => !open && setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this rule from your Rule Book?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteRuleId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
              onClick={() => {
                if (deleteRuleId) handleDelete(deleteRuleId)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}