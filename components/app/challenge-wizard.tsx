"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FIRMS, getFirm } from "@/lib/firms"
import { usePropStore } from "@/lib/store"
import { fmtCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Check, ArrowRight, ArrowLeft, ShieldAlert, Lock, Unlock, Sparkles, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { getRuleTemplates } from "@/app/actions/rule-actions"
import { Card, CardContent } from "@/components/ui/card"

export function ChallengeWizard() {
  const router = useRouter()
  const createAccount = usePropStore((s) => s.createAccount)
  const [step, setStep] = useState(1)
  const [firmId, setFirmId] = useState<string | null>(null)
  const [sizeLabel, setSizeLabel] = useState<string | null>(null)
  const [ruleTemplate, setRuleTemplate] = useState<string | null>(null)
  const [customTemplates, setCustomTemplates] = useState<any[]>([])

  // Custom Challenge Mode State
  const [useOfficialRules, setUseOfficialRules] = useState(true)
  const [customBalance, setCustomBalance] = useState("")
  const [customTarget, setCustomTarget] = useState("")
  const [customDrawdown, setCustomDrawdown] = useState("")
  const [customDailyLoss, setCustomDailyLoss] = useState("")
  const [customContracts, setCustomContracts] = useState("")
  const [customConsistency, setCustomConsistency] = useState("")
  const [customMinDays, setCustomMinDays] = useState("")

  useEffect(() => {
    getRuleTemplates().then(data => setCustomTemplates(data)).catch(console.error)
  }, [])

  const firm = firmId ? getFirm(firmId) : undefined
  const size = firm?.sizes.find((s) => s.label === sizeLabel)

  useEffect(() => {
    if (size) {
      setCustomBalance(String(size.rules.startingBalance))
      setCustomTarget(String(size.rules.profitTarget))
      setCustomDrawdown(String(size.rules.maxDrawdown))
      setCustomDailyLoss(String(size.rules.dailyLossLimit))
      setCustomContracts(String(size.rules.maxContracts))
      setCustomConsistency(String(size.rules.consistencyPct))
      setCustomMinDays(String(size.rules.minTradingDays))
    }
  }, [sizeLabel, firmId])

  const isCustomValid = () => {
    if (useOfficialRules) return true
    const bal = Number(customBalance)
    const tar = Number(customTarget)
    const dd = Number(customDrawdown)
    const con = Number(customContracts)
    const dl = Number(customDailyLoss)
    const md = Number(customMinDays)
    const cPct = Number(customConsistency)
    
    return (
      bal > 0 &&
      tar > 0 &&
      dd > 0 &&
      con >= 1 && con <= 100 &&
      dl >= 0 &&
      md >= 0 &&
      cPct >= 0 && cPct <= 100
    )
  }

  const activeRules = useOfficialRules || !size
    ? size?.rules
    : {
        startingBalance: Number(customBalance),
        profitTarget: Number(customTarget),
        maxDrawdown: Number(customDrawdown),
        dailyLossLimit: Number(customDailyLoss),
        maxContracts: Number(customContracts),
        consistencyPct: Number(customConsistency),
        minTradingDays: Number(customMinDays),
      }

  function finish() {
    if (!firmId || !sizeLabel || !size) return

    const challengeType = useOfficialRules ? "OFFICIAL" : "CUSTOM"
    const customOverrides: Record<string, any> = {}

    if (challengeType === "CUSTOM") {
      const bal = Number(customBalance)
      const tar = Number(customTarget)
      const dd = Number(customDrawdown)
      const dl = Number(customDailyLoss)
      const con = Number(customContracts)
      const cPct = Number(customConsistency)
      const md = Number(customMinDays)

      if (bal !== size.rules.startingBalance) customOverrides.startingBalance = bal
      if (tar !== size.rules.profitTarget) customOverrides.profitTarget = tar
      if (dd !== size.rules.maxDrawdown) customOverrides.maxDrawdown = dd
      if (dl !== size.rules.dailyLossLimit) customOverrides.dailyLossLimit = dl
      if (con !== size.rules.maxContracts) customOverrides.maxContracts = con
      if (cPct !== size.rules.consistencyPct) customOverrides.consistencyPct = cPct
      if (md !== size.rules.minTradingDays) customOverrides.minTradingDays = md
    }

    createAccount(firmId, sizeLabel, challengeType, customOverrides)
      .then(() => {
        toast.success(`Challenge started: ${firm!.shortName} ${sizeLabel} (${challengeType})`)
        if (ruleTemplate) {
          toast.info(`Applied Rule Engine: ${ruleTemplate.includes('custom_') ? customTemplates.find(t => t.id === ruleTemplate.split('_')[1])?.name : ruleTemplate}`)
        }
        router.push("/app")
      })
      .catch((err) => {
        toast.error(err.message || "Failed to start challenge")
      })
  }

  const stepLabels = ["Select Firm", "Account Size", "Rule Engine", "Review & Launch"]

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="border-b border-border/60 pb-6">
        <div className="flex items-center gap-2.5">
          <h1 className="text-3xl font-extrabold tracking-tight">New Challenge</h1>
          <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
            SIMULATOR WIZARD
          </span>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Configure a prop firm challenge evaluation with real-time rule engine telemetry.
        </p>
      </div>

      {/* Cybernetic Step Indicator Bar */}
      <div className="grid grid-cols-4 gap-2 bg-card/60 backdrop-blur-xl p-3 rounded-2xl border border-border/80">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black font-mono shrink-0 transition-all duration-300",
                step === s
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(56,189,248,0.4)] border border-primary-foreground/30"
                  : step > s
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-muted/40 text-muted-foreground border border-border/40",
              )}
            >
              {step > s ? <Check className="h-4 w-4 text-emerald-400" /> : s}
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground font-mono">STEP 0{s}</p>
              <p className={cn("text-xs font-bold truncate", step === s ? "text-foreground" : "text-muted-foreground/70")}>{stepLabels[s - 1]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Step Content Card Container */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl p-6 md:p-8 rounded-2xl">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> Choose Prop Firm
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Select the prop firm evaluation rules you wish to simulate.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {FIRMS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFirmId(f.id)
                    setSizeLabel(null)
                  }}
                  className={cn(
                    "flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 group relative overflow-hidden",
                    firmId === f.id
                      ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.15)]"
                      : "border-border/60 hover:border-primary/40 bg-card/40",
                  )}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-base font-black font-mono shrink-0 shadow-inner"
                    style={{ backgroundColor: `${f.color}25`, color: f.color, border: `1px solid ${f.color}40` }}
                  >
                    {f.shortName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-foreground truncate text-base">{f.name}</div>
                    <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
                      {f.drawdownType} · {f.difficulty}
                    </div>
                  </div>
                  {firmId === f.id && (
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && firm && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Select Account Capital Tier
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Choose starting account balance for {firm.name}.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {firm.sizes.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setSizeLabel(s.label)}
                  className={cn(
                    "rounded-2xl border p-5 text-left transition-all duration-200",
                    sizeLabel === s.label
                      ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.15)]"
                      : "border-border/60 hover:border-primary/40 bg-card/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black font-mono text-foreground">{s.label}</span>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border">{fmtCurrency(s.price)}</span>
                  </div>
                  <div className="mt-3 text-xs font-mono text-muted-foreground space-y-1">
                    <div className="flex justify-between"><span>Profit Target:</span> <strong className="text-emerald-400">{fmtCurrency(s.rules.profitTarget)}</strong></div>
                    <div className="flex justify-between"><span>Max Drawdown:</span> <strong className="text-rose-400">{fmtCurrency(s.rules.maxDrawdown)}</strong></div>
                    <div className="flex justify-between"><span>Contracts Limit:</span> <strong className="text-foreground">{s.rules.maxContracts} Max</strong></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" /> Rule Enforcement Mode
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Choose between official firm specs or customize rule parameters.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setUseOfficialRules(true)}
                className={cn(
                  "p-5 rounded-2xl border text-left transition-all",
                  useOfficialRules ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.15)]" : "border-border/60 bg-card/40"
                )}
              >
                <Lock className="w-5 h-5 text-primary mb-2" />
                <h3 className="font-bold text-foreground">Official Firm Rules</h3>
                <p className="text-xs text-muted-foreground mt-1">Use standard rule limits verified for {firm?.shortName}.</p>
              </button>

              <button
                onClick={() => setUseOfficialRules(false)}
                className={cn(
                  "p-5 rounded-2xl border text-left transition-all",
                  !useOfficialRules ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.15)]" : "border-border/60 bg-card/40"
                )}
              >
                <Unlock className="w-5 h-5 text-amber-400 mb-2" />
                <h3 className="font-bold text-foreground">Custom Rule Parameters</h3>
                <p className="text-xs text-muted-foreground mt-1">Override drawdown, daily loss limit, or contract caps.</p>
              </button>
            </div>

            {!useOfficialRules && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40 font-mono text-xs">
                <div>
                  <Label className="text-muted-foreground font-bold uppercase">Starting Balance ($)</Label>
                  <Input value={customBalance} onChange={e => setCustomBalance(e.target.value)} className="mt-1 bg-muted/20" />
                </div>
                <div>
                  <Label className="text-muted-foreground font-bold uppercase">Profit Target ($)</Label>
                  <Input value={customTarget} onChange={e => setCustomTarget(e.target.value)} className="mt-1 bg-muted/20 text-emerald-400 font-bold" />
                </div>
                <div>
                  <Label className="text-muted-foreground font-bold uppercase">Max Drawdown ($)</Label>
                  <Input value={customDrawdown} onChange={e => setCustomDrawdown(e.target.value)} className="mt-1 bg-muted/20 text-rose-400 font-bold" />
                </div>
                <div>
                  <Label className="text-muted-foreground font-bold uppercase">Daily Loss Limit ($)</Label>
                  <Input value={customDailyLoss} onChange={e => setCustomDailyLoss(e.target.value)} className="mt-1 bg-muted/20" />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && activeRules && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-400" /> Challenge Telemetry Summary
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Review your challenge parameters before initializing.</p>
            </div>

            <div className="p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">SELECTED FIRM:</span>
                <strong className="text-foreground font-bold">{firm?.name} ({sizeLabel})</strong>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">STARTING BALANCE:</span>
                <strong className="text-foreground font-bold">{fmtCurrency(activeRules.startingBalance)}</strong>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">PROFIT TARGET:</span>
                <strong className="text-emerald-400 font-bold">{fmtCurrency(activeRules.profitTarget)}</strong>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">MAX DRAWDOWN FLOOR:</span>
                <strong className="text-rose-400 font-bold">{fmtCurrency(activeRules.maxDrawdown)} ({firm?.drawdownType})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">MAX POSITION SIZE:</span>
                <strong className="text-foreground font-bold">{activeRules.maxContracts} Max Contracts</strong>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Wizard Controls */}
        <div className="flex justify-between items-center pt-6 border-t border-border/60 mt-8">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="font-bold">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          ) : <div />}

          {step < 4 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 1 && !firmId) || (step === 2 && !sizeLabel) || (step === 3 && !isCustomValid())}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={finish} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30">
              Launch Challenge Now <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
