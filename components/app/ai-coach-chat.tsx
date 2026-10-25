"use client"

import React, { useState, useEffect, useRef } from "react"
import { usePropStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  Send,
  Sparkles,
  RotateCcw,
  Bot,
  User,
  Copy,
  Check,
  AlertTriangle,
  Target,
  ShieldCheck,
  Zap,
  Activity,
  CornerDownLeft,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { fmtCurrency } from "@/lib/format"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  metadata?: {
    provider?: string
    model?: string
  }
}

const getStorageKey = (accId?: string | null) =>
  `propsim-ai-coach-chat-v2-${accId || "default"}`

const SUGGESTION_PROMPTS = [
  {
    icon: Activity,
    title: "Overall Health",
    prompt: "How am I trading overall from scratch to today?",
    color: "hover:border-primary/50 hover:bg-primary/5 text-primary border-border/70"
  },
  {
    icon: AlertTriangle,
    title: "My #1 Leak",
    prompt: "What is my #1 leak costing me money?",
    color: "hover:border-rose-500/50 hover:bg-rose-500/5 text-rose-400 border-border/70"
  },
  {
    icon: Target,
    title: "Delta Reload & Setups",
    prompt: "Analyze my Delta Reload and setup win rates",
    color: "hover:border-emerald-500/50 hover:bg-emerald-500/5 text-emerald-400 border-border/70"
  },
  {
    icon: ShieldCheck,
    title: "Prop Firm Consistency",
    prompt: "Check my prop firm consistency & drawdown risk",
    color: "hover:border-amber-500/50 hover:bg-amber-500/5 text-amber-400 border-border/70"
  },
  {
    icon: Zap,
    title: "Hesitation & Emotions",
    prompt: "How do hesitation and emotions affect my results?",
    color: "hover:border-purple-500/50 hover:bg-purple-500/5 text-purple-400 border-border/70"
  },
  {
    icon: Sparkles,
    title: "Next Session Rules",
    prompt: "Give me 3 strict rules for my next trading session",
    color: "hover:border-blue-500/50 hover:bg-blue-500/5 text-blue-400 border-border/70"
  }
]

// ── Inline Markdown Renderer (Bold, Inline Code, Italic) ─────────────────────
function renderInlineText(str: string) {
  // Regex to match **bold** or `code` or *italic*
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
        <code key={i} className="px-1.5 py-0.5 rounded bg-muted/70 font-mono text-xs text-primary border border-border/50 font-medium">
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

// ── Markdown Block Parser & Formatter ────────────────────────────────────────
function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Empty spacer line
    if (!trimmed) {
      elements.push(<div key={`spacer-${i}`} className="h-1.5" />)
      i++
      continue
    }

    // Markdown Table Detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim())
        i++
      }

      const validRows = tableLines.filter(l => !l.replace(/[\s|:-]/g, "").length === false)
      if (validRows.length >= 2) {
        const headerRow = validRows[0].split("|").slice(1, -1).map(c => c.trim())
        const dataRows = validRows.slice(1).map(r => r.split("|").slice(1, -1).map(c => c.trim()))

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-border/60 bg-muted/10 shadow-sm">
            <table className="w-full text-xs text-left border-collapse min-w-[280px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border/60">
                  {headerRow.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3 py-2 font-bold text-foreground whitespace-nowrap">
                      {renderInlineText(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-foreground/90 font-mono">
                        {renderInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        continue
      }
    }

    // Header 3 (###)
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-foreground mt-3 mb-1.5 border-b border-border/40 pb-1 flex items-center gap-2">
          {renderInlineText(trimmed.replace(/^###\s*/, ""))}
        </h3>
      )
      i++
      continue
    }

    // Header 4 (####)
    if (trimmed.startsWith("#### ")) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-sm font-bold text-primary mt-2.5 mb-1 flex items-center gap-1.5">
          {renderInlineText(trimmed.replace(/^####\s*/, ""))}
        </h4>
      )
      i++
      continue
    }

    // Bullet Lists (*, -, •)
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const bulletContent = trimmed.replace(/^[\*\-•]\s*/, "")
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2.5 pl-1.5 py-0.5 leading-relaxed">
          <span className="text-primary mt-1 text-xs shrink-0">&bull;</span>
          <div className="flex-1 text-sm break-words">
            {renderInlineText(bulletContent)}
          </div>
        </div>
      )
      i++
      continue
    }

    // Numbered List
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s*(.*)/)
      if (match) {
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-2.5 pl-1.5 py-0.5 leading-relaxed">
            <span className="text-primary font-mono text-xs mt-0.5 shrink-0 font-bold">{match[1]}.</span>
            <div className="flex-1 text-sm break-words">
              {renderInlineText(match[2])}
            </div>
          </div>
        )
        i++
        continue
      }
    }

    // Standard Paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed break-words">
        {renderInlineText(line)}
      </p>
    )
    i++
  }

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-foreground break-words w-full overflow-hidden">
      {elements}
    </div>
  )
}

// ── Main AI Coach Chat Component ─────────────────────────────────────────────
export function AiCoachChat({ accountId: propAccountId }: { accountId?: string } = {}) {
  const storeActiveAccountId = usePropStore((s) => s.activeAccountId)
  const accounts = usePropStore((s) => s.accounts)
  const trades = usePropStore((s) => s.trades)

  const activeAccountId = propAccountId || storeActiveAccountId
  const currentAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0]
  const accountTrades = trades.filter((t) => !activeAccountId || t.accountId === activeAccountId)

  // Calculations for Context Ribbon
  const totalTradesCount = accountTrades.length
  const winningCount = accountTrades.filter((t) => t.pnl > 0).length
  const winRate = totalTradesCount > 0 ? (winningCount / totalTradesCount) * 100 : 0
  const netPnl = accountTrades.reduce((s, t) => s + t.pnl, 0)
  const totalNetR = accountTrades.reduce((s, t) => s + (t.netR ?? (t.pnl / 100)), 0)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const currentStorageKey = getStorageKey(currentAccount?.id || activeAccountId)

  const scrollSuggestions = (direction: "left" | "right") => {
    if (suggestionsRef.current) {
      const scrollAmount = 260
      suggestionsRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      })
    }
  }

  // Load chat history from localStorage scoped to active account
  useEffect(() => {
    try {
      const saved = localStorage.getItem(currentStorageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          return
        }
      }
    } catch {}

    // Default welcoming message strictly anchored to active account metrics
    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content: `### 👋 Welcome! I am your PROPSIM AI Performance Coach.

I have synchronized **all ${totalTradesCount} logged trades** from your active account (**${currentAccount?.name || currentAccount?.sizeLabel || "Active Challenge"}**).

* **Account Status:** **${totalTradesCount} Trades** | **${winRate.toFixed(1)}% WR** | **${totalNetR >= 0 ? "+" : ""}${totalNetR.toFixed(2)} R (${fmtCurrency(netPnl)})**
* **Lifetime Health Check:** Ask *"How am I trading overall from scratch to today?"*
* **Leak Diagnosis:** Ask *"What is my #1 leak costing me money?"* to find premature entries or stop choking.
* **Edge Analysis:** Inquire about your setups to check their specific win rate and R expectancy.
* **Bilingual Support:** Feel free to ask in **English or Tamil / Tanglish** (*"naa epdii trade pannren?"*).

Click any quick suggestion chip below or type your question!`,
        timestamp: Date.now(),
        metadata: { provider: "PROPSIM", model: "Trade Intelligence Engine" }
      }
    ])
  }, [currentStorageKey, totalTradesCount, currentAccount?.id, currentAccount?.name])

  // Save chat history scoped to active account
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(currentStorageKey, JSON.stringify(messages))
      } catch {}
    }
  }, [messages, currentStorageKey])

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: Date.now()
    }

    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    const targetAccId = activeAccountId || currentAccount?.id

    try {
      const res = await fetch("/api/ai/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          accountId: targetAccId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to get AI Coach response")
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: Date.now(),
        metadata: data.metadata
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      toast.error(err.message || "Failed to communicate with AI Coach")
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ **Connection Issue:** Unable to reach the AI Coach service. Please verify your internet connection or check API keys in Settings → AI Settings.`,
          timestamp: Date.now()
        }
      ])
    } finally {
      setLoading(false)
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearHistory = () => {
    if (window.confirm("Clear this AI Coach conversation history for the current account?")) {
      try {
        localStorage.removeItem(currentStorageKey)
        localStorage.removeItem("propsim-ai-coach-chat-history")
      } catch {}

      setMessages([
        {
          id: "welcome-reset",
          role: "assistant",
          content: `### 🔄 Session Reset\n\nChat history cleared for **${currentAccount?.name || "Active Account"}**. Ready to analyze your **${totalTradesCount} logged trades** (${fmtCurrency(netPnl)} net P&L). How can I help you today?`,
          timestamp: Date.now()
        }
      ])
      toast.success("Chat history cleared")
    }
  }

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success("Response copied to clipboard")
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] min-h-[580px] max-h-[850px] w-full rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* ── Context Ribbon & Header ─────────────────────────────────────────── */}
      <div className="px-4 sm:px-5 py-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner shrink-0">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-foreground">AI Coach Live Assistant</h2>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] px-2 py-0.5 font-mono">
                Online &bull; Real-time Data
              </Badge>
            </div>
            
            {/* Context Telemetry Badges */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mt-1 text-xs">
              <span className="text-muted-foreground text-xs">
                {currentAccount?.name || currentAccount?.sizeLabel || "Active Challenge"}:
              </span>
              <Badge variant="outline" className="border-border/80 bg-card/70 text-[11px] font-mono px-2 py-0.5">
                {totalTradesCount} Trades
              </Badge>
              <Badge variant="outline" className={cn(
                "text-[11px] font-mono px-2 py-0.5",
                winRate >= 50 ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-amber-500/40 text-amber-400 bg-amber-500/10"
              )}>
                {winRate.toFixed(1)}% WR
              </Badge>
              <Badge variant="outline" className={cn(
                "text-[11px] font-mono px-2 py-0.5",
                netPnl >= 0 ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-rose-500/40 text-rose-400 bg-rose-500/10"
              )}>
                {totalNetR >= 0 ? "+" : ""}{totalNetR.toFixed(2)} R ({fmtCurrency(netPnl)})
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1.5 px-3 rounded-lg border-border/80"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </Button>
        </div>
      </div>

      {/* ── Chat Messages Scroll Area ───────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin">
        {messages.map((m) => {
          const isUser = m.role === "user"

          return (
            <div
              key={m.id}
              className={cn(
                "flex items-start gap-2.5 sm:gap-3 w-full",
                isUser ? "justify-end" : "justify-start"
              )}
            >
              {/* Avatar on Left for Assistant */}
              {!isUser && (
                <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-muted/80 border border-border/80 text-primary shadow-sm mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={cn(
                  "group relative rounded-2xl p-4 shadow-sm transition-all max-w-[94%] sm:max-w-[85%] break-words",
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-sm ml-auto"
                    : "bg-card/90 border border-border/80 rounded-tl-sm text-foreground hover:border-border"
                )}
              >
                {!isUser ? (
                  <div className="w-full space-y-2">
                    <FormattedMessage text={m.content} />
                    
                    {/* Assistant Message Footer */}
                    <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {m.metadata?.provider && (
                          <span className="font-mono text-[10px] opacity-75">
                            Engine: {m.metadata.provider.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(m.id, m.content)}
                        className="opacity-70 hover:opacity-100 transition-opacity p-1 hover:text-foreground rounded flex items-center gap-1 text-[11px]"
                        title="Copy message"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                )}
              </div>

              {/* Avatar on Right for User */}
              {isUser && (
                <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-primary text-primary-foreground shadow-sm mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          )
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-muted/80 border border-border/80 text-primary mt-0.5">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-sm p-4 bg-card/90 border border-border/80 text-xs text-muted-foreground flex items-center gap-2.5 shadow-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
              <span>AI Coach is analyzing all trades, setups, and psychology logs...</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Suggested Questions Carousel / Chips ────────────────────────────── */}
      <div className="relative px-3 sm:px-4 py-2 bg-muted/10 border-t border-border/40 flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary" /> Suggestions:
        </span>

        {/* Scroll Left Button */}
        <button
          type="button"
          onClick={() => scrollSuggestions("left")}
          aria-label="Scroll suggestions left"
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/50 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={suggestionsRef}
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY
            }
          }}
          className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none scroll-smooth py-1"
        >
          {SUGGESTION_PROMPTS.map((prompt, idx) => {
            const Icon = prompt.icon
            return (
              <button
                key={idx}
                type="button"
                disabled={loading}
                title={prompt.prompt}
                onClick={() => handleSend(prompt.prompt)}
                className={cn(
                  "shrink-0 text-xs px-2.5 py-1.5 rounded-lg border bg-card/80 hover:bg-card transition-all flex items-center gap-1.5 shadow-sm active:scale-95",
                  prompt.color
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap font-medium">{prompt.title}</span>
              </button>
            )
          })}
        </div>

        {/* Scroll Right Button */}
        <button
          type="button"
          onClick={() => scrollSuggestions("right")}
          aria-label="Scroll suggestions right"
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/50 transition-colors shadow-sm"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Input Box & Controls ────────────────────────────────────────────── */}
      <div className="p-3 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0">
        <div className="flex items-end gap-2.5">
          {/* Clean Textarea without any overlapping text or badges inside */}
          <div className="flex-1 rounded-xl border border-border/80 bg-background/90 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all p-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything (e.g. 'How am I trading?', 'What is my biggest leak?', 'naa epdii trade pannren?')..."
              rows={2}
              className="w-full resize-none border-0 bg-transparent p-2.5 text-sm focus-visible:ring-0 focus-visible:outline-none min-h-[48px] max-h-[140px] leading-relaxed"
            />
          </div>

          <Button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="h-[56px] px-5 rounded-xl gap-2 font-semibold shadow-lg shrink-0"
          >
            {loading ? (
              <span className="animate-spin text-base">&bull;&bull;&bull;</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Ask Coach</span>
              </>
            )}
          </Button>
        </div>

        {/* Dedicated Helper Hint Bar Below the Input — completely avoids text overlap */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-2.5 px-1">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3 h-3 text-primary shrink-0" />
            <span>Chat in English, Tamil, or Tanglish</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <kbd className="font-mono bg-muted/80 border border-border/80 px-1.5 py-0.5 rounded text-[10px] text-foreground font-semibold flex items-center gap-0.5">
              Enter <CornerDownLeft className="w-2.5 h-2.5" />
            </kbd>
            <span>send</span>
            <span className="opacity-40">&bull;</span>
            <kbd className="font-mono bg-muted/80 border border-border/80 px-1.5 py-0.5 rounded text-[10px] text-foreground font-semibold">
              Shift+Enter
            </kbd>
            <span>newline</span>
          </span>
        </div>
      </div>
    </div>
  )
}
