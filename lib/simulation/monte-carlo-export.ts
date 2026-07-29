import { MonteCarloInputs, MonteCarloStats } from "./monte-carlo-types"
import { fmtCurrency, fmtPct } from "@/lib/format"

export function exportToCsv(stats: MonteCarloStats, inputs: MonteCarloInputs) {
  let csvContent = "data:text/csv;charset=utf-8,"

  // Inputs Section
  csvContent += "MONTE CARLO SIMULATION SUMMARY\n\n"
  csvContent += "INPUT PARAMETERS\n"
  csvContent += `Starting Balance,${inputs.startingBalance}\n`
  csvContent += `Win Rate %,${inputs.winRate}\n`
  csvContent += `Average RR,${inputs.avgRR}\n`
  csvContent += `Risk Per Trade %,${inputs.riskPct}\n`
  csvContent += `Number of Trades,${inputs.numTrades}\n`
  csvContent += `Simulation Count,${inputs.simCount}\n`
  csvContent += `Profit Target,${inputs.profitTarget || "None"}\n`
  csvContent += `Daily Loss Limit,${inputs.dailyLossLimit || "None"}\n`
  csvContent += `Max Drawdown Limit,${inputs.maxDrawdownLimit || "None"}\n`
  csvContent += `Commission per trade,${inputs.commission || 0}\n`
  csvContent += `Slippage per trade,${inputs.slippage || 0}\n\n`

  // Outputs Section
  csvContent += "STATISTICAL RESULTS\n"
  csvContent += `Expected Return,${stats.expectedReturn}\n`
  csvContent += `Median Return,${stats.medianReturn}\n`
  csvContent += `Average Return,${stats.averageReturn}\n`
  csvContent += `Best Case Return (95th Pct),${stats.bestCaseReturn}\n`
  csvContent += `Worst Case Return (5th Pct),${stats.worstCaseReturn}\n`
  csvContent += `Expected Drawdown %,${stats.expectedDrawdown.toFixed(2)}\n`
  csvContent += `Maximum Drawdown %,${stats.maxDrawdown.toFixed(2)}\n`
  csvContent += `Average Drawdown %,${stats.averageDrawdown.toFixed(2)}\n`
  csvContent += `Probability of Profit %,${stats.probProfit.toFixed(2)}\n`
  csvContent += `Probability of Loss %,${stats.probLoss.toFixed(2)}\n`
  csvContent += `Probability of Passing %,${stats.probPassing.toFixed(2)}\n`
  csvContent += `Probability of Failure %,${stats.probFailure.toFixed(2)}\n`
  csvContent += `Probability of Ruin %,${stats.probRuin.toFixed(2)}\n`
  csvContent += `Longest Winning Streak,${stats.longestWinningStreak}\n`
  csvContent += `Longest Losing Streak,${stats.longestLosingStreak}\n`
  csvContent += `Profit Factor,${stats.profitFactor.toFixed(2)}\n`
  csvContent += `Recovery Factor,${stats.recoveryFactor.toFixed(2)}\n`
  csvContent += `Trade Expectancy,${stats.tradeExpectancy.toFixed(2)}\n\n`

  // Equity Curve Table
  csvContent += "EQUITY CURVE PROJECTION\n"
  csvContent += "Trade Index,5th Percentile (Lower),Median Equity,95th Percentile (Upper)\n"
  
  stats.expectedEquityCurve.forEach((medianVal, idx) => {
    const lowerVal = stats.confidenceInterval95Lower[idx]
    const upperVal = stats.confidenceInterval95Upper[idx]
    csvContent += `${idx},${Math.round(lowerVal)},${Math.round(medianVal)},${Math.round(upperVal)}\n`
  })

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", `propsim_monte_carlo_${Date.now()}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToPrint() {
  if (typeof window !== "undefined") {
    window.print()
  }
}
