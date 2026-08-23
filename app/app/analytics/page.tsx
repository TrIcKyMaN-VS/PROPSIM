import dynamic from 'next/dynamic'

const AnalyticsView = dynamic(
  () => import("@/components/app/analytics-view").then((mod) => mod.AnalyticsView),
  { ssr: false }
)

export default function AnalyticsPage() {
  return <AnalyticsView />
}
