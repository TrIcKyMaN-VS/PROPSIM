const fs = require('fs');
let content = fs.readFileSync('components/app/analytics-view.tsx', 'utf8');

// Ensure useMemo is imported
if (!content.includes('import { useMemo }')) {
    content = content.replace('import { usePropStore }', 'import { useMemo } from "react"\nimport { usePropStore }');
}

content = content.replace(
  '  const account = accounts.find((a) => a.id === activeId)\n  const accountTrades = account ? trades.filter((t) => t.accountId === account.id) : []\n  const a = computeAnalytics(accountTrades)\n  const readiness = fundedReadiness(a)\n  const probabilities = calculatePassProbability({ winRate: a.winRate/100, rr: a.profitFactor, consistency: 0 })\n  const firm = account ? getFirm(account.firmId) : undefined',
  `  const account = useMemo(() => accounts.find((a) => a.id === activeId), [accounts, activeId])
  const accountTrades = useMemo(() => account ? trades.filter((t) => t.accountId === account.id) : [], [account, trades])
  const a = useMemo(() => computeAnalytics(accountTrades), [accountTrades])
  const readiness = useMemo(() => fundedReadiness(a), [a])
  const probabilities = useMemo(() => calculatePassProbability({ winRate: a.winRate/100, rr: a.profitFactor, consistency: 0 }), [a])
  const firm = useMemo(() => account ? getFirm(account.firmId) : undefined, [account])`
);

fs.writeFileSync('components/app/analytics-view.tsx', content, 'utf8');
console.log('Memoized analytics rules');
