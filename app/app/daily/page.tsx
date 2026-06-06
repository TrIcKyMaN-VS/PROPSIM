"use client"

import { useState } from "react"
import { usePropStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Settings2, Plus, Trash2, Activity, TrendingUp, BarChart2 } from "lucide-react"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts"

export default function DailyRoutinePage() {
  const today = new Date().toISOString().split("T")[0]
  const routines = usePropStore(s => s.dailyPerformances)
  const addDailyPerformance = usePropStore(s => s.addDailyPerformance)
  const updateDailyPerformance = usePropStore(s => s.updateDailyPerformance)
  const routineConfig = usePropStore(s => s.routineConfig) || { morning: [], eod: [] }
  const setRoutineConfig = usePropStore(s => s.setRoutineConfig)
  
  const existing = routines.find(r => r.date === today)
  
  // Default values based on config
  const defaultMorning = routineConfig.morning.reduce((acc: any, task: string) => { acc[task] = false; return acc }, {})
  const defaultEod = routineConfig.eod.reduce((acc: any, task: string) => { acc[task] = false; return acc }, {})

  const [form, setForm] = useState(existing || {
    id: Math.random().toString(),
    date: today,
    sleepHours: 0,
    exercise: false,
    meditation: false,
    waterIntake: 0,
    mood: "",
    morningChecklist: JSON.stringify(defaultMorning),
    eodChecklist: JSON.stringify(defaultEod)
  })

  // Safely parse JSON or fallback to empty object if corrupt
  const parseJSON = (str: string) => { try { return JSON.parse(str || "{}") } catch { return {} } }
  const morning = parseJSON(form.morningChecklist)
  const eod = parseJSON(form.eodChecklist)

  const [isEditingConfig, setIsEditingConfig] = useState(false)
  const [configDraft, setConfigDraft] = useState({ ...routineConfig })

  const updateMorning = (key: string, val: boolean) => {
    setForm((s: any) => ({ ...s, morningChecklist: JSON.stringify({ ...parseJSON(s.morningChecklist), [key]: val }) }))
  }
  const updateEod = (key: string, val: boolean) => {
    setForm((s: any) => ({ ...s, eodChecklist: JSON.stringify({ ...parseJSON(s.eodChecklist), [key]: val }) }))
  }

  const handleSave = () => {
    if (existing) updateDailyPerformance(form)
    else addDailyPerformance(form)
    toast.success("Routine saved successfully!")
  }

  const saveConfig = () => {
    setRoutineConfig(configDraft)
    setIsEditingConfig(false)
    toast.success("Custom routine updated!")
  }

  // --- Analytics Data Prep ---
  // Create mock correlation data for charts
  const habitData = [
    { name: "< 5 hrs", winRate: 38 },
    { name: "5-6 hrs", winRate: 45 },
    { name: "6-7 hrs", winRate: 52 },
    { name: "7+ hrs", winRate: 67 },
  ]

  const completionData = [
    { day: "Mon", score: 85 },
    { day: "Tue", score: 90 },
    { day: "Wed", score: 75 },
    { day: "Thu", score: 100 },
    { day: "Fri", score: 80 },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Routine & Habits</h1>
          <p className="text-muted-foreground">Track your habits to see how they impact your win rate. Date: {today}</p>
        </div>
        <div className="flex gap-2">
          {isEditingConfig ? (
            <Button variant="outline" onClick={saveConfig}><Save className="w-4 h-4 mr-2" /> Save Config</Button>
          ) : (
            <Button variant="outline" onClick={() => setIsEditingConfig(true)}><Settings2 className="w-4 h-4 mr-2" /> Customize Routine</Button>
          )}
          <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Today</Button>
        </div>
      </div>

      <Tabs defaultValue="log" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="log">Routine Log</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Correlations</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-6">
          {isEditingConfig ? (
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <CardTitle>Routine Builder</CardTitle>
                <CardDescription>Customize your morning and end-of-day checklists. Unlimited tasks supported.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Morning Tasks</h3>
                  {configDraft.morning.map((task, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input value={task} onChange={e => {
                        const newArr = [...configDraft.morning]
                        newArr[idx] = e.target.value
                        setConfigDraft({...configDraft, morning: newArr})
                      }} />
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => {
                        setConfigDraft({...configDraft, morning: configDraft.morning.filter((_, i) => i !== idx)})
                      }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setConfigDraft({...configDraft, morning: [...configDraft.morning, "New Task"]})}>
                    <Plus className="w-4 h-4 mr-2" /> Add Morning Task
                  </Button>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">End of Day Tasks</h3>
                  {configDraft.eod.map((task, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input value={task} onChange={e => {
                        const newArr = [...configDraft.eod]
                        newArr[idx] = e.target.value
                        setConfigDraft({...configDraft, eod: newArr})
                      }} />
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => {
                        setConfigDraft({...configDraft, eod: configDraft.eod.filter((_, i) => i !== idx)})
                      }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setConfigDraft({...configDraft, eod: [...configDraft.eod, "New Task"]})}>
                    <Plus className="w-4 h-4 mr-2" /> Add EOD Task
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Morning Preparation</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {routineConfig.morning.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">No morning tasks defined. Click Customize Routine.</p>
                  ) : (
                    routineConfig.morning.map((task) => (
                      <label key={task} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors border bg-card">
                        <input type="checkbox" className="w-5 h-5 accent-primary" checked={!!morning[task]} onChange={e => updateMorning(task, e.target.checked)} />
                        <span className="font-medium text-sm leading-tight">{task}</span>
                      </label>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Habit Tracker</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Sleep Hours</span>
                    <Input type="number" className="w-24" value={form.sleepHours} onChange={e => setForm((s: any) => ({ ...s, sleepHours: parseFloat(e.target.value) }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Water Intake (Glasses)</span>
                    <Input type="number" className="w-24" value={form.waterIntake} onChange={e => setForm((s: any) => ({ ...s, waterIntake: parseInt(e.target.value) }))} />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="font-medium text-sm">Mood (1-10)</span>
                    <Input type="number" className="w-24" min="1" max="10" value={form.mood} onChange={e => setForm((s: any) => ({ ...s, mood: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded border bg-card hover:bg-muted/50 transition-colors">
                      <input type="checkbox" className="w-5 h-5 accent-primary" checked={form.exercise} onChange={e => setForm((s: any) => ({...s, exercise: e.target.checked}))} />
                      <span className="font-medium">Exercise</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded border bg-card hover:bg-muted/50 transition-colors">
                      <input type="checkbox" className="w-5 h-5 accent-primary" checked={form.meditation} onChange={e => setForm((s: any) => ({...s, meditation: e.target.checked}))} />
                      <span className="font-medium">Meditation</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader><CardTitle>End of Day Checklist</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {routineConfig.eod.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic col-span-2">No End of Day tasks defined. Click Customize Routine.</p>
                  ) : (
                    routineConfig.eod.map((task) => (
                      <label key={task} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors border bg-card">
                        <input type="checkbox" className="w-5 h-5 accent-primary" checked={!!eod[task]} onChange={e => updateEod(task, e.target.checked)} />
                        <span className="font-medium text-sm leading-tight">{task}</span>
                      </label>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Sleep vs Win Rate Correlation</CardTitle>
                <CardDescription>How your sleep hours affect your profitability.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={habitData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff'}} />
                    <Bar dataKey="winRate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart2 className="w-5 h-5 text-success" /> Routine Completion %</CardTitle>
                <CardDescription>Discipline score and habit consistency over the week.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={completionData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff'}} />
                    <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
