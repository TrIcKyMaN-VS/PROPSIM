"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FIRMS, getFirm } from "@/lib/firms"
import { usePropStore } from "@/lib/store"
import { fmtCurrency } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Check, ArrowRight, ArrowLeft, ShieldAlert, Lock, Unlock } from "lucide-react"
import { cn } from "@/lib/utils"
import { getRuleTemplates } from "@/app/actions/rule-actions"

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

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">New challenge</h1>
      <p className="mt-1 text-sm text-muted-foreground">Configure a simulated evaluation with automated rule enforcement.</p>

      {/* steps indicator */}
      <div className="mt-6 flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold shrink-0",
                step >= s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && <div className={cn("h-0.5 flex-1 rounded", step > s ? "bg-primary" : "bg-secondary")} />}
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
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold shrink-0"
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

            {sizeLabel && (
              <div className="mt-6 border-t pt-6 space-y-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="useOfficialRules"
                    checked={useOfficialRules}
                    onChange={(e) => {
                      setUseOfficialRules(e.target.checked)
                      if (!e.target.checked && size) {
                        setCustomBalance(String(size.rules.startingBalance))
                        setCustomTarget(String(size.rules.profitTarget))
                        setCustomDrawdown(String(size.rules.maxDrawdown))
                        setCustomDailyLoss(String(size.rules.dailyLossLimit))
                        setCustomContracts(String(size.rules.maxContracts))
                        setCustomConsistency(String(size.rules.consistencyPct))
                        setCustomMinDays(String(size.rules.minTradingDays))
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                  />
                  <label htmlFor="useOfficialRules" className="text-sm font-medium text-foreground cursor-pointer select-none">
                    Use Official Firm Rules (Recommended)
                  </label>
                </div>

                {!useOfficialRules && size && (
                  <div className="space-y-4 rounded-xl border border-warning/30 bg-warning/5 p-4 animate-in fade-in duration-200">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-warning-foreground">Custom Challenge Mode</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Custom Challenge Mode. Results may not match official prop firm evaluations.</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">Derived from: {firm.name} · {sizeLabel} Official</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Starting Balance ($)</Label>
                        <input
                          type="number"
                          value={customBalance}
                          onChange={(e) => setCustomBalance(e.target.value)}
                          className={cn(
                            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            Number(customBalance) <= 0 && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                        {Number(customBalance) <= 0 && <p className="text-[10px] text-destructive">Must be greater than 0</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Profit Target ($)</Label>
                        <input
                          type="number"
                          value={customTarget}
                          onChange={(e) => setCustomTarget(e.target.value)}
                          className={cn(
                            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            Number(customTarget) <= 0 && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                        {Number(customTarget) <= 0 && <p className="text-[10px] text-destructive">Must be greater than 0</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Max Drawdown ($)</Label>
                        <input
                          type="number"
                          value={customDrawdown}
                          onChange={(e) => setCustomDrawdown(e.target.value)}
                          className={cn(
                            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            Number(customDrawdown) <= 0 && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                        {Number(customDrawdown) <= 0 && <p className="text-[10px] text-destructive">Must be greater than 0</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Daily Loss Limit ($)</Label>
                        <input
                          type="number"
                          value={customDailyLoss}
                          onChange={(e) => setCustomDailyLoss(e.target.value)}
                          className={cn(
                            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            Number(customDailyLoss) < 0 && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                        {Number(customDailyLoss) < 0 && <p className="text-[10px] text-destructive">Must be 0 or greater</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Max Contracts</Label>
                        <input
                          type="number"
                          value={customContracts}
                          onChange={(e) => setCustomContracts(e.target.value)}
                          className={cn(
                            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            (Number(customContracts) < 1 || Number(customContracts) > 100) && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                        {(Number(customContracts) < 1 || Number(customContracts) > 100) && <p className="text-[10px] text-destructive">Must be between 1 and 100</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Consistency % (0 for none)</Label>
                        <input
                          type="number"
                          value={customConsistency}
                          onChange={(e) => setCustomConsistency(e.target.value)}
                          className={cn(
                            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            (Number(customConsistency) < 0 || Number(customConsistency) > 100) && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                        {(Number(customConsistency) < 0 || Number(customConsistency) > 100) && <p className="text-[10px] text-destructive">Must be between 0 and 100</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Minimum Trading Days</Label>
                        <input
                          type="number"
                          value={customMinDays}
                          onChange={(e) => setCustomMinDays(e.target.value)}
                          className={cn(
                            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            Number(customMinDays) < 0 && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                        {Number(customMinDays) < 0 && <p className="text-[10px] text-destructive">Must be 0 or greater</p>}
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomBalance(String(size.rules.startingBalance))
                          setCustomTarget(String(size.rules.profitTarget))
                          setCustomDrawdown(String(size.rules.maxDrawdown))
                          setCustomDailyLoss(String(size.rules.dailyLossLimit))
                          setCustomContracts(String(size.rules.maxContracts))
                          setCustomConsistency(String(size.rules.consistencyPct))
                          setCustomMinDays(String(size.rules.minTradingDays))
                          setUseOfficialRules(true)
                          toast.success("Rules restored to official defaults")
                        }}
                      >
                        Reset To Official Rules
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && firm && size && (
          <div>
            <h2 className="font-medium flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-primary" /> Apply Rule Set (Optional)</h2>
            <p className="text-sm text-muted-foreground mt-1">Attach an automated rule engine template to automatically validate trades and prevent tilt.</p>
            <div className="mt-6 max-w-md space-y-4">
               <div className="space-y-2">
                 <Label>Select Official or Custom Rules</Label>
                 <Select value={ruleTemplate || "none"} onValueChange={(v: string | null) => setRuleTemplate(!v || v === "none" ? null : v)}>
                   <SelectTrigger>
                     <SelectValue placeholder="None" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="none">None (Free trading)</SelectItem>
                     <SelectItem value="apex_official">Apex Official Enforcement</SelectItem>
                     <SelectItem value="topstep_official">Topstep Official Enforcement</SelectItem>
                     <SelectItem value="lucid_official">Lucid Official Enforcement</SelectItem>
                     <SelectItem value="personal_strict">Personal: Strict Discipline (Max 2 trades)</SelectItem>
                     {customTemplates.map(t => (
                       <SelectItem key={t.id} value={`custom_${t.id}`}>Custom: {t.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               
               {ruleTemplate && ruleTemplate.includes("official") && (
                 <div className="p-4 bg-muted/30 border rounded-lg text-sm animate-in fade-in duration-200">
                   <p className="font-semibold mb-2">Automated Enforcement Active:</p>
                   <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                     <li>Daily Loss Limit strictly enforced</li>
                     <li>Max Contracts enforced</li>
                     <li>EOD Trailing Drawdown lock engaged</li>
                   </ul>
                 </div>
               )}
            </div>
          </div>
        )}

        {step === 4 && firm && size && activeRules && (
          <div>
            <h2 className="font-medium">Review &amp; start</h2>
            
            {useOfficialRules ? (
              <div className="mt-4 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Official Firm Rules Mode
              </div>
            ) : (
              <div className="mt-4 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20 text-xs font-semibold text-warning inline-flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5" /> Custom Challenge Mode
              </div>
            )}

            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold shrink-0"
                  style={{ backgroundColor: `${firm.color}1a`, color: firm.color }}
                >
                  {firm.shortName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">
                    {firm.name} · {size.label} 
                    {!useOfficialRules && <span className="text-warning text-xs font-normal ml-1.5">(Custom)</span>}
                  </div>
                  <div className="text-xs capitalize text-muted-foreground">{firm.drawdownType} drawdown</div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Row label="Starting balance" value={fmtCurrency(activeRules.startingBalance)} locked={useOfficialRules} />
                <Row label="Profit target" value={fmtCurrency(activeRules.profitTarget)} locked={useOfficialRules} />
                <Row label="Max drawdown" value={fmtCurrency(activeRules.maxDrawdown)} locked={useOfficialRules} />
                <Row label="Daily loss" value={activeRules.dailyLossLimit > 0 ? fmtCurrency(activeRules.dailyLossLimit) : "None"} locked={useOfficialRules} />
                <Row label="Max contracts" value={`${activeRules.maxContracts}`} locked={useOfficialRules} />
                <Row label="Consistency rule" value={activeRules.consistencyPct > 0 ? `${activeRules.consistencyPct}%` : "None"} locked={useOfficialRules} />
                <Row label="Min trading days" value={`${activeRules.minTradingDays} days`} locked={useOfficialRules} />
                <Row label="Rule Engine" value={ruleTemplate ? ruleTemplate.replace("_", " ").toUpperCase() : "None"} />
              </dl>
            </div>
          </div>
        )}
      </div>

      {/* nav */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 1 && !firmId) || (step === 2 && (!sizeLabel || !isCustomValid()))}
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

function Row({ label, value, locked }: { label: string; value: string; locked?: boolean }) {
  return (
    <div className="flex flex-col rounded-lg bg-secondary/50 p-3 relative">
      <dt className="text-xs text-muted-foreground flex items-center gap-1.5">
        {label}
        {locked !== undefined && (
          locked ? <span title="Locked to official rules"><Lock className="h-3 w-3 text-muted-foreground/60" /></span> : <span title="Custom override active"><Unlock className="h-3 w-3 text-warning" /></span>
        )}
      </dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  )
}

