"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Plus, Save, Trash2, ChevronDown, ChevronRight, History, Loader2 } from "lucide-react"
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

const STATUS_STYLES: Record<string, string> = {
  testing: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  active: "bg-success/15 text-success border-success/30",
  retired: "bg-muted text-muted-foreground border-border",
}

export default function RuleBookPage() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
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
    } catch (e) {
      toast.error("Failed to load rules")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.condition.trim() || !form.action.trim()) {
      return toast.error("WHEN and THEN are required")
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
      toast.success(`Status updated to ${status}`)
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

  const active = rules.filter(r => r.status === "active")
  const testing = rules.filter(r => r.status === "testing")
  const retired = rules.filter(r => r.status === "retired")

  const RuleCard = ({ rule, i }: { rule: any; i: number }) => {
    const history: any[] = rule.adjustmentHistory || []
    const isHistoryOpen = !!expandedHistory[rule.id]
    const promoteReady = rule.status === "testing" && rule.reviewCount >= 2 && rule.helpCount >= 2

    return (
      <div className="relative group flex gap-4 p-5 rounded-xl border bg-card hover:border-primary/20 transition-colors">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase text-muted-foreground">Rule {i + 1}</span>
            <span className="text-[10px] text-muted-foreground/60">{new Date(rule.createdAt).toLocaleDateString()}</span>
            {rule.weekAdded && <span className="text-[10px] text-muted-foreground/50">from {rule.weekAdded}</span>}
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <span className="font-bold text-primary">WHEN</span>
            <span className="font-medium">{rule.condition}</span>
            <span className="font-bold text-primary">THEN</span>
            <span className="font-medium">{rule.action}</span>
          </div>

          {rule.fromMistake && (
            <div className="text-xs text-muted-foreground italic">(from: {rule.fromMistake})</div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            <span>Reviewed {rule.reviewCount}x</span>
            <span>Followed {rule.followCount}x</span>
            <span>Helped {rule.helpCount}x</span>
          </div>

          {promoteReady && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20 text-xs text-success font-semibold">
              Helped 2+ times over 2+ weeks. Ready to promote to Active?
              <button
                onClick={() => handleStatusChange(rule.id, "active")}
                className="underline ml-1"
              >Promote</button>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <button
                onClick={() => setExpandedHistory(prev => ({ ...prev, [rule.id]: !prev[rule.id] }))}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <History className="w-3 h-3" />
                {history.length} adjustment{history.length > 1 ? "s" : ""} in history
                {isHistoryOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {isHistoryOpen && (
                <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
                  {history.map((h: any, hi: number) => (
                    <div key={hi} className="text-xs text-muted-foreground space-y-0.5">
                      <div className="font-semibold">{new Date(h.date).toLocaleDateString()}</div>
                      <div className="line-through opacity-60">Was: {h.oldCondition} / {h.oldAction}</div>
                      {h.note && <div className="italic">Note: {h.note}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between items-end gap-2">
          <select
            className={`text-xs font-bold uppercase tracking-wider border rounded px-2 py-1 cursor-pointer ${STATUS_STYLES[rule.status] || ""}`}
            value={rule.status}
            onChange={e => handleStatusChange(rule.id, e.target.value)}
          >
            <option value="testing">Testing</option>
            <option value="active">Active</option>
            <option value="retired">Retired</option>
          </select>
          <button
            onClick={() => setDeleteRuleId(rule.id)}
            className="opacity-0 group-hover:opacity-100 p-2 text-destructive hover:bg-destructive/10 rounded transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rule Book</h1>
          <p className="text-muted-foreground text-sm mt-1">One master list. Rules earned from real mistakes, tracked over time.</p>
        </div>
        <Button onClick={() => setAdding(!adding)}>
          <Plus className="w-4 h-4 mr-2" /> New Rule
        </Button>
      </div>

      {adding && (
        <Card className="border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider">Draft New Rule</CardTitle>
            <CardDescription>Write the rule as a condition and an action you commit to.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">WHEN (Condition)</Label>
              <Textarea
                placeholder="e.g. price is in a balanced range"
                value={form.condition}
                onChange={e => setForm({ ...form, condition: e.target.value })}
                className="bg-muted/20 resize-none h-20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">THEN (Action)</Label>
              <Textarea
                placeholder="e.g. wait for a breakout and retest before entering"
                value={form.action}
                onChange={e => setForm({ ...form, action: e.target.value })}
                className="bg-muted/20 resize-none h-20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Born from mistake (optional)</Label>
              <Input
                placeholder="e.g. kept entering mid-range and getting chopped"
                value={form.fromMistake}
                onChange={e => setForm({ ...form, fromMistake: e.target.value })}
                className="bg-muted/20"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? "Saving..." : "Save Rule"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-4 pt-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : rules.length === 0 && !adding ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
          <p>Your rule book is empty.</p>
          <p className="text-sm mt-1">Rules from your Weekly Review will appear here automatically.</p>
        </div>
      ) : (
        <Tabs defaultValue="testing" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="testing">
              Testing ({testing.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({active.length})
            </TabsTrigger>
            <TabsTrigger value="retired">
              Retired ({retired.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="testing" className="space-y-4">
            {testing.length > 0 ? (
              <div className="space-y-3">
                {testing.map((r, i) => <RuleCard key={r.id} rule={r} i={i + 1} />)}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                No rules currently in testing phase.
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {active.length > 0 ? (
              <div className="space-y-3">
                {active.map((r, i) => <RuleCard key={r.id} rule={r} i={i + 1} />)}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                No active rules yet. Test rules first to promote them here.
              </div>
            )}
          </TabsContent>

          <TabsContent value="retired" className="space-y-4">
            {retired.length > 0 ? (
              <div className="space-y-3 opacity-60">
                {retired.map((r, i) => <RuleCard key={r.id} rule={r} i={i + 1} />)}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
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
              Are you sure you want to permanently delete this rule from your rule book?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteRuleId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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