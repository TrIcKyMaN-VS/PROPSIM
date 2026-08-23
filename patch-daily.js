const fs = require('fs');
let content = fs.readFileSync('app/app/daily/page.tsx', 'utf8');

// Ensure useMemo is imported
if (!content.includes('useMemo')) {
    content = content.replace('import React, { useState, useEffect }', 'import React, { useState, useEffect, useMemo }');
}

content = content.replace(
  '  // Trades for the selected date\n  const dayTrades = allTrades.filter(t => {\n    if (t.accountId !== activeAccountId) return false\n    const d = new Date(Number(t.timestamp)).toISOString().split("T")[0]\n    return d === date\n  })',
  `  // Trades for the selected date
  const dayTrades = useMemo(() => allTrades.filter(t => {
    if (t.accountId !== activeAccountId) return false
    const d = new Date(Number(t.timestamp)).toISOString().split("T")[0]
    return d === date
  }), [allTrades, activeAccountId, date])`
);

fs.writeFileSync('app/app/daily/page.tsx', content, 'utf8');
console.log('Memoized daily rules');
