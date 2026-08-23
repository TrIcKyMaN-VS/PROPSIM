"use client"
import dynamic from 'next/dynamic'
const AnalyticsView = dynamic(() => import("@/components/app/analytics-view").then(m => m.AnalyticsView), { ssr: false })

export default function AnalyticsPage() {
  return <AnalyticsView />
}
