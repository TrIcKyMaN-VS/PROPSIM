const fs = require('fs');
let content = fs.readFileSync('components/app/calendar/daily-replay-sheet.tsx', 'utf8');

content = content.replace(
  '  const dayTrades = trades.filter(t => getTradeDateKey(Number(t.timestamp)) === dateStr)',
  `  const dayTrades = React.useMemo(() => {
    if (!dateStr) return []
    return trades.filter(t => getTradeDateKey(Number(t.timestamp)) === dateStr)
  }, [trades, dateStr, displayTimeMode])`
);

content = content.replace(
  '  const pnl = dayTrades.reduce((s, t) => s + t.pnl, 0)',
  '  const pnl = React.useMemo(() => dayTrades.reduce((s, t) => s + t.pnl, 0), [dayTrades])'
);

content = content.replace(
  '  const wins = dayTrades.filter(t => t.pnl > 0)\n  const winRate = dayTrades.length > 0 ? (wins.length / dayTrades.length) * 100 : 0',
  `  const winRate = React.useMemo(() => {
    const wins = dayTrades.filter(t => t.pnl > 0)
    return dayTrades.length > 0 ? (wins.length / dayTrades.length) * 100 : 0
  }, [dayTrades])`
);

fs.writeFileSync('components/app/calendar/daily-replay-sheet.tsx', content, 'utf8');
console.log('Optimized DailyReplaySheet rendering');
