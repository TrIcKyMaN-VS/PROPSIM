"use server"

import { detectMistakesAndDna } from "@/lib/ai/mistake-detector"
import { matchTradeToPlaybook } from "@/lib/ai/playbook-matcher"
import { detectCsvMapping, reconstructTrade } from "@/lib/ai/import-engine"

export async function analyzeTraderDnaAction(trades: any[]) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing. Please add it to your .env file to use the AI Coach.")
  }
  return await detectMistakesAndDna(trades)
}

export async function matchPlaybookAction(trade: any, playbooks: any[]) {
  if (!process.env.OPENAI_API_KEY) return null
  return await matchTradeToPlaybook(trade, playbooks)
}

export async function smartImportCsvAction(csvSample: any[]) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing. AI Smart Import is disabled.")
  }
  return await detectCsvMapping(csvSample)
}
