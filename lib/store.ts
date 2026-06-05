"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ChallengeAccount, Trade, TradeDirection } from "./types"
import { getFirm, SESSIONS, INSTRUMENTS } from "./firms"
import { getAccounts, createAccount as createDbAccount, deleteAccount } from "@/app/actions/account-actions"
import { getTrades, addTrade as addDbTrade, deleteTrade as deleteDbTrade, importTradesBatch } from "@/app/actions/trade-actions"
import { getPlaybooks, createPlaybook as createDbPlaybook, deletePlaybook as deleteDbPlaybook, assignTradeToPlaybook as assignDbTrade, PlaybookInput } from "@/app/actions/playbook-actions"

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// ---- seed demo data so the app feels alive on first load ----
function seedTrades(accountId: string): Trade[] {
  const trades: Trade[] = []
  const base = Date.now() - 1000 * 60 * 60 * 24 * 9
  // crafted to be passing-ish but with a couple rough days
  const plan: { day: number; pnls: number[] }[] = [
    { day: 1, pnls: [320, -140, 410, 180] },
    { day: 2, pnls: [-220, 150, 260] },
    { day: 3, pnls: [540, -90, 120, 300] },
    { day: 4, pnls: [-310, -180, 240] },
    { day: 5, pnls: [420, 180, 90, -120, 260] },
    { day: 6, pnls: [610, 240, -150] },
    { day: 7, pnls: [180, -90, 320, 140] },
  ]
  let ts = base
  for (const d of plan) {
    d.pnls.forEach((pnl, i) => {
      const instrument = INSTRUMENTS[(d.day + i) % INSTRUMENTS.length]
      const direction: TradeDirection = (d.day + i) % 2 === 0 ? "long" : "short"
      const entry = 5000 + ((d.day * 17 + i * 7) % 400)
      const contracts = 1 + ((d.day + i) % 3)
      const exit = direction === "long" ? entry + pnl / (contracts * 50) : entry - pnl / (contracts * 50)
      ts += 1000 * 60 * 35
      trades.push({
        id: uid(),
        accountId,
        instrument,
        direction,
        entry: Math.round(entry * 100) / 100,
        exit: Math.round(exit * 100) / 100,
        contracts,
        pnl,
        day: d.day,
        timestamp: ts,
        session: SESSIONS[(d.day + i) % SESSIONS.length],
        tags: pnl > 0 ? ["A+ setup"] : ["managed"],
      })
    })
  }
  return trades
}

function makeAccount(firmId: string, sizeLabel: string): ChallengeAccount {
  const firm = getFirm(firmId)!
  const size = firm.sizes.find((s) => s.label === sizeLabel) ?? firm.sizes[0]
  return {
    id: uid(),
    firmId,
    sizeLabel: size.label,
    rules: size.rules,
    createdAt: Date.now(),
    status: "active",
  }
}

interface PropState {
  accounts: ChallengeAccount[]
  trades: Trade[]
  playbooks: any[]
  dailyPerformances: any[]
  tradePsychology: any[]
  tradeScreenshots: any[]
  lessonsLearned: any[]
  activeAccountId: string | null
  compareFirmIds: string[]
  seeded: boolean

  init: () => void
  syncWithDb: () => Promise<void>
  createAccount: (firmId: string, sizeLabel: string) => Promise<string>
  setActive: (id: string) => void
  removeAccount: (id: string) => Promise<void>
  addTrade: (t: Omit<Trade, "id" | "timestamp">) => Promise<void>
  removeTrade: (id: string) => Promise<void>
  importTrades: (rows: Omit<Trade, "id" | "accountId" | "timestamp">[], accountId: string) => Promise<void>
  assignTradeToPlaybook: (tradeId: string, playbookId: string | null) => Promise<void>
  createPlaybook: (data: PlaybookInput) => Promise<void>
  removePlaybook: (id: string) => Promise<void>
  
  addDailyPerformance: (dp: any) => void
  updateDailyPerformance: (dp: any) => void
  saveTradePsychology: (tp: any) => void
  addScreenshot: (ts: any) => void
  saveLesson: (lesson: any) => void
  
  toggleCompare: (firmId: string) => void
  tradesFor: (accountId: string) => Trade[]
}

export const usePropStore = create<PropState>()(
  persist(
    (set, get) => ({
      accounts: [],
      trades: [],
      playbooks: [],
      dailyPerformances: [],
      tradePsychology: [],
      tradeScreenshots: [],
      lessonsLearned: [],
      activeAccountId: null,
      compareFirmIds: ["apex", "topstep", "mffu", "tradeday"],
      seeded: false,

      init: () => {
        // We will call syncWithDb from a component useEffect
      },

      syncWithDb: async () => {
        try {
          const dbAccounts = await getAccounts()
          const dbTrades = await getTrades()
          const dbPlaybooks = await getPlaybooks()
          // parse rules back to object for accounts
          const parsedAccounts = dbAccounts.map(a => ({
            ...a,
            rules: JSON.parse(a.rules as any),
            createdAt: Number(new Date(a.createdAt).getTime())
          })) as any as ChallengeAccount[]
          
          set({
            accounts: parsedAccounts,
            trades: dbTrades,
            playbooks: dbPlaybooks,
            activeAccountId: parsedAccounts[0]?.id || null,
            seeded: true
          })
        } catch (e) {
          // not logged in or error
        }
      },

      createAccount: async (firmId, sizeLabel) => {
        const dbAcc = await createDbAccount(firmId, sizeLabel)
        const acc = { ...dbAcc, rules: JSON.parse(dbAcc.rules as any), createdAt: Number(new Date(dbAcc.createdAt).getTime()) } as any as ChallengeAccount
        set((s) => ({ accounts: [...s.accounts, acc], activeAccountId: acc.id }))
        return acc.id
      },

      setActive: (id) => set({ activeAccountId: id }),

      removeAccount: async (id) => {
        await deleteAccount(id)
        set((s) => {
          const accounts = s.accounts.filter((a) => a.id !== id)
          return {
            accounts,
            trades: s.trades.filter((t) => t.accountId !== id),
            activeAccountId: s.activeAccountId === id ? (accounts[0]?.id ?? null) : s.activeAccountId,
          }
        })
      },

      addTrade: async (t) => {
        const dbTrade = await addDbTrade(t)
        set((s) => ({ trades: [...s.trades, dbTrade] }))
      },

      removeTrade: async (id) => {
        await deleteDbTrade(id)
        set((s) => ({ trades: s.trades.filter((t) => t.id !== id) }))
      },

      importTrades: async (rows, accountId) => {
        await importTradesBatch(accountId, rows)
        // re-sync to get generated IDs and timestamps safely
        get().syncWithDb()
      },

      assignTradeToPlaybook: async (tradeId, playbookId) => {
        await assignDbTrade(tradeId, playbookId)
        set((s) => ({
          trades: s.trades.map(t => t.id === tradeId ? { ...t, playbookId } : t)
        }))
      },

      createPlaybook: async (data) => {
        const pb = await createDbPlaybook(data)
        set((s) => ({ playbooks: [pb, ...s.playbooks] }))
      },

      removePlaybook: async (id) => {
        set((s) => ({ playbooks: s.playbooks.filter((p) => p.id !== id) }))
        await deleteDbPlaybook(id)
      },

      addDailyPerformance: (dp) => set((s) => ({ dailyPerformances: [...s.dailyPerformances, dp] })),
      updateDailyPerformance: (dp) => set((s) => ({ dailyPerformances: s.dailyPerformances.map((d) => (d.id === dp.id ? dp : d)) })),
      saveTradePsychology: (tp) => set((s) => {
        const exists = s.tradePsychology.find(x => x.tradeId === tp.tradeId)
        if (exists) return { tradePsychology: s.tradePsychology.map(x => x.tradeId === tp.tradeId ? tp : x) }
        return { tradePsychology: [...s.tradePsychology, tp] }
      }),
      addScreenshot: (ts) => set((s) => ({ tradeScreenshots: [...s.tradeScreenshots, ts] })),
      saveLesson: (lesson) => set((s) => ({ lessonsLearned: [...s.lessonsLearned, lesson] })),

      toggleCompare: (firmId) =>
        set((s) => {
          const exists = s.compareFirmIds.includes(firmId)
          if (exists) return { compareFirmIds: s.compareFirmIds.filter((f) => f !== firmId) }
          if (s.compareFirmIds.length >= 4) return s
          return { compareFirmIds: [...s.compareFirmIds, firmId] }
        }),

      tradesFor: (accountId) => get().trades.filter((t) => t.accountId === accountId),
    }),
    { name: "propsim-store" },
  ),
)
