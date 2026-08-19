"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Save, Trash2, Edit } from "lucide-react"
import { toast } from "sonner"

export default function RuleBookPage() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  
  const [form, setForm] = useState({
    condition: "",
    action: "",
    fromMistake: "",
    status: "testing"
  })

  // We will simulate fetching from a real DB for now
  // In a real implementation, you'd use a server action.
  useEffect(() => {
    // Load rules from server action or use mock state for now since we just created the table
    // A proper implementation would fetch from prisma.RuleBook
    setRules([
      {
        id: "1",
        condition: "price is balanced",
        action: "prefer entries on the breakout and retest",
        fromMistake: "entered in middle of range",
        status: "active",
        createdAt: new Date().toISOString()
      }
    ])
  }, [])

  const handleSave = async () => {
    if (!form.condition || !form.action) {
      return toast.error("Condition and Action are required")
    }
    setLoading(true)
    
    // Simulating save since I don't have the server action built yet
    setTimeout(() => {
      setRules([...rules, {
        id: Date.now().toString(),
        ...form,
        createdAt: new Date().toISOString()
      }])
      setAdding(false)
      setForm({ condition: "", action: "", fromMistake: "", status: "testing" })
      setLoading(false)
      toast.success("Rule added to Rule Book")
    }, 500)
  }

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this rule?")) return
    setRules(rules.filter(r => r.id !== id))
    toast.success("Rule deleted")
  }

  const handleStatusChange = (id: string, status: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, status } : r))
    toast.success(`Status updated to ${status}`)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rule Book</h1>
          <p className="text-muted-foreground text-sm">Maintain one master list, dated, with the status of each rule.</p>
        </div>
        <Button onClick={() => setAdding(!adding)}>
          <Plus className="w-4 h-4 mr-2" /> New Rule
        </Button>
      </div>

      {adding && (
        <Card className="border-primary/50 shadow-sm mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider">Draft New Rule</CardTitle>
            <CardDescription>A rule must be written as a condition plus an action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">WHEN (Condition)</Label>
              <Textarea 
                placeholder="e.g. aggressive large trades show on the 1-minute"
                value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}
                className="bg-muted/20 resize-none h-20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">THEN (Action)</Label>
              <Textarea 
                placeholder="e.g. check effort vs result across more than one candle before accepting"
                value={form.action} onChange={e => setForm({...form, action: e.target.value})}
                className="bg-muted/20 resize-none h-20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Born from mistake</Label>
                <Input 
                  placeholder="e.g. got trapped in momentum ignition"
                  value={form.fromMistake} onChange={e => setForm({...form, fromMistake: e.target.value})}
                  className="bg-muted/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Initial Status</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background"
                  value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                >
                  <option value="testing">Testing (Weeks 1-3)</option>
                  <option value="active">Active (Survived 3 weeks)</option>
                  <option value="retired">Retired (Cost more than it saved)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="w-4 h-4 mr-2" /> Save Rule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {rules.map((rule, i) => (
          <div key={rule.id} className="relative group flex gap-4 p-5 rounded-xl border bg-card hover:border-primary/30 transition-colors">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-muted-foreground">Rule {i + 1}</span>
                <span className="text-[10px] text-muted-foreground/60">{new Date(rule.createdAt).toLocaleDateString()}</span>
              </div>
              
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                <span className="font-bold text-primary">WHEN</span>
                <span className="font-medium">{rule.condition}</span>
                <span className="font-bold text-primary">THEN</span>
                <span className="font-medium">{rule.action}</span>
              </div>

              {rule.fromMistake && (
                <div className="pt-2 text-xs text-muted-foreground flex gap-1">
                  <span className="opacity-70">(from:</span>
                  <span className="italic">{rule.fromMistake}</span>
                  <span className="opacity-70">)</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col justify-between items-end gap-2">
              <select 
                className={`text-xs font-bold uppercase tracking-wider border-0 rounded px-2 py-1 cursor-pointer ${rule.status === 'testing' ? 'bg-amber-500/20 text-amber-600' : rule.status === 'active' ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'}`}
                value={rule.status}
                onChange={(e) => handleStatusChange(rule.id, e.target.value)}
              >
                <option value="testing">Testing</option>
                <option value="active">Active</option>
                <option value="retired">Retired</option>
              </select>
              
              <button 
                onClick={() => handleDelete(rule.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-destructive hover:bg-destructive/10 rounded transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && !adding && (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
            <p>Your rule book is empty.</p>
            <p className="text-sm mt-1">Start converting repeated mistakes into testable rules.</p>
          </div>
        )}
      </div>
    </div>
  )
}
