"use client"

import { useState } from "react"
import { usePropStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

export function PlaybookDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const createPlaybook = usePropStore(s => s.createPlaybook)

  const [form, setForm] = useState<{
    name: string
    category: string
    marketCondition: string
    session: string
    instrument: string
    entryRules: string
    exitRules: string
    riskRules: string
    checklist: (string | { text: string; required: boolean })[]
  }>({
    name: "",
    category: "Trend Following",
    marketCondition: "Trending",
    session: "New York AM",
    instrument: "ES",
    entryRules: "",
    exitRules: "",
    riskRules: "",
    checklist: [{ text: "", required: false }]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createPlaybook({
        ...form,
        checklist: form.checklist.filter((item: any) => typeof item === 'string' ? Boolean(item) : Boolean(item.text))
      })
      toast.success("Playbook created successfully")
      setOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to create playbook")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Playbook</Button>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Playbook</DialogTitle>
          <DialogDescription>Define the rules and conditions for your trading setup.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Setup Name</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. AM Breakout" required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Trend Following" required />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Instrument</Label>
              <Input value={form.instrument} onChange={e => setForm({...form, instrument: e.target.value})} placeholder="e.g. ES, NQ" required />
            </div>
            <div className="space-y-2">
              <Label>Session</Label>
              <Input value={form.session} onChange={e => setForm({...form, session: e.target.value})} placeholder="e.g. New York AM" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Entry Rules</Label>
            <Textarea value={form.entryRules} onChange={e => setForm({...form, entryRules: e.target.value})} placeholder="Define exact entry triggers..." required />
          </div>

          <div className="space-y-2">
            <Label>Exit Rules</Label>
            <Textarea value={form.exitRules} onChange={e => setForm({...form, exitRules: e.target.value})} placeholder="Define take profits and stop losses..." required />
          </div>

          <div className="space-y-2">
            <Label>Checklist Items</Label>
            {form.checklist.map((item: any, idx: number) => {
              const isObj = typeof item === 'object';
              const text = isObj ? item.text : item;
              const required = isObj ? item.required : false;
              return (
              <div key={idx} className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 accent-primary cursor-pointer shrink-0" 
                  checked={required}
                  onChange={e => {
                    const newChecklist = [...form.checklist]
                    newChecklist[idx] = { text, required: e.target.checked }
                    setForm({...form, checklist: newChecklist})
                  }}
                  title="Mark as required"
                />
                <Input value={text} onChange={e => {
                  const newChecklist = [...form.checklist]
                  newChecklist[idx] = { text: e.target.value, required }
                  setForm({...form, checklist: newChecklist})
                }} placeholder="e.g. Trend confirmed" required className="flex-1" />
                <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => {
                  const newChecklist = form.checklist.filter((_, i) => i !== idx)
                  setForm({...form, checklist: newChecklist})
                }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )})}
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setForm({...form, checklist: [...form.checklist, { text: "", required: false }]})}>
              <Plus className="w-3 h-3 mr-1" /> Add Item
            </Button>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Save Playbook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
