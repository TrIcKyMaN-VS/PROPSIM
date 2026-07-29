export function calculateTradeScores(trade: any, psychology: any) {
  // 1. Setup Quality Score
  let setupQuality = 70 // default baseline
  if (psychology) {
    if (psychology.checklistScore !== null && psychology.checklistScore !== undefined) {
      // If checklist score is out of e.g. 5, normalize to 100
      const score = Number(psychology.checklistScore)
      if (score <= 5) setupQuality = (score / 5) * 100
      else if (score <= 10) setupQuality = (score / 10) * 100
      else setupQuality = Math.min(100, score)
    } else {
      if (trade.playbookId || trade.playbookName) setupQuality += 15 // uses a defined playbook setup
      if (trade.tradeIdea && trade.tradeIdea.length > 15) setupQuality += 10 // wrote down a trade idea
    }
    if (psychology.convictionScore !== null && psychology.convictionScore !== undefined) {
      setupQuality += (Number(psychology.convictionScore) - 3) * 5 // conviction adjustment (-10 to +10)
    }
  } else {
    if (trade.playbookId || trade.playbookName) setupQuality += 15
  }
  setupQuality = Math.min(100, Math.max(0, Math.round(setupQuality)))

  // 2. Entry Quality Score
  let entryQuality = 80 // baseline
  if (psychology) {
    if (psychology.hesitated) entryQuality -= 25 // penalty for hesitation/chasing
    if (psychology.preFeeling) {
      const feeling = String(psychology.preFeeling).toLowerCase()
      if (feeling.includes("fomo") || feeling.includes("chase") || feeling.includes("anxious") || feeling.includes("greedy")) {
        entryQuality -= 15
      }
    }
    if (psychology.executionGrade) {
      const g = psychology.executionGrade
      if (g === "A+" || g === "A") entryQuality += 15
      else if (g === "B") entryQuality += 5
      else if (g === "C") entryQuality -= 10
      else if (g === "D" || g === "F") entryQuality -= 25
    }
  }
  entryQuality = Math.min(100, Math.max(0, Math.round(entryQuality)))

  // 3. Exit Quality Score
  let exitQuality = 80 // baseline
  if (psychology) {
    if (psychology.movedTarget) exitQuality -= 15 // exit changed without plan
    if (psychology.exitReason) {
      const r = String(psychology.exitReason).toLowerCase()
      if (r.includes("fear") || r.includes("panic") || r.includes("early") || r.includes("anxious")) {
        exitQuality -= 20
      }
      if (r.includes("target") || r.includes("stop") || r.includes("plan")) {
        exitQuality += 10
      }
    }
    if (psychology.complianceGrade) {
      const g = psychology.complianceGrade
      if (g === "A+" || g === "A") exitQuality += 15
      else if (g === "D" || g === "F") exitQuality -= 25
    }
  }
  exitQuality = Math.min(100, Math.max(0, Math.round(exitQuality)))

  // 4. Risk Management Score
  let riskScore = 85 // baseline
  if (psychology) {
    if (psychology.movedStop) riskScore -= 35 // HUGE penalty for moving stops
    if (psychology.addedSize) riskScore -= 20 // penalty for sizing up in trade (often adding to losers)
    if (psychology.riskGrade) {
      const g = psychology.riskGrade
      if (g === "A+" || g === "A") riskScore += 15
      else if (g === "D" || g === "F") riskScore -= 30
    }
  }
  riskScore = Math.min(100, Math.max(0, Math.round(riskScore)))

  // 5. Discipline Score
  let disciplineScore = 90 // baseline
  if (psychology) {
    if (psychology.brokeRules) disciplineScore -= 40 // MAJOR penalty for breaking rules
    if (psychology.emotionAffected) disciplineScore -= 20
    if (psychology.psychologyGrade) {
      const g = psychology.psychologyGrade
      if (g === "A+" || g === "A") disciplineScore += 10
      else if (g === "D" || g === "F") disciplineScore -= 25
    }
  }
  disciplineScore = Math.min(100, Math.max(0, Math.round(disciplineScore)))

  return {
    setupQualityScore: setupQuality,
    entryQualityScore: entryQuality,
    exitQualityScore: exitQuality,
    riskScore,
    disciplineScore
  }
}
