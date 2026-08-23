"use client"
import dynamic from 'next/dynamic'

const AdminAnalyticsView = dynamic(() => import("./admin-analytics-view").then(m => m.AdminAnalyticsPage), { ssr: false })

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsView />
}
