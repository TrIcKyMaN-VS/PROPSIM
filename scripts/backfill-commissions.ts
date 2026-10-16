import { prisma } from "../lib/prisma"
import { calculateTradeCommission } from "../lib/trade-commission"

async function backfillCommissions() {
  console.log("Starting commission backfill for existing trades...")
  const trades = await prisma.trade.findMany({
    select: {
      id: true,
      instrument: true,
      contracts: true,
      pnl: true,
      grossPnl: true,
      commission: true,
      plannedRisk: true,
      netR: true
    }
  })

  console.log(`Found ${trades.length} total trades in database.`)

  let updatedCount = 0
  let skippedCount = 0
  let totalCommissionDeducted = 0

  for (const t of trades) {
    // If grossPnl is already set, this trade was already processed
    if (t.grossPnl !== null && t.grossPnl !== undefined) {
      skippedCount++
      continue
    }

    const comm = calculateTradeCommission(t.instrument, t.contracts)
    const grossPnl = Number(t.pnl)
    const netPnl = Number((grossPnl - comm).toFixed(2))

    let netR = t.netR
    if (t.plannedRisk && t.plannedRisk > 0) {
      netR = Number((netPnl / t.plannedRisk).toFixed(2))
    } else if (t.netR !== null && t.netR !== undefined && grossPnl !== 0) {
      // Re-scale existing netR proportionally to net P&L
      const ratio = netPnl / grossPnl
      netR = Number((t.netR * ratio).toFixed(2))
    }

    await prisma.trade.update({
      where: { id: t.id },
      data: {
        commission: comm,
        grossPnl,
        pnl: netPnl,
        netR
      }
    })

    updatedCount++
    totalCommissionDeducted += comm
  }

  console.log(`Backfill complete!`)
  console.log(`Updated: ${updatedCount} trades`)
  console.log(`Skipped: ${skippedCount} already-migrated trades`)
  console.log(`Total commission deducted: $${totalCommissionDeducted.toFixed(2)}`)
}

backfillCommissions()
  .catch(err => {
    console.error("Backfill failed:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
