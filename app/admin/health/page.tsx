import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, Cloud, HardDrive, Brain, Activity, Clock, ShieldCheck, AlertTriangle } from "lucide-react"

export default function AdminHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
        <p className="text-muted-foreground">Monitor infrastructure, APIs, and service limits.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-success/5 border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-success" /> Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Healthy</div>
            <p className="text-xs text-muted-foreground mt-1">Supabase PostgreSQL</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Latency</span>
                <span className="font-medium">42ms</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Connections</span>
                <span className="font-medium">28 / 100</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-medium">99.99%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cloud className="h-4 w-4 text-success" /> API Server
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Operational</div>
            <p className="text-xs text-muted-foreground mt-1">Next.js Serverless Edge</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Avg Response</span>
                <span className="font-medium">18ms</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Error Rate</span>
                <span className="font-medium">0.02%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Requests/sec</span>
                <span className="font-medium">142</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-warning/5 border-warning/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-warning" /> Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Warning</div>
            <p className="text-xs text-muted-foreground mt-1">AWS S3 / Supabase Storage</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Capacity</span>
                <span className="font-medium text-warning">42.8 GB / 50 GB</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-warning" style={{width: '85%'}} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Approaching 90% threshold for automated cleanup.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-success" /> AI Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Operational</div>
            <p className="text-xs text-muted-foreground mt-1">Gemini 1.5 Pro API</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Daily Quota</span>
                <span className="font-medium">45% used</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-success" style={{width: '45%'}} />
              </div>
              <div className="flex justify-between text-xs pt-1">
                <span className="text-muted-foreground">Est. Cost/Day</span>
                <span className="font-medium">$14.20</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent System Logs</CardTitle>
          <CardDescription>Latest alerts, warnings, and system events.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-start border-b pb-4">
              <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center text-warning shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium">Storage capacity reached 85%</p>
                <p className="text-xs text-muted-foreground">Automated cleanup protocol initiated. Older log files are being compressed.</p>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> 12 mins ago
              </div>
            </div>
            <div className="flex gap-4 items-start border-b pb-4">
              <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center text-success shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium">Daily database backup completed</p>
                <p className="text-xs text-muted-foreground">Backup size: 2.4GB. Stored securely in cold storage.</p>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> 4 hours ago
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Activity className="h-4 w-4" />
              </div>
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium">Spike in AI requests detected</p>
                <p className="text-xs text-muted-foreground">Rate limiting engaged temporarily for Free tier users to prevent quota exhaustion.</p>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> 14 hours ago
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
