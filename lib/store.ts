"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ChallengeAccount, Trade, TradeDirection } from "./types"
import { getFirm, SESSIONS, INSTRUMENTS } from "./firms"
import { getAccounts, createAccount as createDbAccount, deleteAccountPermanently as deleteDbAccountPermanently, archiveAccount as archiveDbAccount, restoreAccount as restoreDbAccount, cloneAccount as cloneDbAccount, archiveAllFailedChallenges as archiveAllFailedDbChallenges, resetToOfficialRules as resetDbAccountRules, renameAccount as renameDbAccount } from "@/app/actions/account-actions"
import { getTrades, addTrade as addDbTrade, deleteTrade as deleteDbTrade, importTradesBatch } from "@/app/actions/trade-actions"
import { getPlaybooks, createPlaybook as createDbPlaybook, updatePlaybook as updateDbPlaybook, deletePlaybook as deleteDbPlaybook, assignTradeToPlaybook as assignDbTrade, PlaybookInput } from "@/app/actions/playbook-actions"
import { getRoutineConfig, updateRoutineConfig, getDefaultPlannedRisk, updateDefaultPlannedRisk } from "@/app/actions/user-actions"
import { getChecklistTemplates } from "@/app/actions/checklist-actions"
import { getTradePsychology, saveTradePsychology as saveDbTradePsychology, getDailyPerformances, saveDailyPerformance as saveDbDailyPerformance, getLessonsLearned, saveLessonLearned as saveDbLessonLearned } from "@/app/actions/psychology-actions"

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
  checklistTemplates: any[]
  activeAccountId: string | null
  activeAccountViolations: any[]
  compareFirmIds: string[]
  seeded: boolean
  animationMode: "Full" | "Reduced" | "Off"
  displayTimeMode: "Exchange Time" | "Local Time"
  setDisplayTimeMode: (mode: "Exchange Time" | "Local Time") => void
  pnlDisplayMode: "currency" | "percentage" | "r_multiple"
  setPnlDisplayMode: (mode: "currency" | "percentage" | "r_multiple") => void

  init: () => void
  syncWithDb: () => Promise<void>
  createAccount: (firmId: string, sizeLabel: string, challengeType?: "OFFICIAL" | "CUSTOM", customOverrides?: Record<string, any>) => Promise<string>
  resetToOfficialRules: (accountId: string) => Promise<void>
  renameAccount: (id: string, name: string) => Promise<void>
  setActive: (id: string) => void
  removeAccount: (id: string) => Promise<void>
  archiveAccount: (id: string) => Promise<void>
  restoreAccount: (id: string) => Promise<void>
  deleteAccountPermanently: (id: string) => Promise<void>
  cloneAccount: (id: string) => Promise<string>
  archiveAllFailedChallenges: () => Promise<void>
  addTrade: (t: Omit<Trade, "id" | "timestamp"> & { timestamp?: number }) => Promise<Trade>
  updateTrade: (id: string, updates: Partial<Trade>) => Promise<void>
  removeTrade: (id: string) => Promise<void>
  importTrades: (rows: Omit<Trade, "id" | "accountId" | "timestamp">[], accountId: string) => Promise<void>
  assignTradeToPlaybook: (tradeId: string, playbookId: string | null) => Promise<void>
  createPlaybook: (data: PlaybookInput) => Promise<void>
  updatePlaybook: (id: string, data: PlaybookInput) => Promise<void>
  removePlaybook: (id: string) => Promise<void>
  
  addDailyPerformance: (dp: any) => Promise<void>
  updateDailyPerformance: (dp: any) => Promise<void>
  saveTradePsychology: (tp: any) => Promise<void>
  addScreenshot: (tradeId: string, stage: string, url: string) => Promise<void>
  deleteScreenshot: (tradeId: string, id: string) => Promise<void>
  saveLesson: (lesson: any) => Promise<void>
  saveChecklistTemplate: (data: any) => Promise<void>
  deleteChecklistTemplate: (id: string) => Promise<void>
  
  routineConfig: { morning: string[], eod: string[] }
  defaultPlannedRisk: number
  setRoutineConfig: (config: { morning: string[], eod: string[] }) => void
  setDefaultPlannedRisk: (val: number) => void
  toggleCompare: (firmId: string) => void
  tradesFor: (accountId: string) => Trade[]
  customSetups: string[]
  deletedSetups: string[]
  addCustomSetup: (name: string) => void
  deleteCustomSetup: (name: string) => Promise<void>
  setAnimationMode: (mode: "Full" | "Reduced" | "Off") => void
}

export const usePropStore = create<PropState>()(
  persist(
    (set, get) => ({
      accounts: [],
      trades: [],
      playbooks: [],
      customSetups: [],
      deletedSetups: [],
      dailyPerformances: [],
      tradePsychology: [],
      tradeScreenshots: [],
      lessonsLearned: [],
      checklistTemplates: [],
      activeAccountId: null,
      activeAccountViolations: [],
      compareFirmIds: ["apex", "topstep", "mffu", "tradeday"],
      routineConfig: {
        morning: ["Sleep Completed (7+ Hours)", "Economic Calendar Checked", "Headline News Checked", "Daily Bias Prepared", "Risk Plan Prepared"],
        eod: ["Trade Journal Completed", "Lessons Logged", "All Trades Reviewed", "Screenshots Uploaded"]
      },
      defaultPlannedRisk: 100,
      seeded: false,
      animationMode: "Full",
      displayTimeMode: "Exchange Time",
      pnlDisplayMode: "r_multiple",

      setDisplayTimeMode: (mode) => set({ displayTimeMode: mode }),
      setAnimationMode: (mode) => set({ animationMode: mode }),
      setPnlDisplayMode: (mode) => set({ pnlDisplayMode: mode }),
      
      setDefaultPlannedRisk: (val) => {
        set({ defaultPlannedRisk: val })
        updateDefaultPlannedRisk(val).catch(console.error)
      },

      setRoutineConfig: (config) => {
        set({ routineConfig: config })
        updateRoutineConfig(config).catch(console.error)
      },

      init: () => {
        // We will call syncWithDb from a component useEffect
      },

      syncWithDb: async () => {
        try {
          const [dbAccounts, dbTrades] = await Promise.all([
            getAccounts(),
            getTrades()
          ])

          // parse rules back to object for accounts
          const parsedAccounts = dbAccounts.map(a => ({
            ...a,
            rules: JSON.parse(a.rules as any),
            createdAt: Number(new Date(a.createdAt).getTime()),
            archivedAt: a.archivedAt ? Number(new Date(a.archivedAt).getTime()) : null,
            challengeType: a.challengeType || "OFFICIAL",
            customOverrides: a.customOverrides ? JSON.parse(a.customOverrides as string) : null,
            baseRules: a.baseRules ? JSON.parse(a.baseRules as string) : null
          })) as any as ChallengeAccount[]

          const currentTrades = get().trades
          const currentAccounts = get().accounts

          const tradesEqual = currentTrades.length === dbTrades.length && 
            currentTrades.every((t, i) => 
              t.id === dbTrades[i]?.id && 
              Number(t.pnl) === Number(dbTrades[i]?.pnl) && 
              Number(t.commission || 0) === Number(dbTrades[i]?.commission || 0) &&
              t.exitType === dbTrades[i]?.exitType &&
              t.postExitResult === dbTrades[i]?.postExitResult &&
              Number(t.exitTime) === Number(dbTrades[i]?.exitTime) && 
              t.playbookName === dbTrades[i]?.playbookName
            );
          
          const accountsEqual = currentAccounts.length === parsedAccounts.length &&
            currentAccounts.every((a, i) => a.id === parsedAccounts[i]?.id && a.status === parsedAccounts[i]?.status && a.brokerAccountName === parsedAccounts[i]?.brokerAccountName);

          if (tradesEqual && accountsEqual && get().seeded) {
            return; // skip if nothing changed
          }

          const currentActive = get().activeAccountId
          const activeId = (currentActive && parsedAccounts.some(a => a.id === currentActive && !a.archivedAt))
            ? currentActive
            : (parsedAccounts.find(a => !a.archivedAt && a.status === "active")?.id || parsedAccounts[0]?.id || null)

          const [
            dbPlaybooks,
            routine,
            userPlannedRisk,
            dbChecklists,
            dbPsychology,
            dbPerformances,
            dbLessons,
            violations
          ] = await Promise.all([
            getPlaybooks(),
            getRoutineConfig(),
            getDefaultPlannedRisk(),
            getChecklistTemplates(),
            getTradePsychology(),
            getDailyPerformances(),
            getLessonsLearned(),
            activeId ? (async () => {
              const { getRuleViolationsForAccount } = await import("@/app/actions/rule-actions")
              return await getRuleViolationsForAccount(activeId)
            })() : Promise.resolve([])
          ])
          
          set({
            accounts: parsedAccounts,
            trades: dbTrades,
            playbooks: dbPlaybooks,
            checklistTemplates: dbChecklists,
            tradePsychology: dbPsychology,
            dailyPerformances: dbPerformances,
            lessonsLearned: dbLessons,
            activeAccountId: activeId,
            activeAccountViolations: violations,
            seeded: true,
            ...(routine ? { routineConfig: routine } : {}),
            ...(userPlannedRisk !== null && userPlannedRisk !== undefined ? { defaultPlannedRisk: userPlannedRisk } : {})
          })
        } catch (e) {
          // not logged in or error
        }
      },

      createAccount: async (firmId, sizeLabel, challengeType = "OFFICIAL", customOverrides) => {
        const dbAcc = await createDbAccount(firmId, sizeLabel, challengeType, customOverrides)
        const acc = {
          ...dbAcc,
          rules: JSON.parse(dbAcc.rules as any),
          createdAt: Number(new Date(dbAcc.createdAt).getTime()),
          challengeType: dbAcc.challengeType || "OFFICIAL",
          customOverrides: dbAcc.customOverrides ? JSON.parse(dbAcc.customOverrides as string) : null,
          baseRules: dbAcc.baseRules ? JSON.parse(dbAcc.baseRules as string) : null
        } as any as ChallengeAccount
        set((s) => ({ accounts: [...s.accounts, acc], activeAccountId: acc.id }))
        return acc.id
      },

      resetToOfficialRules: async (accountId) => {
        await resetDbAccountRules(accountId)
        set((s) => ({
          accounts: s.accounts.map((a) => {
            if (a.id === accountId) {
              const baseRules = a.baseRules || a.rules
              return {
                ...a,
                challengeType: "OFFICIAL",
                customOverrides: null,
                rules: baseRules
              }
            }
            return a
          })
        }))
      },

      renameAccount: async (id, name) => {
        await renameDbAccount(id, name)
        set((s) => ({
          accounts: s.accounts.map((a) => a.id === id ? { ...a, name } : a)
        }))
      },

      setActive: async (id) => {
        set({ activeAccountId: id })
        try {
          const { getRuleViolationsForAccount } = await import("@/app/actions/rule-actions")
          const violations = await getRuleViolationsForAccount(id)
          set({ activeAccountViolations: violations })
        } catch (e) {
          console.error("Failed to load active account violations:", e)
        }
      },

      removeAccount: async (id) => {
        await archiveDbAccount(id)
        set((s) => {
          const accounts = s.accounts.map((a) => a.id === id ? { ...a, archivedAt: Date.now() } : a)
          // Also set active account to something else if the active one was archived
          let nextActive = s.activeAccountId === id ? (accounts.find(a => !a.archivedAt && a.status === "active")?.id ?? null) : s.activeAccountId
          return {
            accounts,
            activeAccountId: nextActive,
          }
        })
      },

      archiveAccount: async (id) => {
        await archiveDbAccount(id)
        set((s) => {
          const accounts = s.accounts.map((a) => a.id === id ? { ...a, archivedAt: Date.now() } : a)
          let nextActive = s.activeAccountId === id ? (accounts.find(a => !a.archivedAt && a.status === "active")?.id ?? null) : s.activeAccountId
          return { accounts, activeAccountId: nextActive }
        })
      },

      restoreAccount: async (id) => {
        await restoreDbAccount(id)
        set((s) => ({
          accounts: s.accounts.map((a) => a.id === id ? { ...a, archivedAt: null } : a)
        }))
      },

      deleteAccountPermanently: async (id) => {
        await deleteDbAccountPermanently(id)
        set((s) => {
          const accounts = s.accounts.filter((a) => a.id !== id)
          return {
            accounts,
            trades: s.trades.filter((t) => t.accountId !== id),
            activeAccountId: s.activeAccountId === id ? (accounts.find(a => !a.archivedAt && a.status === "active")?.id ?? null) : s.activeAccountId,
          }
        })
      },

      cloneAccount: async (id) => {
        const cloned = await cloneDbAccount(id)
        const acc = {
          ...cloned,
          rules: JSON.parse(cloned.rules as any),
          createdAt: Number(new Date(cloned.createdAt).getTime()),
          challengeType: cloned.challengeType || "OFFICIAL",
          customOverrides: cloned.customOverrides ? JSON.parse(cloned.customOverrides as string) : null,
          baseRules: cloned.baseRules ? JSON.parse(cloned.baseRules as string) : null
        } as any as ChallengeAccount
        set((s) => ({ accounts: [acc, ...s.accounts], activeAccountId: acc.id }))
        return acc.id
      },

      archiveAllFailedChallenges: async () => {
        await archiveAllFailedDbChallenges()
        set((s) => {
          const now = Date.now()
          const accounts = s.accounts.map((a) => a.status === "failed" && !a.archivedAt ? { ...a, archivedAt: now } : a)
          let nextActive = accounts.find(a => a.id === s.activeAccountId && a.archivedAt) ? 
            (accounts.find(a => !a.archivedAt && a.status === "active")?.id ?? null) : s.activeAccountId
          return { accounts, activeAccountId: nextActive }
        })
      },

      addTrade: async (t) => {
        const added = await addDbTrade(t)
        set((state) => ({ trades: [...state.trades, added] }))
        await get().syncWithDb()
        return added
      },
      updateTrade: async (id, updates) => {
        const { updateTrade: updateDbTrade } = await import("@/app/actions/trade-actions")
        const updated = await updateDbTrade(id, updates)
        set((state) => ({
          trades: state.trades.map((tr) => (tr.id === id ? { ...tr, ...updated } : tr))
        }))
        await get().syncWithDb()
      },
      removeTrade: async (id) => {
        set((s) => ({
          trades: s.trades.filter((t) => t.id !== id),
          tradePsychology: s.tradePsychology.filter((p) => p.tradeId !== id)
        }))
        await deleteDbTrade(id)
        await get().syncWithDb()
      },

      importTrades: async (rows, accountId) => {
        await importTradesBatch(accountId, rows)
        // re-sync to get generated IDs and timestamps safely
        get().syncWithDb()
      },

      assignTradeToPlaybook: async (tradeId, playbookId) => {
        await assignDbTrade(tradeId, playbookId)
        set((s) => ({
          trades: s.trades.map(t => t.id === tradeId ? { ...t, playbookId: playbookId || undefined } : t)
        }))
      },

      createPlaybook: async (data) => {
        const pb = await createDbPlaybook(data)
        set((s) => ({ playbooks: [pb, ...s.playbooks] }))
      },

      updatePlaybook: async (id, data) => {
        const updatedPb = await updateDbPlaybook(id, data)
        set((s) => ({
          playbooks: s.playbooks.map(pb => pb.id === id ? { ...pb, ...updatedPb } : pb)
        }))
      },

      removePlaybook: async (id) => {
        await deleteDbPlaybook(id)
        set((s) => ({
          playbooks: s.playbooks.map((p) => p.id === id ? { ...p, deletedAt: new Date().toISOString() } : p)
        }))
      },

      addDailyPerformance: async (dp) => {
        const saved = await saveDbDailyPerformance(dp)
        set((s) => ({ dailyPerformances: [...s.dailyPerformances.filter(d => d.id !== saved.id), saved] }))
      },
      updateDailyPerformance: async (dp) => {
        const saved = await saveDbDailyPerformance(dp)
        set((s) => ({ dailyPerformances: s.dailyPerformances.map((d) => (d.date === dp.date ? saved : d)) }))
      },
      saveTradePsychology: async (tp) => {
        const saved = await saveDbTradePsychology(tp)
        set((s) => {
          const exists = s.tradePsychology.find(x => x.tradeId === tp.tradeId)
          if (exists) return { tradePsychology: s.tradePsychology.map(x => x.tradeId === tp.tradeId ? saved : x) }
          return { tradePsychology: [...s.tradePsychology, saved] }
        })
      },
      addScreenshot: async (tradeId, stage, url) => {
        const { addTradeScreenshot } = await import("@/app/actions/trade-actions")
        const created = await addTradeScreenshot(tradeId, stage, url)
        set((s) => ({
          trades: s.trades.map((t) => {
            if (t.id === tradeId) {
              const filtered = (t.screenshots || []).filter((sc: any) => sc.stage !== stage)
              return { ...t, screenshots: [...filtered, created] }
            }
            return t
          })
        }))
      },
      deleteScreenshot: async (tradeId, id) => {
        const { deleteTradeScreenshot } = await import("@/app/actions/trade-actions")
        await deleteTradeScreenshot(id)
        set((s) => ({
          trades: s.trades.map((t) => {
            if (t.id === tradeId) {
              return { ...t, screenshots: (t.screenshots || []).filter((sc: any) => sc.id !== id) }
            }
            return t
          })
        }))
      },
      saveLesson: async (lesson) => {
        const saved = await saveDbLessonLearned(lesson)
        set((s) => {
          const exists = s.lessonsLearned.find(x => x.tradeId === lesson.tradeId)
          if (exists) return { lessonsLearned: s.lessonsLearned.map(x => x.tradeId === lesson.tradeId ? saved : x) }
          return { lessonsLearned: [...s.lessonsLearned, saved] }
        })
      },
      saveChecklistTemplate: async (data) => {
        const { saveChecklistTemplate: saveDbChecklistTemplate } = await import("@/app/actions/checklist-actions")
        const saved = await saveDbChecklistTemplate(data)
        set((s) => {
          const exists = s.checklistTemplates.find(x => x.id === saved.id)
          if (exists) {
            return { checklistTemplates: s.checklistTemplates.map(x => x.id === saved.id ? saved : x) }
          }
          return { checklistTemplates: [saved, ...s.checklistTemplates] }
        })
      },
      deleteChecklistTemplate: async (id) => {
        const { deleteChecklistTemplate: deleteDbChecklistTemplate } = await import("@/app/actions/checklist-actions")
        await deleteDbChecklistTemplate(id)
        set((s) => ({
          checklistTemplates: s.checklistTemplates.filter(x => x.id !== id)
        }))
      },

      toggleCompare: (firmId) =>
        set((s) => {
          const exists = s.compareFirmIds.includes(firmId)
          if (exists) return { compareFirmIds: s.compareFirmIds.filter((f) => f !== firmId) }
          if (s.compareFirmIds.length >= 4) return s
          return { compareFirmIds: [...s.compareFirmIds, firmId] }
        }),

      tradesFor: (accountId) => get().trades.filter((t) => t.accountId === accountId),

      addCustomSetup: (name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        set((s) => {
          const prevCustom = s.customSetups || []
          const prevDeleted = s.deletedSetups || []
          const filteredDeleted = prevDeleted.filter(d => d.toLowerCase() !== trimmed.toLowerCase())
          const exists = prevCustom.some(cs => cs.toLowerCase() === trimmed.toLowerCase())
          if (exists) {
            return { deletedSetups: filteredDeleted }
          }
          return {
            customSetups: [...prevCustom, trimmed],
            deletedSetups: filteredDeleted
          }
        })
      },

      deleteCustomSetup: async (name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        const playbooks = get().playbooks || []
        const matchingPb = playbooks.find((p: any) => p.name?.toLowerCase() === trimmed.toLowerCase())
        if (matchingPb?.id) {
          try {
            await get().removePlaybook(matchingPb.id)
          } catch (err) {
            console.error("Failed to delete DB playbook:", err)
          }
        }
        set((s) => ({
          customSetups: (s.customSetups || []).filter(cs => cs.toLowerCase() !== trimmed.toLowerCase()),
          deletedSetups: [...new Set([...(s.deletedSetups || []), trimmed])]
        }))
      },
    }),
    {
      name: "propsim-store",
      partialize: (state) => ({
        activeAccountId: state.activeAccountId,
        compareFirmIds: state.compareFirmIds,
        animationMode: state.animationMode,
        displayTimeMode: state.displayTimeMode,
        pnlDisplayMode: state.pnlDisplayMode,
        routineConfig: state.routineConfig,
        defaultPlannedRisk: state.defaultPlannedRisk,
        customSetups: state.customSetups,
        deletedSetups: state.deletedSetups,
        seeded: state.seeded,
      }),
    },
  ),
)
