"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronDown, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const faqs = [
  {
    q: "Is PROPSIM affiliated with the prop firms?",
    a: "No. PROPSIM is an independent simulator. We model each firm's published evaluation rules so you can practice and plan, but we are not affiliated with or endorsed by any prop firm.",
  },
  {
    q: "How accurate are the rule simulations?",
    a: "We encode each firm's drawdown type (trailing, end-of-day, or static), profit targets, daily loss limits, consistency rules, and contract limits directly from their official documentation. When firms change rules, we update the engine.",
  },
  {
    q: "Can I import my real trades?",
    a: "Yes. The Trader plan and above support CSV import from common platforms. You can replay your real trading history against any firm's rule set to see if you would have passed.",
  },
  {
    q: "Does passing a simulation mean I'll pass the real eval?",
    a: "Not guaranteed, but it dramatically improves your odds. PROPSIM shows you exactly which rules you would have violated and when, so you can fix the behavior before risking real evaluation fees.",
  },
  {
    q: "What does the AI coach do?",
    a: "It analyzes your simulated trade history for risk patterns, like overtrading, oversized positions near drawdown limits, and consistency violations, then gives specific, actionable feedback.",
  },
]

export function FaqCta() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <>
      <section id="faq" className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:py-28">
          <div className="text-center">
            <p className="text-sm font-medium text-primary">FAQ</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions, answered
            </h2>
          </div>
          <div className="mt-10 flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div key={faq.q} className="rounded-xl border border-border bg-card">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="font-medium">{faq.q}</span>
                  <ChevronDown
                    className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open === i && "rotate-180")}
                  />
                </button>
                {open === i && (
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Stop donating fees to prop firms
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">
            Simulate your way to a funded account. Know the rules cold before you ever pay an evaluation fee.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/app">
                Launch the simulator <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/app/firms">Browse firms</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            P
          </div>
          <span className="font-semibold tracking-tight">PROPSIM</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Independent prop firm simulator. Not affiliated with any prop firm.
        </p>
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} PROPSIM</p>
      </div>
    </footer>
  )
}
