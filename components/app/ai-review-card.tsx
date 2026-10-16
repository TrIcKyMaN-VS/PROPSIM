"use client"

import React from "react"
import {
  CheckCircle2,
  AlertTriangle,
  Target,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Brain,
  ListOrdered,
} from "lucide-react"
import { cn } from "@/lib/utils"

function renderInlineText(str: string) {
  const parts = str.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g)

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-muted/70 font-mono text-xs text-cyan-400 border border-border/50 font-medium"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={i} className="italic text-foreground/90">
          {part.slice(1, -1)}
        </em>
      )
    }
    return part
  })
}

export function AiReviewFormatted({ text }: { text: string }) {
  if (!text) return null

  const lines = text.split("\n")
  const elements: React.ReactNode[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Empty space
    if (!trimmed) {
      elements.push(<div key={`spacer-${i}`} className="h-2" />)
      i++
      continue
    }

    // Main section headers (e.g. "**1. Plan Adherence:**" or "### 1. Plan Adherence" or "1. **Plan Adherence:**")
    const isMainSection =
      trimmed.match(/^\*\*(\d+\.\s*[^:*]+)[:*]/) ||
      trimmed.match(/^(\d+)\.\s*\*\*([^*]+)\*\*/) ||
      trimmed.startsWith("### ") ||
      trimmed.toLowerCase().includes("concrete action items")

    if (isMainSection) {
      let title = trimmed.replace(/^###\s*/, "")
      title = title.replace(/^\*\*/, "").replace(/\*\*$/, "")

      const isRisk = title.toLowerCase().includes("risk")
      const isAction = title.toLowerCase().includes("action")
      const isAdherence = title.toLowerCase().includes("adherence")
      const isExit = title.toLowerCase().includes("exit")

      elements.push(
        <div
          key={`header-${i}`}
          className={cn(
            "pt-3 pb-1.5 border-b flex items-center gap-2 mt-2",
            isRisk
              ? "border-amber-500/30 text-amber-400"
              : isAction
              ? "border-emerald-500/30 text-emerald-400"
              : isAdherence
              ? "border-primary/30 text-primary"
              : "border-border/50 text-foreground"
          )}
        >
          {isRisk ? (
            <ShieldAlert className="w-4 h-4 shrink-0" />
          ) : isAction ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : isExit ? (
            <Target className="w-4 h-4 shrink-0" />
          ) : (
            <Brain className="w-4 h-4 shrink-0 text-primary" />
          )}
          <span className="font-bold text-sm tracking-tight">{renderInlineText(trimmed)}</span>
        </div>
      )
      i++
      continue
    }

    // Bullet points (* or -)
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const content = trimmed.replace(/^[\*\-•]\s*/, "")
      const isSubBullet = line.startsWith("    ") || line.startsWith("\t") || line.startsWith("  *")

      elements.push(
        <div
          key={`bullet-${i}`}
          className={cn(
            "flex items-start gap-2.5 py-0.5 leading-relaxed text-xs sm:text-sm",
            isSubBullet ? "pl-5 text-muted-foreground" : "pl-1.5 text-foreground/90"
          )}
        >
          <span className="text-primary mt-1 text-xs shrink-0">&bull;</span>
          <div className="flex-1 break-words leading-relaxed">{renderInlineText(content)}</div>
        </div>
      )
      i++
      continue
    }

    // Numbered List (1. 2. 3.)
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s*(.*)/)
      if (match) {
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-2.5 pl-1.5 py-1 leading-relaxed text-xs sm:text-sm">
            <span className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-mono text-[11px] font-bold shrink-0 mt-0.5">
              {match[1]}
            </span>
            <div className="flex-1 break-words leading-relaxed">{renderInlineText(match[2])}</div>
          </div>
        )
        i++
        continue
      }
    }

    // Standard text line
    elements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm leading-relaxed text-foreground/90 break-words">
        {renderInlineText(line)}
      </p>
    )
    i++
  }

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed text-foreground break-words w-full">
      {elements}
    </div>
  )
}
