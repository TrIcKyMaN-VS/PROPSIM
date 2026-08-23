const fs = require('fs');
let content = fs.readFileSync('components/app/dashboard-view.tsx', 'utf8');

content = content.replace(
  '  const firm = getFirm(account.firmId)!\n  const accountTrades = trades.filter((t) => t.accountId === account.id)\n\n  const status = evaluate(account.rules, accountTrades)\n  const curve = equityCurve(account, accountTrades)\n  const r = account.rules',
  `  const firm = useMemo(() => getFirm(account.firmId)!, [account.firmId])
  const accountTrades = useMemo(() => trades.filter((t) => t.accountId === account.id), [trades, account.id])
  const status = useMemo(() => evaluate(account.rules, accountTrades), [account.rules, accountTrades])
  const curve = useMemo(() => equityCurve(account, accountTrades), [account, accountTrades])
  const r = account.rules`
);

fs.writeFileSync('components/app/dashboard-view.tsx', content, 'utf8');
console.log('Memoized dashboard rules');
