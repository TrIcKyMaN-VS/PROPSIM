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
import { Check, ArrowRight, ArrowLeft, ShieldAlert } from "lucide-react"
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

  useEffect(() => {
    getRuleTemplates().then(data => setCustomTemplates(data)).catch(console.error)
  }, [])

  const firm = firmId ? getFirm(firmId) : undefined
  const size = firm?.sizes.find((s) => s.label === sizeLabel)

  function finish() {
    if (!firmId || !sizeLabel) return
    createAccount(firmId, sizeLabel)
    toast.success(`Challenge started: ${firm!.shortName} ${sizeLabel}`)
    if (ruleTemplate) {
       toast.info(`Applied Rule Engine: ${ruleTemplate.includes('custom_') ? customTemplates.find(t => t.id === ruleTemplate.split('_')[1])?.name : ruleTemplate}`)
    }
    router.push("/app")
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
          </div>
        )}

        {step === 3 && firm && size && (
          <div>
            <h2 className="font-medium flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-primary" /> Apply Rule Set (Optional)</h2>
            <p className="text-sm text-muted-foreground mt-1">Attach an automated rule engine template to automatically validate trades and prevent tilt.</p>
            <div className="mt-6 max-w-md space-y-4">
               <div className="space-y-2">
                 <Label>Select Official or Custom Rules</Label>
                 <Select value={ruleTemplate || "none"} onValueChange={(v: string) => setRuleTemplate(v === "none" ? null : v)}>
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
                 <div className="p-4 bg-muted/30 border rounded-lg text-sm">
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

        {step === 4 && firm && size && (
          <div>
            <h2 className="font-medium">Review &amp; start</h2>
            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold shrink-0"
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
