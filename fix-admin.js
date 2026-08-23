const fs = require('fs');

const oldPage = fs.readFileSync('app/admin/analytics/page.tsx', 'utf8');

// The old page is entirely a client component that imports recharts
// We will move its content to admin-analytics-view.tsx
fs.writeFileSync('app/admin/analytics/admin-analytics-view.tsx', oldPage, 'utf8');

// And we will replace the page with a dynamic import
const newPage = `
import dynamic from 'next/dynamic'

const AdminAnalyticsView = dynamic(() => import("./admin-analytics-view"), { ssr: false })

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsView />
}
`;
fs.writeFileSync('app/admin/analytics/page.tsx', newPage, 'utf8');

