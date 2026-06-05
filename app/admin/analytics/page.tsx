"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { Activity, Brain, BookOpen, PenTool } from "lucide-react"

const tradeVolumeData = [
  { date: 'Mon', volume: 1200 },
  { date: 'Tue', volume: 1800 },
  { date: 'Wed', volume: 2200 },
  { date: 'Thu', volume: 1500 },
  { date: 'Fri', volume: 2800 },
  { date: 'Sat', volume: 400 },
  { date: 'Sun', volume: 300 },
]

const aiUsageData = [
  { date: 'Week 1', tokens: 1200000, requests: 4500 },
  { date: 'Week 2', tokens: 1500000, requests: 5200 },
  { date: 'Week 3', tokens: 2100000, requests: 7800 },
  { date: 'Week 4', tokens: 3800000, requests: 12400 },
]

const featuresData = [
  { name: 'Trade Review', uses: 8400 },
  { name: 'Psychology Coach', uses: 3200 },
  { name: 'Playbook Builder', uses: 1800 },
  { name: 'General Chat', uses: 1200 },
]

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
        <p className="text-muted-foreground">Deep dive into usage metrics, trading activity, and AI costs.</p>
      </div>

      {/* Trading Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Trade Volume (Last 7 Days)</CardTitle>
            <CardDescription>Total number of trades executed across all firms</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tradeVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{backgroundColor: '#111', borderColor: '#333'}} />
                <Area type="monotone" dataKey="volume" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVolume)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> AI Coach Cost & Usage (Last 4 Weeks)</CardTitle>
            <CardDescription>Estimated token usage and total API requests</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aiUsageData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} />
                <YAxis yAxisId="right" orientation="right" stroke="#22c55e" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{backgroundColor: '#111', borderColor: '#333'}} />
                <Line yAxisId="left" type="monotone" dataKey="tokens" stroke="#3b82f6" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="requests" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Feature Breakdown */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>AI Feature Distribution</CardTitle>
            <CardDescription>Which AI tools are users engaging with the most?</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featuresData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#222'}} contentStyle={{backgroundColor: '#111', borderColor: '#333'}} />
                <Bar dataKey="uses" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Knowledge Base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Journal Entries</p>
              <p className="text-3xl font-bold">42,891</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Screenshots Uploaded</p>
              <p className="text-3xl font-bold">14,204</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Active Playbooks</p>
              <p className="text-3xl font-bold">3,192</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
