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
  TrendingUp,
  AlertTriangle,
  Target,
  ShieldCheck,
  Zap,
  Activity,
  Layers
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

const STORAGE_KEY = "propsim-ai-coach-chat-history"

const SUGGESTION_PROMPTS = [
  {
    icon: Activity,
    label: "How am I trading overall from scratch to today?",
    color: "hover:border-primary/50 hover:bg-primary/5 text-primary"
  },
  {
    icon: AlertTriangle,
    label: "What is my #1 leak costing me money?",
    color: "hover:border-rose-500/50 hover:bg-rose-500/5 text-rose-400"
  },
  {
    icon: Target,
    label: "Analyze my Delta Reload and setup win rates",
    color: "hover:border-emerald-500/50 hover:bg-emerald-500/5 text-emerald-400"
  },
  {
    icon: ShieldCheck,
    label: "Check my prop firm consistency & drawdown risk",
    color: "hover:border-amber-500/50 hover:bg-amber-500/5 text-amber-400"
  },
  {
    icon: Zap,
    label: "How do hesitation and emotions affect my results?",
    color: "hover:border-purple-500/50 hover:bg-purple-500/5 text-purple-400"
  },
  {
    icon: Sparkles,
    label: "Give me 3 strict rules for my next trading session",
    color: "hover:border-blue-500/50 hover:bg-blue-500/5 text-blue-400"
  }
]

// ── Lightweight Rich Markdown Formatter ──────────────────────────────────────
function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n")

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-foreground">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />
        }

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-base font-bold text-foreground mt-3 mb-1 border-b border-border/40 pb-1 flex items-center gap-2">
              {renderBoldText(trimmed.replace(/^###\s*/, ""))}
            </h3>
          )
        }
        if (trimmed.startsWith("#### ")) {
          return (
            <h4 key={idx} className="text-sm font-semibold text-primary mt-2 mb-0.5">
              {renderBoldText(trimmed.replace(/^####\s*/, ""))}
            </h4>
          )
        }

        // Bullet lists
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          const itemText = trimmed.replace(/^[\*\-•]\s*/, "")
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-primary mt-1 text-xs">•</span>
              <div className="flex-1 text-sm">{renderBoldText(itemText)}</div>
            </div>
          )
        }

        // Numbered list
        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s*(.*)/)
          if (match) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-muted-foreground font-mono text-xs mt-0.5">{match[1]}.</span>
                <div className="flex-1 text-sm">{renderBoldText(match[2])}</div>
              </div>
            )
          }
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-sm">
            {renderBoldText(line)}
          </p>
        )
      })}
    </div>
  )
}

function renderBoldText(str: string) {
  // Regex to split by **bold** or *italic*
  const parts = str.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

export function AiCoachChat() {
  const activeAccountId = usePropStore((s) => s.activeAccountId)
  const accounts = usePropStore((s) => s.accounts)
  const trades = usePropStore((s) => s.trades)
  
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

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          return
        }
      }
    } catch {}

    // Default welcoming message
    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content: `### 👋 Hello! I am your PROPSIM AI Performance Coach.

I have synchronized and analyzed **all ${totalTradesCount} trades** from your account (*${currentAccount?.name || currentAccount?.sizeLabel || "Active Challenge"}*).

**How I can mentor you:**
* Ask me **"How am I trading overall from scratch to today?"** for a complete health check.
* Ask me to diagnose your **biggest behavioral leak** or analyze why certain trades were stopped out.
* Ask me about your **Delta Reload** setup edge or how trailing stops impact your expectancy.
* You can chat with me in **English, Tamil, or Tanglish**!

Click any quick prompt below or type your question to begin.`,
        timestamp: Date.now(),
        metadata: { provider: "PROPSIM", model: "Trade Intelligence Engine" }
      }
    ])
  }, [totalTradesCount, currentAccount?.id])

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
      } catch {}
    }
  }, [messages])

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

    try {
      const res = await fetch("/api/ai/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          accountId: activeAccountId
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
    if (window.confirm("Clear this AI Coach conversation history?")) {
      localStorage.removeItem(STORAGE_KEY)
      setMessages([
        {
          id: "welcome-reset",
          role: "assistant",
          content: `### 🔄 Session Reset\n\nChat history cleared. I am ready to analyze your latest trading records. How can I help you today?`,
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
    <div className="flex flex-col h-[750px] w-full rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* ── Context Ribbon & Header ─────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">AI Coach Live Assistant</h2>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] px-2 py-0.5 font-mono">
                Online &bull; Real-time Data
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span>Account: <strong className="text-foreground">{currentAccount?.name || currentAccount?.sizeLabel || "All Accounts"}</strong></span>
              <span>&bull;</span>
              <span>{totalTradesCount} Trades</span>
              <span>&bull;</span>
              <span>Win Rate: <strong className={winRate >= 50 ? "text-emerald-400" : "text-amber-400"}>{winRate.toFixed(1)}%</strong></span>
              <span>&bull;</span>
              <span>Net: <strong className={netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>+{totalNetR.toFixed(2)}R ({fmtCurrency(netPnl)})</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Chat
          </Button>
        </div>
      </div>

      {/* ── Chat Messages Scroll Area ───────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((m) => {
          const isUser = m.role === "user"

          return (
            <div
              key={m.id}
              className={cn(
                "flex items-start gap-3 max-w-[92%] sm:max-w-[82%]",
                isUser ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold shadow-md",
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/80 border border-border/80 text-primary"
                )}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  "group relative rounded-2xl p-4 shadow-sm transition-all",
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card/90 border border-border/80 rounded-tl-sm text-foreground hover:border-border"
                )}
              >
                {!isUser ? (
                  <div>
                    <FormattedMessage text={m.content} />
                    
                    {/* Assistant Message Footer */}
                    <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {m.metadata?.provider && (
                          <span className="font-mono text-[10px] opacity-75">
                            via {m.metadata.provider.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(m.id, m.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-foreground rounded flex items-center gap-1 text-[10px]"
                        title="Copy message"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          )
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-3 max-w-[80%] mr-auto">
            <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-muted/80 border border-border/80 text-primary">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-sm p-4 bg-card/90 border border-border/80 text-xs text-muted-foreground flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
              <span>AI Coach is compiling your trade logs and analyzing performance...</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Suggested Questions Carousel / Chips ────────────────────────────── */}
      <div className="px-4 py-2 bg-muted/10 border-t border-border/40 overflow-x-auto scrollbar-none flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary" /> Suggestions:
        </span>
        {SUGGESTION_PROMPTS.map((prompt, idx) => {
          const Icon = prompt.icon
          return (
            <button
              key={idx}
              disabled={loading}
              onClick={() => handleSend(prompt.label)}
              className={cn(
                "shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-border/60 bg-card/60 transition-all flex items-center gap-1.5",
                prompt.color
              )}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span>{prompt.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Input Box & Controls ────────────────────────────────────────────── */}
      <div className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20">
        <div className="flex items-end gap-2.5">
          <div className="flex-1 relative rounded-xl border border-border/80 bg-background/80 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything (e.g. 'How am I trading?', 'What is my biggest leak?', 'naa epdii trade pannren?')..."
              rows={2}
              className="w-full resize-none border-0 bg-transparent p-3 text-sm focus-visible:ring-0 focus-visible:outline-none min-h-[50px] max-h-[140px]"
            />
            <div className="absolute right-2.5 bottom-2 flex items-center gap-2 text-[10px] text-muted-foreground select-none">
              <span>Press <kbd className="font-mono bg-muted px-1 py-0.5 rounded">Enter</kbd> to send</span>
            </div>
          </div>

          <Button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="h-[52px] px-5 rounded-xl gap-2 font-semibold shadow-lg"
          >
            {loading ? (
              <span className="animate-spin">&bull;&bull;&bull;</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Ask Coach</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
