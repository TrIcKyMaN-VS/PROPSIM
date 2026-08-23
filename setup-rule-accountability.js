const fs = require('fs');

// Step 1: Add ruleEvaluations field to schema
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
if (!schema.includes('ruleEvaluations')) {
  schema = schema.replace(
    '  // 5. Commitment',
    '  // Rule Evaluations (JSON: RuleEvaluation[])\n  ruleEvaluations         String?\n\n  // 5. Commitment'
  );
  fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
  console.log('Schema updated');
} else {
  console.log('Schema already has ruleEvaluations');
}

// Step 2: Add getPreviousWeeklyReview action to journal-actions.ts
let actions = fs.readFileSync('app/actions/journal-actions.ts', 'utf8');
if (!actions.includes('getPreviousWeeklyReview')) {
  const insertAfter = 'export async function getWeeklyReview(weekOf: string) {\n    const session = await getServerSession(authOptions)\n    if (!session?.user?.id) throw new Error("Unauthorized")\n    \n    return prisma.weeklyReview.findUnique({\n      where: { userId_weekOf: { userId: session.user.id, weekOf } }\n    })\n  }';
  
  const newAction = `
export async function getPreviousWeeklyReview(currentWeekOf: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Get all weekly reviews ordered by weekOf desc
  const allReviews = await prisma.weeklyReview.findMany({
    where: { userId: session.user.id },
    orderBy: { weekOf: 'desc' },
    select: { weekOf: true, rulesBuilt: true, ruleEvaluations: true }
  })

  // Find the most recent week BEFORE currentWeekOf
  const prev = allReviews.find(r => r.weekOf < currentWeekOf)
  if (!prev) return null

  // Collect all ever-retired rule signatures across ALL weeks
  const retiredSignatures = new Set<string>()
  for (const review of allReviews) {
    if (review.ruleEvaluations) {
      try {
        const evals = JSON.parse(review.ruleEvaluations) as Array<{ when: string; then: string; verdict: string }>
        for (const e of evals) {
          if (e.verdict === 'retire') {
            retiredSignatures.add(e.when + '||' + e.then)
          }
        }
      } catch {}
    }
  }

  // Parse previous week's rules and filter out retired ones
  let prevRules: Array<{ when: string; then: string; from: string }> = []
  if (prev.rulesBuilt) {
    try {
      const parsed = JSON.parse(prev.rulesBuilt)
      prevRules = parsed.filter((r: any) => !retiredSignatures.has(r.when + '||' + r.then))
    } catch {}
  }

  // Get saved evaluations for current week (if editing)
  const currentWeek = allReviews.find(r => r.weekOf === currentWeekOf)
  let savedEvals: any[] = []
  if (currentWeek?.ruleEvaluations) {
    try { savedEvals = JSON.parse(currentWeek.ruleEvaluations) } catch {}
  }

  return { previousWeekOf: prev.weekOf, rules: prevRules, savedEvals }
}
`;

  actions = actions.replace(
    'export async function getWeeklyReview(',
    newAction + '\nexport async function getWeeklyReview('
  );
  fs.writeFileSync('app/actions/journal-actions.ts', actions, 'utf8');
  console.log('Action added');
} else {
  console.log('Action already exists');
}

console.log('Done');
