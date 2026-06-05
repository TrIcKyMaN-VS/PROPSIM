"use client"

import { useState } from "react"
import { usePropStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Save } from "lucide-react"

export default function DailyRoutinePage() {
  const today = new Date().toISOString().split("T")[0]
  const routines = usePropStore(s => s.dailyPerformances)
  const addDailyPerformance = usePropStore(s => s.addDailyPerformance)
  const updateDailyPerformance = usePropStore(s => s.updateDailyPerformance)
  
  const existing = routines.find(r => r.date === today)

  const [form, setForm] = useState(existing || {
    id: Math.random().toString(),
    date: today,
    sleepHours: 0,
    exercise: false,
    meditation: false,
    waterIntake: 0,
    mood: "",
    morningChecklist: JSON.stringify({
      sleepComplete: false,
      economicChecked: false,
      newsChecked: false,
      biasPrepared: false,
      riskPrepared: false
    }),
    eodChecklist: JSON.stringify({
      journalComplete: false,
      lessonsLogged: false,
      tradesReviewed: false,
      screenshotsUploaded: false
    })
  })

  const morning = JSON.parse(form.morningChecklist)
  const eod = JSON.parse(form.eodChecklist)

  const updateMorning = (key: string, val: boolean) => {
    setForm((s: any) => ({ ...s, morningChecklist: JSON.stringify({ ...JSON.parse(s.morningChecklist), [key]: val }) }))
  }
  const updateEod = (key: string, val: boolean) => {
    setForm((s: any) => ({ ...s, eodChecklist: JSON.stringify({ ...JSON.parse(s.eodChecklist), [key]: val }) }))
  }

  const handleSave = () => {
    if (existing) updateDailyPerformance(form)
    else addDailyPerformance(form)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Routine & Habits</h1>
          <p className="text-muted-foreground">Track your habits to see how they impact your win rate. Date: {today}</p>
        </div>
        <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Routine</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Morning Preparation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
              <input type="checkbox" className="w-5 h-5 accent-primary" checked={morning.sleepComplete} onChange={e => updateMorning("sleepComplete", e.target.checked)} />
              <span className="font-medium">Sleep Completed (7+ Hours)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
              <input type="checkbox" className="w-5 h-5 accent-primary" checked={morning.economicChecked} onChange={e => updateMorning("economicChecked", e.target.checked)} />
              <span className="font-medium">Economic Calendar Checked</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
              <input type="checkbox" className="w-5 h-5 accent-primary" checked={morning.newsChecked} onChange={e => updateMorning("newsChecked", e.target.checked)} />
              <span className="font-medium">Headline News Checked</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
              <input type="checkbox" className="w-5 h-5 accent-primary" checked={morning.biasPrepared} onChange={e => updateMorning("biasPrepared", e.target.checked)} />
              <span className="font-medium">Daily Bias Prepared</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
              <input type="checkbox" className="w-5 h-5 accent-primary" checked={morning.riskPrepared} onChange={e => updateMorning("riskPrepared", e.target.checked)} />
              <span className="font-medium">Risk Plan Prepared</span>
            </label>
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
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
              <input type="checkbox" className="w-5 h-5 accent-primary" checked={eod.journalComplete} onChange={e => updateEod("journalComplete", e.target.checked)} />
              <span className="font-medium">Trade Journal Completed</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
              <input type="checkbox" className="w-5 h-5 accent-primary" checked={eod.lessonsLogged} onChange={e => updateEod("lessonsLogged", e.target.checked)} />
              <span className="font-medium">Lessons Logged</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
              <input type="checkbox" className="w-5 h-5 accent-primary" checked={eod.tradesReviewed} onChange={e => updateEod("tradesReviewed", e.target.checked)} />
              <span className="font-medium">All Trades Reviewed</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
              <input type="checkbox" className="w-5 h-5 accent-primary" checked={eod.screenshotsUploaded} onChange={e => updateEod("screenshotsUploaded", e.target.checked)} />
              <span className="font-medium">Screenshots Uploaded</span>
            </label>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
