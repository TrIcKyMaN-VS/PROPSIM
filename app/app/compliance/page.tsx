"use client"

import { useMemo } from "react"
import { usePropStore } from "@/lib/store"
import { getFirm } from "@/lib/firms"
import { evaluate } from "@/lib/rule-engine"
import type { RuleStatus, Violation } from "@/lib/rule-engine"
import { fmtCurrency, fmtPct } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  ShieldCheck,
  Trophy,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Target,
  Shield,
  Calendar,
  BarChart3,
  Layers,
  Zap,
  Clock,
  Info,
  Plus,
} from "lucide-react"
import Link from "next/link"

// ─── Colour zone helpers ────────────────────────────────────────────────────

function zoneColor(pct: number): "success" | "warning" | "destructive" {
  if (pct > 80) return "destructive"
  if (pct > 55) return "warning"
  return "success"
}

function zoneBg(zone: "success" | "warning" | "destructive") {
  return {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  }[zone]
}

function zoneText(zone: "success" | "warning" | "destructive") {
  return {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[zone]
}

function zoneBorder(zone: "success" | "warning" | "destructive") {
  return {
    success: "border-success/30",
    warning: "border-warning/30",
    destructive: "border-destructive/30",
  }[zone]
}

function zoneGlow(zone: "success" | "warning" | "destructive") {
  return {
    success: "bg-success/10",
    warning: "bg-warning/10",
    destructive: "bg-destructive/10",
  }[zone]
}

// ─── Segmented Arc SVG Gauge ─────────────────────────────────────────────────
// Renders a semi-circle arc with colour-coded segments and a needle

function ArcGauge({
  pct,
  zone,
  label,
}: {
  pct: number
  zone: "success" | "warning" | "destructive"
  label?: string
}) {
  const W = 160
  const H = 100
  const cx = W / 2
  const cy = H - 10
  const r = 70
  const strokeW = 12

  // Convert % (0-100) to angle: 0% = -180° (left), 100% = 0° (right)
  // Arc spans 180°. 0% → angle -π, 100% → angle 0
  function polarToXY(deg: number) {
    const rad = (deg * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  // Track segments: green 0-55%, yellow 55-80%, red 80-100%
  // In angle space: -180° → 0°
  // 0%   = -180°
  // 55%  = -180° + 55% × 180° = -81°
  // 80%  = -180° + 80% × 180° = -36°
  // 100% = 0°

  function segment(fromPct: number, toPct: number, color: string) {
    const fromDeg = -180 + fromPct * 1.8
    const toDeg = -180 + toPct * 1.8
    const from = polarToXY(fromDeg)
    const to = polarToXY(toDeg)
    const large = toPct - fromPct > 50 ? 1 : 0
    return (
      <path
        d={`M ${from.x} ${from.y} A ${r} ${r} 0 ${large} 1 ${to.x} ${to.y}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="butt"
        opacity={0.25}
      />
    )
  }

  // Active fill up to pct
  const activeDeg = -180 + Math.min(100, pct) * 1.8
  const activeFrom = polarToXY(-180)
  const activeTo = polarToXY(activeDeg)
  const activeColor =
    zone === "destructive"
      ? "oklch(0.62 0.22 22)"
      : zone === "warning"
        ? "oklch(0.78 0.15 80)"
        : "oklch(0.7 0.16 156)"

  // Needle
  const needleDeg = -180 + Math.min(100, pct) * 1.8
  const needleRad = (needleDeg * Math.PI) / 180
  const needleTip = {
    x: cx + (r - 4) * Math.cos(needleRad),
    y: cy + (r - 4) * Math.sin(needleRad),
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[160px]" aria-hidden>
      {/* Background track segments */}
      {segment(0, 55, "oklch(0.7 0.16 156)")}
      {segment(55, 80, "oklch(0.78 0.15 80)")}
      {segment(80, 100, "oklch(0.62 0.22 22)")}

      {/* Active fill */}
      {pct > 0 && (
        <path
          d={`M ${activeFrom.x} ${activeFrom.y} A ${r} ${r} 0 ${pct > 50 ? 1 : 0} 1 ${activeTo.x} ${activeTo.y}`}
          fill="none"
          stroke={activeColor}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
      )}

      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleTip.x}
        y2={needleTip.y}
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* Needle pivot */}
      <circle cx={cx} cy={cy} r={4} fill="white" opacity={0.9} />

      {/* Zone labels */}
      <text x={14} y={H - 2} fontSize={7} fill="oklch(0.7 0.16 156)" opacity={0.7}>
        Safe
      </text>
      <text x={W / 2 - 8} y={H - 2} fontSize={7} fill="oklch(0.78 0.15 80)" opacity={0.7}>
        Warn
      </text>
      <text x={W - 26} y={H - 2} fontSize={7} fill="oklch(0.62 0.22 22)" opacity={0.7}>
        Danger
      </text>
    </svg>
  )
}

// ─── Profit Target Gauge (blue) ───────────────────────────────────────────────

function ProfitGauge({ pct }: { pct: number }) {
  const W = 160
  const H = 100
  const cx = W / 2
  const cy = H - 10
  const r = 70
  const strokeW = 12

  function polarToXY(deg: number) {
    const rad = (deg * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const fromDeg = -180
  const toDeg = -180 + Math.min(100, pct) * 1.8
  const fromPt = polarToXY(fromDeg)
  const toPt = polarToXY(toDeg)
  const needlePt = polarToXY(toDeg)
  const needleRad = (toDeg * Math.PI) / 180
  const needleTip = {
    x: cx + (r - 4) * Math.cos(needleRad),
    y: cy + (r - 4) * Math.sin(needleRad),
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[160px]" aria-hidden>
      {/* Background track */}
      <path
        d={`M ${polarToXY(-180).x} ${polarToXY(-180).y} A ${r} ${r} 0 1 1 ${polarToXY(0).x} ${polarToXY(0).y}`}
        fill="none"
        stroke="oklch(0.62 0.19 256)"
        strokeWidth={strokeW}
        strokeLinecap="butt"
        opacity={0.2}
      />

      {/* Active fill */}
      {pct > 0 && (
        <path
          d={`M ${fromPt.x} ${fromPt.y} A ${r} ${r} 0 ${pct > 50 ? 1 : 0} 1 ${toPt.x} ${toPt.y}`}
          fill="none"
          stroke="oklch(0.62 0.19 256)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
      )}

      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleTip.x}
        y2={needleTip.y}
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.9}
      />
      <circle cx={cx} cy={cy} r={4} fill="white" opacity={0.9} />

      <text x={12} y={H - 2} fontSize={7} fill="oklch(0.62 0.19 256)" opacity={0.6}>
        0%
      </text>
      <text x={W / 2 - 8} y={H - 12} fontSize={7} fill="oklch(0.62 0.19 256)" opacity={0.6}>
        50%
      </text>
      <text x={W - 22} y={H - 2} fontSize={7} fill="oklch(0.62 0.19 256)" opacity={0.6}>
        100%
      </text>
    </svg>
  )
}

// ─── Gauge Card ───────────────────────────────────────────────────────────────

function GaugeCard({
  title,
  icon: Icon,
  pct,
  usedLabel,
  limitLabel,
  subLabel,
  variant = "zone",
}: {
  title: string
  icon: React.ElementType
  pct: number
  usedLabel: string
  limitLabel: string
  subLabel?: string
  variant?: "zone" | "profit"
}) {
  const zone = zoneColor(pct)

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 flex flex-col items-center gap-3",
        variant === "zone" ? zoneBorder(zone) : "border-primary/20",
      )}
    >
      <div className="flex items-center gap-2 self-start">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            variant === "zone" ? zoneGlow(zone) : "bg-primary/10",
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              variant === "zone" ? zoneText(zone) : "text-primary",
            )}
          />
        </div>
        <span className="text-sm font-semibold">{title}</span>
      </div>

      {/* Arc SVG */}
      <div className="w-full flex justify-center">
        {variant === "profit" ? (
          <ProfitGauge pct={pct} />
        ) : (
          <ArcGauge pct={pct} zone={zone} />
        )}
      </div>

      {/* Centre reading */}
      <div className="text-center -mt-2">
        <div
          className={cn(
            "text-3xl font-bold tabular-nums",
            variant === "zone" ? zoneText(zone) : "text-primary",
          )}
        >
          {fmtPct(pct, 1)}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">used</div>
      </div>

      {/* Used / Limit row */}
      <div className="w-full flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
        <div className="flex flex-col gap-0.5">
          <span className="uppercase font-bold text-[10px] text-muted-foreground/60">Used</span>
          <span className={cn("font-semibold", variant === "zone" ? zoneText(zone) : "text-primary")}>
            {usedLabel}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <span className="uppercase font-bold text-[10px] text-muted-foreground/60">Limit / Target</span>
          <span className="font-semibold">{limitLabel}</span>
        </div>
      </div>

      {subLabel && (
        <div className="text-[11px] text-muted-foreground/70 text-center">{subLabel}</div>
      )}
    </div>
  )
}

// ─── Flat Progress Bar ────────────────────────────────────────────────────────

function ProgressBar({
  pct,
  colorClass = "bg-primary",
}: {
  pct: number
  colorClass?: string
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn("h-full rounded-full transition-all duration-700", colorClass)}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  )
}

// ─── Status Banner ────────────────────────────────────────────────────────────

function StatusBanner({
  status,
  firmName,
  accountLabel,
  completionPct,
}: {
  status: RuleStatus["status"]
  firmName: string
  accountLabel: string
  completionPct: number
}) {
  const config = {
    active: {
      icon: TrendingUp,
      label: "In Progress",
      bg: "from-primary/20 to-primary/5",
      border: "border-primary/30",
      text: "text-primary",
      sub: "Your challenge is active. Monitor your limits carefully.",
    },
    passed: {
      icon: Trophy,
      label: "Challenge Passed! 🎉",
      bg: "from-success/20 to-success/5",
      border: "border-success/30",
      text: "text-success",
      sub: "Congratulations! All rules met. You're funded.",
    },
    failed: {
      icon: XCircle,
      label: "Challenge Failed",
      bg: "from-destructive/20 to-destructive/5",
      border: "border-destructive/30",
      text: "text-destructive",
      sub: "One or more hard rules were violated. Review violations below.",
    },
  }[status]

  const Icon = config.icon

  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br p-6 flex flex-col md:flex-row items-start md:items-center gap-5",
        config.bg,
        config.border,
      )}
    >
      {/* Icon bubble */}
      <div
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border",
          config.bg,
          config.border,
        )}
      >
        <Icon className={cn("h-8 w-8", config.text)} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className={cn("text-2xl font-bold", config.text)}>{config.label}</h2>
          <span className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-xs text-muted-foreground">
            {firmName} · {accountLabel}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{config.sub}</p>

        {/* Overall completion bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar
              pct={completionPct}
              colorClass={
                status === "failed"
                  ? "bg-destructive"
                  : status === "passed"
                    ? "bg-success"
                    : "bg-primary"
              }
            />
          </div>
          <span className={cn("shrink-0 text-sm font-bold tabular-nums", config.text)}>
            {completionPct.toFixed(1)}%
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">overall completion</span>
        </div>
      </div>
    </div>
  )
}

// ─── Violation Card ───────────────────────────────────────────────────────────

function ViolationCard({ v }: { v: Violation }) {
  const typeLabel: Record<Violation["type"], string> = {
    daily_loss: "Daily Loss",
    max_drawdown: "Max Drawdown",
    trailing_drawdown: "Trailing Drawdown",
    consistency: "Consistency",
    max_contracts: "Max Contracts",
    max_days: "Max Days",
    news: "News Restriction",
    trading_hours: "Trading Hours",
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/20">
        <AlertTriangle className="h-4 w-4 text-destructive" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-destructive">{v.label}</span>
          <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive uppercase tracking-wide">
            {typeLabel[v.type]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{v.detail}</p>
      </div>
    </div>
  )
}

// ─── Rules Summary Item ───────────────────────────────────────────────────────

function RuleItem({
  icon: Icon,
  label,
  value,
  sub,
  highlighted = false,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  highlighted?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        highlighted ? "border-primary/20 bg-primary/5" : "border-border bg-secondary/20",
      )}
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground uppercase font-bold mb-0.5">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const accounts = usePropStore((s) => s.accounts)
  const activeId = usePropStore((s) => s.activeAccountId)
  const trades = usePropStore((s) => s.trades)

  const account = accounts.find((a) => a.id === activeId)

  // ── Empty state ──
  if (!account) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-border bg-card py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-1">No active challenge</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create a challenge account first to see your compliance dashboard.
            </p>
          </div>
          <Link
            href="/app/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Challenge
          </Link>
        </div>
      </div>
    )
  }

  const firm = getFirm(account.firmId)
  const accountTrades = trades.filter((t) => t.accountId === account.id)
  const status = evaluate(account.rules, accountTrades)
  const r = account.rules

  // Derived
  // Use rule-engine computed values directly to avoid sign errors when account is profitable
  const dailyLossUsed = status.dailyLossUsed
  const drawdownUsed = status.drawdownUsed
  const profitEarned = Math.max(0, status.totalPnl)

  const ddZone = zoneColor(status.drawdownUsedPct)
  const dailyZone = zoneColor(status.dailyLossUsedPct)

  const consistencyBarPct =
    r.consistencyPct > 0
      ? Math.min(100, (status.consistencyPct / r.consistencyPct) * 100)
      : 0

  const drawdownTypeLabel: Record<string, string> = {
    trailing: "Trailing",
    static: "Static",
    eod: "EOD Trailing",
    intraday: "Intraday Trailing",
    hybrid: "Hybrid",
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Compliance Center</h1>
          </div>
          <p className="text-sm text-muted-foreground pl-10">
            Real-time prop firm rule monitoring
          </p>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live monitoring
        </div>
      </div>

      {/* ── Status Banner ─────────────────────────────────────────── */}
      <StatusBanner
        status={status.status}
        firmName={account.name ? "" : (firm?.name ?? account.firmId)}
        accountLabel={account.name || account.sizeLabel}
        completionPct={status.completionPct}
      />

      {/* ── Three Gauge Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Daily Loss Gauge */}
        <GaugeCard
          title="Daily Loss Limit"
          icon={AlertTriangle}
          pct={r.dailyLossLimit > 0 ? status.dailyLossUsedPct : 0}
          usedLabel={r.dailyLossLimit > 0 ? fmtCurrency(dailyLossUsed) : "N/A"}
          limitLabel={r.dailyLossLimit > 0 ? fmtCurrency(r.dailyLossLimit) : "None"}
          subLabel={
            r.dailyLossLimit > 0
              ? `${fmtCurrency(status.remainingDailyLoss)} remaining today`
              : "No daily loss limit for this plan"
          }
          variant="zone"
        />

        {/* Max Drawdown Gauge */}
        <GaugeCard
          title="Max Drawdown"
          icon={Shield}
          pct={status.drawdownUsedPct}
          usedLabel={fmtCurrency(drawdownUsed)}
          limitLabel={fmtCurrency(r.maxDrawdown)}
          subLabel={`${fmtCurrency(status.remainingDrawdown)} remaining · ${drawdownTypeLabel[r.drawdownType] ?? r.drawdownType}`}
          variant="zone"
        />

        {/* Profit Target Gauge */}
        <GaugeCard
          title="Profit Target"
          icon={Target}
          pct={status.profitTargetProgress}
          usedLabel={fmtCurrency(profitEarned, { sign: true })}
          limitLabel={fmtCurrency(r.profitTarget)}
          subLabel={`${fmtCurrency(status.profitRemaining)} to go`}
          variant="profit"
        />
      </div>

      {/* ── Middle Row: Consistency + Trading Days ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Consistency Rule */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
              <BarChart3 className="h-4 w-4 text-warning" />
            </div>
            <span className="font-semibold">Consistency Rule</span>
            <div className="ml-auto group relative">
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              <div className="absolute right-0 top-5 z-10 hidden w-60 rounded-lg border border-border bg-popover p-3 text-xs text-muted-foreground shadow-xl group-hover:block">
                Your largest winning day cannot exceed {r.consistencyPct > 0 ? `${r.consistencyPct}%` : "no limit"} of
                your total profit. This prevents a single lucky day from carrying the challenge.
              </div>
            </div>
          </div>

          {r.consistencyPct === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-4">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <div>
                <div className="text-sm font-medium text-success">No consistency rule</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  This plan has no consistency requirement — trade freely.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Largest winning day</span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    status.consistencyOk ? "text-success" : "text-destructive",
                  )}
                >
                  {fmtCurrency(status.largestWinningDay)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">As % of total profit</span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    status.consistencyOk ? "text-success" : "text-destructive",
                  )}
                >
                  {fmtPct(status.consistencyPct, 1)}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress toward limit</span>
                  <span>{fmtPct(consistencyBarPct, 0)} of max allowed</span>
                </div>
                <ProgressBar
                  pct={consistencyBarPct}
                  colorClass={status.consistencyOk ? "bg-success" : "bg-destructive"}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                <span>Allowed limit</span>
                <span className="font-semibold">&le; {r.consistencyPct}% of total profit</span>
              </div>

              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-3",
                  status.consistencyOk
                    ? "border-success/20 bg-success/5"
                    : "border-destructive/20 bg-destructive/5",
                )}
              >
                {status.consistencyOk ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    status.consistencyOk ? "text-success" : "text-destructive",
                  )}
                >
                  {status.consistencyOk ? "Consistency rule satisfied" : "Consistency rule violated"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Trading Days Progress */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">Trading Days</span>
          </div>

          {/* Big number display */}
          <div className="flex items-end gap-3">
            <div className="text-5xl font-bold tabular-nums text-primary">
              {status.tradingDays}
            </div>
            <div className="pb-1 text-sm text-muted-foreground">
              {r.minTradingDays > 0 ? (
                <>
                  / {r.minTradingDays}{" "}
                  <span className="text-xs">days required</span>
                </>
              ) : (
                <span className="text-xs">days traded</span>
              )}
            </div>
          </div>

          {r.minTradingDays > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress to minimum</span>
                <span>
                  {status.tradingDaysProgress.toFixed(0)}%
                  {status.tradingDays >= r.minTradingDays && " ✓"}
                </span>
              </div>
              <ProgressBar
                pct={status.tradingDaysProgress}
                colorClass={
                  status.tradingDays >= r.minTradingDays ? "bg-success" : "bg-primary"
                }
              />

              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-3 mt-2",
                  status.tradingDays >= r.minTradingDays
                    ? "border-success/20 bg-success/5"
                    : "border-border bg-secondary/30",
                )}
              >
                {status.tradingDays >= r.minTradingDays ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    status.tradingDays >= r.minTradingDays
                      ? "text-success"
                      : "text-muted-foreground",
                  )}
                >
                  {status.tradingDays >= r.minTradingDays
                    ? "Minimum trading days met"
                    : `${r.minTradingDays - status.tradingDays} more day${r.minTradingDays - status.tradingDays !== 1 ? "s" : ""} needed`}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-3">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span className="text-sm font-medium text-success">No minimum trading days required</span>
            </div>
          )}

          {r.maxTradingDays && (
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
              <span>Max allowed days</span>
              <span className={cn("font-semibold", status.tradingDays > r.maxTradingDays ? "text-destructive" : "")}>
                {status.tradingDays} / {r.maxTradingDays}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Violations Log ────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg",
              status.violations.length > 0 ? "bg-destructive/10" : "bg-success/10",
            )}
          >
            {status.violations.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-success" />
            )}
          </div>
          <span className="font-semibold">Violations Log</span>
          {status.violations.length > 0 && (
            <span className="ml-1 rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-bold text-destructive">
              {status.violations.length}
            </span>
          )}
        </div>

        {status.violations.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-5">
            <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
            <div>
              <div className="font-semibold text-success">No violations detected</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                You are trading within all firm rules. Keep it up!
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {status.violations.map((v, i) => (
              <ViolationCard key={i} v={v} />
            ))}
          </div>
        )}
      </div>

      {/* ── Rules Summary Card ────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
            <Zap className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="font-semibold">Challenge Rules Reference</span>
          <span className="ml-auto text-xs text-muted-foreground font-semibold">
            {account.name || `${firm?.name ?? account.firmId} · ${account.sizeLabel}`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <RuleItem
            icon={Target}
            label="Profit Target"
            value={fmtCurrency(r.profitTarget)}
            sub={`${fmtPct((r.profitTarget / r.startingBalance) * 100, 1)} of starting balance`}
            highlighted
          />

          <RuleItem
            icon={AlertTriangle}
            label="Daily Loss Limit"
            value={r.dailyLossLimit > 0 ? fmtCurrency(r.dailyLossLimit) : "No limit"}
            sub={
              r.dailyLossLimit > 0
                ? `${fmtPct((r.dailyLossLimit / r.startingBalance) * 100, 1)} of starting balance`
                : "This plan has no daily loss cap"
            }
          />

          <RuleItem
            icon={Shield}
            label="Max Drawdown"
            value={fmtCurrency(r.maxDrawdown)}
            sub={`${fmtPct((r.maxDrawdown / r.startingBalance) * 100, 1)} · ${drawdownTypeLabel[r.drawdownType] ?? r.drawdownType}`}
          />

          <RuleItem
            icon={Layers}
            label="Max Contracts"
            value={r.maxContracts > 0 ? `${r.maxContracts} contracts` : "No limit"}
            sub={
              r.maxContracts > 0
                ? `Currently using ${status.maxContractsUsed} (${fmtPct(status.contractUsagePct, 0)} of max)`
                : "Trade any size"
            }
          />

          <RuleItem
            icon={Calendar}
            label="Min Trading Days"
            value={r.minTradingDays > 0 ? `${r.minTradingDays} days` : "No minimum"}
            sub={
              r.minTradingDays > 0
                ? `${status.tradingDays} of ${r.minTradingDays} completed`
                : "Pass on any day"
            }
          />

          <RuleItem
            icon={BarChart3}
            label="Consistency Rule"
            value={r.consistencyPct > 0 ? `Max ${r.consistencyPct}% per day` : "No rule"}
            sub={
              r.consistencyPct > 0
                ? `Current: ${fmtPct(status.consistencyPct, 1)} · ${status.consistencyOk ? "✓ OK" : "✗ Violated"}`
                : "No consistency restriction"
            }
          />
        </div>

        {/* Starting balance footer */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Starting Balance</span>
          <span className="font-bold">{fmtCurrency(r.startingBalance)}</span>
        </div>
      </div>
    </div>
  )
}
