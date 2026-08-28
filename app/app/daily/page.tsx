"use client"

import React, { useState, useEffect, useMemo } from "react"
import { usePropStore } from "@/lib/store"
import { getDailyJournal, saveDailyJournal, uploadImageFormData } from "@/app/actions/journal-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Save, Loader2, ImageIcon, Upload, ChevronDown, ChevronUp, Link, Maximize2, ChevronRight, ArrowLeft, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Trade } from "@/lib/types"
import { cn } from "@/lib/utils"

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
      className={cn("resize-none overflow-hidden min-h-[40px] px-3 py-2", props.className)}
    />
  )
}

function JournalField({ title, colorClass, children, className }: { title: string, colorClass?: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col", className)}>
      <div className="px-4 py-2.5 bg-muted/30 border-b border-border/40 flex items-center gap-2">
        {colorClass && <span className={cn("w-2 h-2 rounded-full shrink-0", colorClass)} />}
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
      </div>
      <div className="p-3 flex-1 flex flex-col justify-start">
        {children}
      </div>
    </div>
  )
}

function ScreenshotGallery({ 
  screenshots, 
  onUpload, 
  onView,
  onDelete
}: { 
  screenshots: string[], 
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, 
  onView: (url: string) => void,
  onDelete?: (index: number) => void
}) {
  const id = React.useId()
  return (
    <div className="mt-4">
      {screenshots.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/40 rounded-xl py-8 text-center cursor-pointer hover:bg-muted/20 transition-colors group"
          onClick={() => document.getElementById(`upload-${id}`)?.click()}
        >
          <div className="w-12 h-12 rounded-full bg-muted/50 border border-border flex items-center justify-center group-hover:border-primary/30 transition-colors">
            <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Attach Chart Screenshot</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Click to upload image</p>
          </div>
          <input id={`upload-${id}`} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {screenshots.map((sc, idx) => (
            <div
              key={idx}
              className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer"
              onClick={() => onView(sc)}
            >
              <img src={sc} alt="Screenshot" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
              {onDelete && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    if (window.confirm("Are you sure you want to remove this screenshot?")) {
                      onDelete(idx)
                    }
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-destructive text-white rounded opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <label
            htmlFor={`upload-more-${id}`}
            className="aspect-video rounded-lg border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all group"
          >
            <Upload className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
            <span className="text-[10px] text-muted-foreground/50 font-medium group-hover:text-muted-foreground transition-colors">Add more</span>
            <input id={`upload-more-${id}`} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
          </label>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mt-8 mb-4">
      <div className="h-px flex-1 bg-border/60" />
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">{title}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  )
}

const today = () => new Date().toISOString().split("T")[0]

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ PDF-style per-trade accordion ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
function TradeListCard({ dayTrades, date }: { dayTrades: Trade[]; date: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setOpen(s => ({ ...s, [id]: !s[id] }))

  const gradeColor = (g?: string) => {
    if (!g) return "border-border text-muted-foreground"
    if (g === "A") return "border-green-500 text-green-400 bg-green-500/10"
    if (g === "B") return "border-blue-500 text-blue-400 bg-blue-500/10"
    if (g === "C") return "border-yellow-500 text-yellow-400 bg-yellow-500/10"
    return "border-red-500 text-red-400 bg-red-500/10"
  }

  const [viewImage, setViewImage] = useState<string | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)

  return (
      <>

        <SectionHeader title="Trade List" />
        <div>
          {dayTrades.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">No trades logged on {date}.</p>
          ) : (
            <div className="space-y-3">
              {dayTrades.map((t, idx) => {
                const setupName = t.playbookName ?? t.instrument
                const grade = t.psychology?.executionGrade
                const isOpen = !!open[t.id]
                const rMultiple = t.expectedRR

                const reasoning = t.reasonForEntry
                const expectation = (t as any).resultVsExpectation
                const mistakesVal = t.mistakes
                const improvementVal = (t as any).executionImprovement

                return (
                  <div key={t.id} className="border border-border/60 rounded-xl overflow-hidden bg-card/50">
                    {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Header row (always visible) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
                    <button
                      type="button"
                      onClick={() => toggle(t.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
                    >
                      <span className="font-bold tracking-wide text-foreground flex items-center gap-2">
                        <span className="text-muted-foreground/50">TRADE {idx + 1}</span> 
                        <span>{setupName?.toUpperCase()}</span>
                      </span>
                      <div className="flex items-center gap-4">
                        {grade && (
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider", gradeColor(grade))}>
                            {grade} Grade
                          </span>
                        )}
                        <span className={cn("font-mono font-bold text-[15px]", t.pnl >= 0 ? "text-green-400" : "text-red-400")}>
                          {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                        </span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Expanded detail (PDF template) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
                    {isOpen && (
                      <div className="border-t border-border/60 p-4 space-y-4 bg-muted/5 font-mono text-sm">
                        {/* Screenshot */}
                        {t.screenshots && t.screenshots.length > 0 && (
                          <div 
                            className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/20 cursor-pointer"
                            onClick={() => setViewImage(t.screenshots![0].url)}
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
                              {reasoning || <span className="italic text-muted-foreground/50">No reasoning provided</span>}
                            </div>
                          </div>

                          {/* Expectation */}
                          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400/70" /> Result vs expectation
                            </div>
                            <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                              {expectation || <span className="italic text-muted-foreground/50">No result provided</span>}
                            </div>
                          </div>

                          {/* Mistakes */}
                          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-destructive/70 mb-1.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-destructive/70" /> Mistakes
                            </div>
                            <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                              {mistakesVal || <span className="italic text-muted-foreground/50">No mistakes logged</span>}
                            </div>
                          </div>

                          {/* Improvement */}
                          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-warning/70 mb-1.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-warning/70" /> How execution could improve
                            </div>
                            <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-[13px]">
                              {improvementVal || <span className="italic text-muted-foreground/50">No improvement notes logged</span>}
                            </div>
                          </div>
                        </div>

                        {/* Footer stats */}
                        <div className="flex items-center justify-between pt-3 border-t border-border/40 font-sans mt-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">R-Multiple:</span>
                            <span className={cn("font-bold font-mono text-sm", rMultiple ? "text-foreground" : "text-muted-foreground")}>
                              {rMultiple ? rMultiple : "ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Process:</span>
                            <div className="flex gap-1">
                              {["A", "B", "C", "D"].map(g => (
                                <span key={g} className={cn(
                                  "w-6 h-6 flex items-center justify-center rounded text-[11px] font-bold border",
                                  grade === g ? gradeColor(g) : "border-border/40 text-muted-foreground/30 bg-muted/10"
                                )}>{g}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </>
    )
  }



export default function DailyJournalPage() {
  const [date, setDate] = useState(today())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const activeAccountId = usePropStore(s => s.activeAccountId)
  const allTrades = usePropStore(s => s.trades)

  // Trades for the selected date
  const dayTrades = allTrades.filter(t => {
    if (t.accountId !== activeAccountId) return false
    const d = new Date(Number(t.timestamp)).toISOString().split("T")[0]
    return d === date
  })

  // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ form state (maps 1:1 to DailyJournal model) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
  const [session, setSession] = useState("NY")
  const [instrument, setInstrument] = useState("")
  // Pre-Market Plan
  const [preMarketScreenshots, setPreMarketScreenshots] = useState<string[]>([])
  const [postSessionScreenshots, setPostSessionScreenshots] = useState<string[]>([])
  const [htfContext, setHtfContext] = useState("")
  const [keyLevels, setKeyLevels] = useState("")
  const [scenarioAIf, setScenarioAIf] = useState("")
  const [scenarioAThen, setScenarioAThen] = useState("")
  const [scenarioBIf, setScenarioBIf] = useState("")
  const [scenarioBThen, setScenarioBThen] = useState("")
  const [newsEventRisk, setNewsEventRisk] = useState("")
  const [riskPerTrade, setRiskPerTrade] = useState("")
  const [maxTrades, setMaxTrades] = useState("")
  const [maxDailyLoss, setMaxDailyLoss] = useState("")
  const [stateCheck, setStateCheck] = useState("")
  const [stateCheckNotes, setStateCheckNotes] = useState("")
  // Red-Day Checklist
  const [isRedDay, setIsRedDay] = useState(false)
  const [redQ1, setRedQ1] = useState("")
  const [redQ2, setRedQ2] = useState("")
  const [redQ3, setRedQ3] = useState("")
  const [redQ4, setRedQ4] = useState("")
  const [redVerdict, setRedVerdict] = useState("")
  const [redCorrectiveAction, setRedCorrectiveAction] = useState("")
  // Post-Session
  const [planAccuracy, setPlanAccuracy] = useState("")
  const [planAccuracyWhy, setPlanAccuracyWhy] = useState("")
  const [planAdherence, setPlanAdherence] = useState("")
  const [planAdherenceWhy, setPlanAdherenceWhy] = useState("")
  const [overallThoughtProcess, setOverallThoughtProcess] = useState("")
  const [tomorrowAdd, setTomorrowAdd] = useState("")
  const [tomorrowRemove, setTomorrowRemove] = useState("")
  const [tomorrowConsider, setTomorrowConsider] = useState("")
  const [netR, setNetR] = useState("")
  const [rulesBroken, setRulesBroken] = useState("")

  // Load from DB on date change
  useEffect(() => {
    setLoading(true)
    getDailyJournal(date).then(data => {
      if (data) {
        setSession(data.session ?? "NY")
        setInstrument(data.instrument ?? "")
        setHtfContext(data.htfContext ?? "")
        setKeyLevels(data.keyLevels ?? "")
        const [aIf = "", aThen = ""] = (data.scenarioA ?? "").split("|||")
        const [bIf = "", bThen = ""] = (data.scenarioB ?? "").split("|||")
        setScenarioAIf(aIf); setScenarioAThen(aThen)
        setScenarioBIf(bIf); setScenarioBThen(bThen)
        setNewsEventRisk(data.newsEventRisk ?? "")
        setRiskPerTrade(data.riskPerTrade ?? "")
        setMaxTrades(data.maxTrades?.toString() ?? "")
        setMaxDailyLoss(data.maxDailyLoss ?? "")
        setStateCheck(data.stateCheck?.toString() ?? "")
        setStateCheckNotes(data.stateCheckNotes ?? "")
        setIsRedDay(data.isRedDay ?? false)
        setRedQ1(data.redQ1LosingMore ?? "")
        setRedQ2(data.redQ2FollowedModel ?? "")
        setRedQ3(data.redQ3BlameRisk ?? "")
        setRedQ4(data.redQ4SleepCalm ?? "")
        setRedVerdict(data.redVerdict ?? "")
        setRedCorrectiveAction(data.redCorrectiveAction ?? "")
        setPlanAccuracy(data.planAccuracy?.toString() ?? "")
        setPlanAccuracyWhy(data.planAccuracyWhy ?? "")
        setPlanAdherence(data.planAdherence?.toString() ?? "")
        setPlanAdherenceWhy(data.planAdherenceWhy ?? "")
        setOverallThoughtProcess(data.overallThoughtProcess ?? "")
        setTomorrowAdd(data.tomorrowAdd ?? "")
        setTomorrowRemove(data.tomorrowRemove ?? "")
        setTomorrowConsider(data.tomorrowConsider ?? "")
        setNetR(data.netR ?? "")
        setRulesBroken(data.rulesBroken ?? "")
        setPreMarketScreenshots(data.preMarketScreenshots ?? [])
        setPostSessionScreenshots(data.postSessionScreenshots ?? [])
      } else {
        setSession("NY")
        setInstrument("")
        setHtfContext("")
        setKeyLevels("")
        setScenarioAIf(""); setScenarioAThen("")
        setScenarioBIf(""); setScenarioBThen("")
        setNewsEventRisk("")
        setRiskPerTrade("")
        setMaxTrades("")
        setMaxDailyLoss("")
        setStateCheck("")
        setStateCheckNotes("")
        setIsRedDay(false)
        setRedQ1(""); setRedQ2(""); setRedQ3(""); setRedQ4("")
        setRedVerdict("")
        setRedCorrectiveAction("")
        setPlanAccuracy(""); setPlanAccuracyWhy("")
        setPlanAdherence(""); setPlanAdherenceWhy("")
        setOverallThoughtProcess("")
        setTomorrowAdd(""); setTomorrowRemove(""); setTomorrowConsider("")
        setNetR("")
        setRulesBroken("")
        setPreMarketScreenshots([])
        setPostSessionScreenshots([])
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [date])

  const [uploadingImg, setUploadingImg] = useState(false)
  const handleUploadScreenshot = async (e: React.ChangeEvent<HTMLInputElement>, target: 'pre' | 'post') => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImg(true)
    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append("file", files[i])
        formData.append("prefix", "daily_" + target + "_" + date)
        const url = await uploadImageFormData(formData)
        newUrls.push(url)
      }
      if (target === 'pre') setPreMarketScreenshots((s: string[]) => [...s, ...newUrls])
      else setPostSessionScreenshots((s: string[]) => [...s, ...newUrls])
    } catch {
      toast.error("Image upload failed")
    } finally {
      setUploadingImg(false)
    }
    e.target.value = ""
  }

  const [viewImage, setViewImage] = useState<string | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const handleSave = async () => {
    setSaving(true)
    try {
      await saveDailyJournal(date, {
        session, instrument,
        htfContext, keyLevels,
        scenarioA: `${scenarioAIf}|||${scenarioAThen}`,
        scenarioB: `${scenarioBIf}|||${scenarioBThen}`,
        newsEventRisk, riskPerTrade,
        maxTrades: maxTrades ? parseInt(maxTrades) : null,
        maxDailyLoss,
        stateCheck: stateCheck ? parseInt(stateCheck) : null,
        stateCheckNotes, isRedDay,
        redQ1LosingMore: redQ1, redQ2FollowedModel: redQ2,
        redQ3BlameRisk: redQ3, redQ4SleepCalm: redQ4,
        redVerdict, redCorrectiveAction,
        planAccuracy: planAccuracy ? parseInt(planAccuracy) : null,
        planAccuracyWhy,
        planAdherence: planAdherence ? parseInt(planAdherence) : null,
        planAdherenceWhy, overallThoughtProcess,
        tomorrowAdd, tomorrowRemove, tomorrowConsider,
        netR, rulesBroken,
        preMarketScreenshots,
        postSessionScreenshots,
      })
      toast.success("Daily journal saved!")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "h-9 text-sm"
  const textCls = "text-sm bg-background border-input"

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Journal</h1>
          <p className="text-muted-foreground text-sm">Pre-market plan + post-session review</p>
        </div>
        <div className="flex items-center gap-3">
          <DatePicker value={date} onChange={setDate} className="w-[180px] bg-background" />
          <select value={session} onChange={e => setSession(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option>NY</option>
            <option>London</option>
            <option>Asia</option>
          </select>
          <Input className="h-10 text-sm w-36" placeholder="Instrument" value={instrument} onChange={e => setInstrument(e.target.value)} />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading...</p>}

      <SectionHeader title="Pre-Market Plan" />
      <div className="space-y-4">
        <JournalField title="HTF Context (balanced / imbalanced, prior value, overnight)" colorClass="bg-blue-400">
          <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={htfContext} onChange={e => setHtfContext(e.target.value)} placeholder="Describe higher-timeframe context..." />
        </JournalField>
        
        <JournalField title="Key Levels + Why They Matter" colorClass="bg-purple-400">
          <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={keyLevels} onChange={e => setKeyLevels(e.target.value)} placeholder="List key levels and their significance..." />
        </JournalField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <JournalField title="Scenario A" colorClass="bg-green-400">
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">IF</Label>
                <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm mt-1" value={scenarioAIf} onChange={e => setScenarioAIf(e.target.value)} placeholder="price does X..." />
              </div>
              <div className="h-px bg-border/40" />
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">THEN</Label>
                <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm mt-1" value={scenarioAThen} onChange={e => setScenarioAThen(e.target.value)} placeholder="I will look for Y..." />
              </div>
            </div>
          </JournalField>

          <JournalField title="Scenario B" colorClass="bg-amber-400">
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">IF</Label>
                <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm mt-1" value={scenarioBIf} onChange={e => setScenarioBIf(e.target.value)} placeholder="price does X..." />
              </div>
              <div className="h-px bg-border/40" />
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">THEN</Label>
                <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm mt-1" value={scenarioBThen} onChange={e => setScenarioBThen(e.target.value)} placeholder="I will look for Y..." />
              </div>
            </div>
          </JournalField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <JournalField title="News / Event Risk + Time" colorClass="bg-destructive">
            <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={newsEventRisk} onChange={e => setNewsEventRisk(e.target.value)} placeholder="e.g. NFP at 8:30 AM, FOMC at 2:00 PM" />
          </JournalField>
          
          <div className="grid grid-cols-3 gap-2">
            <JournalField title="Risk / Trade">
              <Input className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm font-bold font-mono h-auto" value={riskPerTrade} onChange={e => setRiskPerTrade(e.target.value)} placeholder="e.g. 1%" />
            </JournalField>
            <JournalField title="Max Trades">
              <Input type="number" className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm font-bold font-mono h-auto" value={maxTrades} onChange={e => setMaxTrades(e.target.value)} placeholder="3" />
            </JournalField>
            <JournalField title="Max Daily Loss">
              <Input className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm font-bold font-mono h-auto" value={maxDailyLoss} onChange={e => setMaxDailyLoss(e.target.value)} placeholder="e.g. 2R" />
            </JournalField>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-4">
          <JournalField title="State Check (1-10)">
            <Input type="number" min={1} max={10} className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-2xl font-bold font-mono h-auto" value={stateCheck} onChange={e => setStateCheck(e.target.value)} placeholder="-" />
          </JournalField>
          <JournalField title="Notes on State">
            <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={stateCheckNotes} onChange={e => setStateCheckNotes(e.target.value)} placeholder="How are you feeling mentally today?" />
          </JournalField>
        </div>

        <JournalField title="Pre-Market Charts" colorClass="bg-blue-400">
          <ScreenshotGallery 
            screenshots={preMarketScreenshots} 
            onUpload={(e) => handleUploadScreenshot(e, 'pre')} 
            onView={setViewImage} 
            onDelete={(idx) => setPreMarketScreenshots(s => s.filter((_, i) => i !== idx))}
          />
        </JournalField>
      </div>

      {/* -- TRADE LIST ----------------------------------------------------- */}
      <TradeListCard dayTrades={dayTrades} date={date} />

      <SectionHeader title="Red-Day Checklist" />
      <JournalField title="Was today a negative / red day?" className={cn("transition-colors", isRedDay ? "border-destructive/30" : "border-border/60")}>
        <label className="flex items-center gap-3 cursor-pointer py-1">
          <input type="checkbox" className="w-4 h-4 accent-destructive" checked={isRedDay} onChange={e => setIsRedDay(e.target.checked)} />
          <span className="text-sm font-medium">Yes, today was a red day</span>
        </label>
        
        {isRedDay && (
          <div className="mt-4 pt-4 border-t border-border/40 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Am I losing more than my last profitable day?", val: redQ1, set: setRedQ1 },
                { label: "Did I execute the setups following the model?", val: redQ2, set: setRedQ2 },
                { label: "Can I blame myself for risk management?", val: redQ3, set: setRedQ3 },
                { label: "Am I able to sleep calm?", val: redQ4, set: setRedQ4 },
              ].map(({ label, val, set }) => (
                <div key={label} className="bg-muted/10 p-3 rounded-lg border border-border/40 flex flex-col">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">{label}</Label>
                  <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={val} onChange={e => set(e.target.value)} placeholder="Your answer..." />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
              <div className="bg-muted/10 p-3 rounded-lg border border-border/40 flex flex-col justify-center">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Verdict</Label>
                <div className="flex gap-2">
                  {["Good process", "Bad process"].map(v => (
                    <button key={v} type="button" onClick={() => setRedVerdict(v)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${redVerdict === v ? (v === "Good process" ? "bg-green-500/20 text-green-500 border-green-500/50" : "bg-destructive/20 text-destructive border-destructive/50") : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-muted/10 p-3 rounded-lg border border-border/40 flex flex-col">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-destructive/70 block mb-2">Corrective Action</Label>
                <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={redCorrectiveAction} onChange={e => setRedCorrectiveAction(e.target.value)} placeholder="What will you change tomorrow?" />
              </div>
            </div>
          </div>
        )}
      </JournalField>

      <SectionHeader title="Post-Session Notes" />
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <JournalField title="Plan Accuracy (1 ... 10)">
            <div className="flex items-start gap-4 h-full">
              <Input type="number" min={1} max={10} className="w-16 border-0 bg-transparent focus-visible:ring-0 text-2xl font-bold font-mono h-auto" value={planAccuracy} onChange={e => setPlanAccuracy(e.target.value)} placeholder="-" />
              <div className="w-px self-stretch bg-border/40" />
              <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm flex-1" placeholder="Why?" value={planAccuracyWhy} onChange={e => setPlanAccuracyWhy(e.target.value)} />
            </div>
          </JournalField>
          <JournalField title="Plan Adherence (1 ... 10)">
            <div className="flex items-start gap-4 h-full">
              <Input type="number" min={1} max={10} className="w-16 border-0 bg-transparent focus-visible:ring-0 text-2xl font-bold font-mono h-auto" value={planAdherence} onChange={e => setPlanAdherence(e.target.value)} placeholder="-" />
              <div className="w-px self-stretch bg-border/40" />
              <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm flex-1" placeholder="Why?" value={planAdherenceWhy} onChange={e => setPlanAdherenceWhy(e.target.value)} />
            </div>
          </JournalField>
        </div>

        <JournalField title="Overall Thought Process" colorClass="bg-blue-400">
          <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={overallThoughtProcess} onChange={e => setOverallThoughtProcess(e.target.value)} placeholder="How did the session go overall?" />
        </JournalField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Tomorrow ... ADD", val: tomorrowAdd, set: setTomorrowAdd, color: "bg-green-400" },
            { label: "Tomorrow ... REMOVE", val: tomorrowRemove, set: setTomorrowRemove, color: "bg-destructive" },
            { label: "Tomorrow ... CONSIDER", val: tomorrowConsider, set: setTomorrowConsider, color: "bg-amber-400" },
          ].map(({ label, val, set, color }) => (
            <JournalField key={label} title={label} colorClass={color}>
              <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={val} onChange={e => set(e.target.value)} placeholder="..." />
            </JournalField>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-4">
          <JournalField title="Net R">
            <Input className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-2xl font-bold font-mono h-auto" value={netR} onChange={e => setNetR(e.target.value)} placeholder="-" />
          </JournalField>
          <JournalField title="Rules Broken" className="md:col-span-1">
            <AutoTextarea className="border-0 focus-visible:ring-1 focus-visible:ring-primary/30 bg-muted/20 dark:bg-input/40 text-sm" value={rulesBroken} onChange={e => setRulesBroken(e.target.value)} placeholder="Did you break any rules?" />
          </JournalField>
        </div>

        <JournalField title="Post-Session Charts" colorClass="bg-purple-400">
          <ScreenshotGallery 
            screenshots={postSessionScreenshots} 
            onUpload={(e) => handleUploadScreenshot(e, 'post')} 
            onView={setViewImage} 
            onDelete={(idx) => setPostSessionScreenshots(s => s.filter((_, i) => i !== idx))}
          />
        </JournalField>
      </div>

      <Dialog open={!!viewImage} onOpenChange={(o) => {
        if (!o) { setIsZoomed(false); setViewImage(null) }
      }}>
        <DialogContent 
          className="sm:max-w-[95vw] !max-w-[95vw] w-full max-h-[95vh] p-2 bg-black/95 border-border flex flex-col"
        >
          <div 
            className="flex-1 flex items-center justify-center overflow-auto p-2"
            onClick={() => setIsZoomed(!isZoomed)}
          >
            {viewImage && (
              <img
                src={viewImage}
                alt="Expanded screenshot"
                className={cn("rounded object-contain transition-all duration-300", isZoomed ? "max-h-none w-auto min-w-[150vw] cursor-zoom-out" : "max-h-[85vh] w-auto cursor-zoom-in")}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
