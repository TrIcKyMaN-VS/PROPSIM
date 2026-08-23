const fs = require('fs');
let content = fs.readFileSync('app/app/calendar/page.tsx', 'utf8');

content = content.replace(
  '  const accountTrades = trades.filter(t => t.accountId === activeAccountId)',
  '  const accountTrades = useMemo(() => trades.filter(t => t.accountId === activeAccountId), [trades, activeAccountId])'
);

content = content.replace(
  '  const account = accounts.find(a => a.id === activeAccountId)',
  '  const account = useMemo(() => accounts.find(a => a.id === activeAccountId), [accounts, activeAccountId])'
);

fs.writeFileSync('app/app/calendar/page.tsx', content, 'utf8');
console.log('Memoized calendar rules');
