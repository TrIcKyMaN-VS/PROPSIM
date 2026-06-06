"use server"

import { detectMistakesAndDna } from "@/lib/ai/mistake-detector"
import { matchTradeToPlaybook } from "@/lib/ai/playbook-matcher"
import { detectCsvMapping, reconstructTrade } from "@/lib/ai/import-engine"

export async function analyzeTraderDnaAction(trades: any[]) {
  // Authentication and Provider logic is now handled dynamically by lib/ai/provider.ts
  return await detectMistakesAndDna(trades)
}

export async function matchPlaybookAction(trade: any, playbooks: any[]) {
  try {
    return await matchTradeToPlaybook(trade, playbooks)
  } catch (err) {
    console.error("Playbook match error:", err)
    return null
  }
}

export async function smartImportCsvAction(csvSample: any[]) {
  return await detectCsvMapping(csvSample)
}
