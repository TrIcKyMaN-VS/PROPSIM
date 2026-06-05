"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FIRMS, getFirm } from "@/lib/firms"
import { usePropStore } from "@/lib/store"
import { fmtCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Check, ArrowRight, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export function ChallengeWizard() {
  const router = useRouter()
  const createAccount = usePropStore((s) => s.createAccount)
  const [step, setStep] = useState(1)
  const [firmId, setFirmId] = useState<string | null>(null)
  const [sizeLabel, setSizeLabel] = useState<string | null>(null)

  const firm = firmId ? getFirm(firmId) : undefined
  const size = firm?.sizes.find((s) => s.label === sizeLabel)

  function finish() {
    if (!firmId || !sizeLabel) return
    createAccount(firmId, sizeLabel)
    toast.success(`Challenge started: ${firm!.shortName} ${sizeLabel}`)
    router.push("/app")
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">New challenge</h1>
      <p className="mt-1 text-sm text-muted-foreground">Configure a simulated evaluation in three quick steps.</p>

      {/* steps indicator */}
      <div className="mt-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                step >= s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={cn("h-0.5 flex-1 rounded", step > s ? "bg-primary" : "bg-secondary")} />}
          </div>
        ))}
      </div>

      <div className="mt-6">
        {step === 1 && (
          <div>
            <h2 className="font-medium">Choose a firm</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {FIRMS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFirmId(f.id)
                    setSizeLabel(null)
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                    firmId === f.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
                    style={{ backgroundColor: `${f.color}1a`, color: f.color }}
                  >
                    {f.shortName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{f.name}</div>
                    <div className="text-xs capitalize text-muted-foreground">{f.drawdownType} · {f.difficulty}</div>
                  </div>
                  {firmId === f.id && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && firm && (
          <div>
            <h2 className="font-medium">Choose account size</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {firm.sizes.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setSizeLabel(s.label)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    sizeLabel === s.label ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">{s.label}</span>
                    <span className="text-sm text-muted-foreground">{fmtCurrency(s.price)}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Target {fmtCurrency(s.rules.profitTarget)} · DD {fmtCurrency(s.rules.maxDrawdown)} · {s.rules.maxContracts} contracts
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && firm && size && (
          <div>
            <h2 className="font-medium">Review &amp; start</h2>
            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold"
                  style={{ backgroundColor: `${firm.color}1a`, color: firm.color }}
                >
                  {firm.shortName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{firm.name} · {size.label}</div>
                  <div className="text-xs capitalize text-muted-foreground">{firm.drawdownType} drawdown</div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Row label="Starting balance" value={fmtCurrency(size.rules.startingBalance)} />
                <Row label="Profit target" value={fmtCurrency(size.rules.profitTarget)} />
                <Row label="Max drawdown" value={fmtCurrency(size.rules.maxDrawdown)} />
                <Row label="Daily loss" value={size.rules.dailyLossLimit > 0 ? fmtCurrency(size.rules.dailyLossLimit) : "None"} />
                <Row label="Max contracts" value={`${size.rules.maxContracts}`} />
                <Row label="Min days" value={`${size.rules.minTradingDays}`} />
              </dl>
            </div>
          </div>
        )}
      </div>

      {/* nav */}
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {step < 3 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 1 && !firmId) || (step === 2 && !sizeLabel)}
          >
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finish}>Start challenge</Button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-lg bg-secondary/50 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  )
}
