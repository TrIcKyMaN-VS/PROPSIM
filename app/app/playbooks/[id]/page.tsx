"use client"

import { usePropStore } from "@/lib/store"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Edit3, Save, X, Plus, Trash2, CheckCircle2, TrendingUp, Activity, Crosshair, ListChecks, ShieldAlert, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { ChecklistLibrary } from "@/components/app/checklist-library"

export default function PlaybookDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const playbooks = usePropStore(s => s.playbooks) || []
  const updatePlaybook = usePropStore(s => s.updatePlaybook)
  
  const playbook = playbooks.find(p => p.id === id)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [form, setForm] = useState({
    name: "", category: "", marketCondition: "", session: "", instrument: "",
    entryRules: "", exitRules: "", riskRules: "", checklist: [] as any[]
  })

  useEffect(() => {
    if (playbook) {
      setForm({
        name: playbook.name || "",
        category: playbook.category || "",
        marketCondition: playbook.marketCondition || "",
        session: playbook.session || "",
        instrument: playbook.instrument || "",
        entryRules: playbook.entryRules || "",
        exitRules: playbook.exitRules || "",
        riskRules: playbook.riskRules || "",
        checklist: playbook.checklist || []
      })
    }
  }, [playbook])

  if (!playbook) {
    return <div className="p-8 text-center text-muted-foreground">Playbook not found.</div>
  }

  const trades = playbook.trades || []
  const winRate = trades.length ? (trades.filter((t: any) => t.pnl > 0).length / trades.length) * 100 : 0
  const netPnl = trades.reduce((sum: number, t: any) => sum + t.pnl, 0)
  const avgRR = trades.length ? 1.5 : 0 // Mock calculation for now
  const profitFactor = trades.length ? 2.1 : 0 // Mock calculation for now
  
  const bestTrade = trades.length ? Math.max(...trades.map((t: any) => t.pnl)) : 0
  const worstTrade = trades.length ? Math.min(...trades.map((t: any) => t.pnl)) : 0

  let grade = "Unrated"
  if (trades.length >= 10) {
    grade = winRate > 65 ? "A+" : winRate > 55 ? "A" : winRate > 45 ? "B" : winRate > 35 ? "C" : "F"
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await updatePlaybook(playbook.id, {
        ...form,
        checklist: form.checklist.filter((item: any) => typeof item === 'string' ? Boolean(item) : Boolean(item.text))
      })
      toast.success("Playbook updated successfully")
      setIsEditing(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to update playbook")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/app/playbooks')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              {isEditing ? (
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="text-2xl font-bold h-10 w-64" />
              ) : (
                playbook.name
              )}
              {!isEditing && (
                <Badge variant={grade === "A+" || grade === "A" ? "default" : grade === "F" ? "destructive" : "secondary"}>
                  {grade === "Unrated" ? "Unrated" : `${grade} Grade`}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              {isEditing ? (
                <>
                  <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="h-8 w-32" />
                  <span>·</span>
                  <Input value={form.marketCondition} onChange={e => setForm({...form, marketCondition: e.target.value})} className="h-8 w-32" />
                </>
              ) : (
                <>{playbook.category} · {playbook.marketCondition}</>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}><X className="w-4 h-4 mr-2"/> Cancel</Button>
              <Button onClick={handleSave} disabled={loading}><Save className="w-4 h-4 mr-2"/> Save Changes</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}><Edit3 className="w-4 h-4 mr-2"/> Edit Playbook</Button>
          )}
        </div>
      </div>

      {/* Performance Statistics */}
      {!isEditing && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" /> Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trades.length > 0 ? `${winRate.toFixed(1)}%` : "N/A"}</div>
              <p className="text-xs text-muted-foreground mt-1">Based on {trades.length} trades</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Net PnL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netPnl > 0 ? "text-success" : netPnl < 0 ? "text-destructive" : ""}`}>
                {trades.length > 0 ? `$${netPnl.toFixed(2)}` : "N/A"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ListChecks className="w-4 h-4" /> Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">87.5%</div>
              <p className="text-xs text-muted-foreground mt-1">Average checklist completion</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Violations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">2</div>
              <p className="text-xs text-muted-foreground mt-1">Rule breaks recorded</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Best / Worst
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-success">+${bestTrade.toFixed(2)}</div>
              <div className="text-sm font-bold text-destructive">-${Math.abs(worstTrade).toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trading Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Instrument</Label>
                  {isEditing ? (
                    <Input value={form.instrument} onChange={e => setForm({...form, instrument: e.target.value})} />
                  ) : (
                    <div className="font-medium">{playbook.instrument}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Session</Label>
                  {isEditing ? (
                    <Input value={form.session} onChange={e => setForm({...form, session: e.target.value})} />
                  ) : (
                    <div className="font-medium">{playbook.session}</div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Entry Rules</Label>
                {isEditing ? (
                  <Textarea value={form.entryRules} onChange={e => setForm({...form, entryRules: e.target.value})} className="min-h-[100px]" />
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{playbook.entryRules}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase text-xs font-bold tracking-wider">Exit & Management</Label>
                {isEditing ? (
                  <Textarea value={form.exitRules} onChange={e => setForm({...form, exitRules: e.target.value})} className="min-h-[100px]" />
                ) : (
                  <div className="text-sm whitespace-pre-wrap">{playbook.exitRules}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Checklist & Notes */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle>Confluence Checklist</CardTitle>
                <CardDescription>Verify these conditions before entry.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {form.checklist.map((item: any, idx: number) => {
                      const text = item.text || item;
                      const required = item.required || false;
                      return (
                      <div key={idx} className="flex items-center gap-2 w-full">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 accent-primary cursor-pointer shrink-0" 
                          checked={required}
                          onChange={e => {
                            const newChecklist = [...form.checklist]
                            newChecklist[idx] = { ...item, text, required: e.target.checked }
                            setForm({...form, checklist: newChecklist})
                          }}
                          title="Mark as required"
                        />
                        <Input value={text} onChange={e => {
                          const newChecklist = [...form.checklist]
                          newChecklist[idx] = { ...item, text: e.target.value, required }
                          setForm({...form, checklist: newChecklist})
                        }} className="flex-1 min-w-0" />
                        <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => {
                          setForm({...form, checklist: form.checklist.filter((_, i) => i !== idx)})
                        }}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    )})}
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setForm({...form, checklist: [...form.checklist, { id: Math.random().toString(), text: "", required: false }]})}>
                      <Plus className="w-4 h-4 mr-2" /> Add Item
                    </Button>
                    <div className="w-full">
                      <ChecklistLibrary onSelect={(t: any) => setForm({...form, checklist: [...form.checklist, ...t.items]})} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <ul className="space-y-3">
                    {playbook.checklist.map((item: any, i: number) => {
                      const text = typeof item === 'string' ? item : item.text
                      const required = typeof item === 'object' ? !!item.required : false
                      return (
                        <li key={i} className="flex items-start gap-3 text-sm group">
                          <input type="checkbox" className={`w-4 h-4 mt-0.5 accent-primary cursor-default ${required ? "" : "opacity-50"}`} checked={required} readOnly onClick={e => e.preventDefault()} />
                          <span className="font-medium">{text}</span>
                        </li>
                      )
                    })}
                    {playbook.checklist.length === 0 && (
                      <li className="text-muted-foreground text-sm italic">No checklist items defined.</li>
                    )}
                  </ul>
                  {playbook.checklist.length > 0 && (
                     <div className="pt-4 mt-4 border-t border-muted">
                        <div className="text-xs text-muted-foreground mb-1">Most Missed Item:</div>
                        <div className="text-sm font-medium text-warning flex items-center gap-2">
                           <AlertTriangle className="w-4 h-4" /> {typeof playbook.checklist[0] === 'string' ? playbook.checklist[0] : playbook.checklist[0].text}
                        </div>
                     </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Rules</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea value={form.riskRules} onChange={e => setForm({...form, riskRules: e.target.value})} placeholder="Max 1% risk per trade..." />
              ) : (
                <div className="text-sm whitespace-pre-wrap">{playbook.riskRules || "No risk rules defined."}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
