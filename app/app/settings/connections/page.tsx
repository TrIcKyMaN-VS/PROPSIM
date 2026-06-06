"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Link2, RefreshCw, XCircle, CheckCircle2, AlertCircle } from "lucide-react"
import { getBrokerConnections, addBrokerConnection, removeBrokerConnection, syncBroker } from "@/app/actions/import-actions"

const PROVIDERS = [
  { id: "Tradovate", name: "Tradovate", desc: "Direct API integration for futures" },
  { id: "TradeLocker", name: "TradeLocker", desc: "Next-gen platform integration" },
  { id: "NinjaTrader", name: "NinjaTrader", desc: "Automated statement sync" },
  { id: "Rithmic", name: "Rithmic", desc: "R | Trader Pro sync" },
]

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDialog, setActiveDialog] = useState<string | null>(null)
  
  // Form State
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [environment, setEnvironment] = useState("live")
  const [server, setServer] = useState("Paper Trading")
  const [accountName, setAccountName] = useState("")

  async function load() {
    try {
      setLoading(true)
      const data = await getBrokerConnections()
      setConnections(data)
    } catch (e) {
      toast.error("Failed to load connections")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleConnect = async (provider: string) => {
    try {
      let configObj: any = { accountName }
      if (provider === "Tradovate") configObj = { ...configObj, apiKey, apiSecret }
      if (provider === "TradeLocker") configObj = { ...configObj, clientId, clientSecret, environment }
      if (provider === "NinjaTrader") configObj = { ...configObj, username, password }
      if (provider === "Rithmic") configObj = { ...configObj, username, password, server }

      await addBrokerConnection(provider, configObj)
      toast.success(`Connected to ${provider}`)
      setActiveDialog(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to connect")
    }
  }

  const handleDisconnect = async (id: string) => {
    try {
      await removeBrokerConnection(id)
      toast.success("Disconnected")
      load()
    } catch (e: any) {
      toast.error("Failed to disconnect")
    }
  }

  const handleSync = async (id: string) => {
    try {
      setConnections(prev => prev.map(c => c.id === id ? { ...c, status: "Syncing" } : c))
      await syncBroker(id)
      toast.success("Sync completed")
      load()
    } catch (e: any) {
      toast.error(e.message || "Sync failed")
      load()
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading connections...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">Connected Accounts <Badge variant="secondary">Under Construction</Badge></h1>
        <p className="text-muted-foreground">Manage direct broker integrations for automated trade importing.</p>
        <div className="mt-4 p-4 border border-amber-500/30 bg-amber-500/10 rounded-lg text-amber-500 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Direct Broker APIs are currently disabled pending production keys. Please use the Import Center CSV uploads.
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROVIDERS.map(p => {
          const conn = connections.find(c => c.provider === p.id)
          const isConnected = !!conn
          const isSyncing = conn?.status === "Syncing"

          return (
            <Card key={p.id} className={isConnected ? "border-primary/50" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{p.name}</CardTitle>
                  {isConnected ? (
                    isSyncing ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Syncing</Badge>
                    ) : conn.status === "Error" ? (
                      <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Error</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-success/10 text-success"><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</Badge>
                    )
                  ) : (
                    <Badge variant="secondary">Not Connected</Badge>
                  )}
                </div>
                <CardDescription>{p.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                {isConnected && conn.lastSync ? (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {new Date(conn.lastSync).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground invisible">No sync data</p>
                )}
                {isConnected && conn.errorMessage && (
                  <p className="text-xs text-destructive mt-2">{conn.errorMessage}</p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t bg-muted/20 pt-4">
                {isConnected ? (
                  <>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80" onClick={() => handleDisconnect(conn.id)} disabled>
                      Disconnect
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleSync(conn.id)} disabled>
                      <RefreshCw className="w-4 h-4 mr-2" /> Sync Now
                    </Button>
                  </>
                ) : (
                  <Button variant="default" size="sm" className="w-full" disabled>
                    <Link2 className="w-4 h-4 mr-2" /> Coming Soon
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Credential Dialogs */}
      <Dialog open={activeDialog !== null} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {activeDialog}</DialogTitle>
            <DialogDescription>
              Enter your API credentials. They will be AES-256 encrypted before being stored.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input value={accountName} onChange={e => setAccountName(e.target.value)} />
            </div>

            {activeDialog === "Tradovate" && (
              <>
                <div className="space-y-2"><Label>API Key</Label><Input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" /></div>
                <div className="space-y-2"><Label>API Secret</Label><Input value={apiSecret} onChange={e => setApiSecret(e.target.value)} type="password" /></div>
              </>
            )}

            {activeDialog === "TradeLocker" && (
              <>
                <div className="space-y-2"><Label>Client ID</Label><Input value={clientId} onChange={e => setClientId(e.target.value)} /></div>
                <div className="space-y-2"><Label>Client Secret</Label><Input value={clientSecret} onChange={e => setClientSecret(e.target.value)} type="password" /></div>
                <div className="space-y-2"><Label>Environment</Label><Input value={environment} onChange={e => setEnvironment(e.target.value)} placeholder="live or demo" /></div>
              </>
            )}

            {(activeDialog === "NinjaTrader" || activeDialog === "Rithmic") && (
              <>
                <div className="space-y-2"><Label>Username</Label><Input value={username} onChange={e => setUsername(e.target.value)} /></div>
                <div className="space-y-2"><Label>Password</Label><Input value={password} onChange={e => setPassword(e.target.value)} type="password" /></div>
              </>
            )}

            {activeDialog === "Rithmic" && (
              <div className="space-y-2"><Label>Server / System</Label><Input value={server} onChange={e => setServer(e.target.value)} placeholder="e.g. Rithmic Paper Trading" /></div>
            )}
            
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-4"><CheckCircle2 className="w-3 h-3 text-success"/> Secure Encrypted Connection</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button onClick={() => handleConnect(activeDialog!)}>Connect Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
