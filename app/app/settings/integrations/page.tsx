"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plug, Key, Trash2, Copy, CheckCircle2, RefreshCw, XCircle, Download, BookOpen } from "lucide-react"
import { generateApiToken, getApiTokens, revokeApiToken } from "@/app/actions/integration-actions"
import { getAccounts, updateAccountMapping, getDiscoveredAccounts, renameAccount } from "@/app/actions/account-actions"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export default function IntegrationsPage() {
  const [tokens, setTokens] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [discoveredAccounts, setDiscoveredAccounts] = useState<any[]>([])
  const [mappingInput, setMappingInput] = useState<Record<string, string>>({})
  const [nameInput, setNameInput] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const [syncStartDate, setSyncStartDate] = useState("")
  const [syncEndDate, setSyncEndDate] = useState("")
  const [syncLoading, setSyncLoading] = useState(false)

  const handleSyncHistory = async () => {
    try {
      setSyncLoading(true)
      const res = await fetch("/api/integrations/ninjatrader/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(syncStartDate + "T00:00:00").toISOString(),
          endDate: new Date(syncEndDate + "T23:59:59").toISOString()
        })
      })
      if (!res.ok) throw new Error("Failed to queue sync command")
      toast.success("Sync request queued! NinjaTrader will query database on next heartbeat.")
    } catch (e: any) {
      toast.error(e.message || "Failed to queue sync request")
    } finally {
      setSyncLoading(false)
    }
  }

  async function load(silent = false) {
    try {
      if (!silent) setLoading(true)
      const data = await getApiTokens()
      setTokens(data)
      const accs = await getAccounts()
      const activeAccs = accs.filter((a: any) => !a.archivedAt && a.status === "active")
      setAccounts(activeAccs)
      const discovered = await getDiscoveredAccounts()
      setDiscoveredAccounts(discovered)
      
      const initialMapping: Record<string, string> = {}
      const initialNames: Record<string, string> = {}
      accs.forEach((a: any) => {
        initialNames[a.id] = a.name || ""
        if (a.brokerAccountName) {
          initialMapping[a.id] = a.brokerAccountName
        }
      })
      // Only set mapping input if we are doing initial load, to not overwrite user typing
      if (!silent) {
        setMappingInput(initialMapping)
        setNameInput(initialNames)
      }
    } catch (e) {
      if (!silent) toast.error("Failed to load integrations")
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), 15000) // Poll silently every 15s
    return () => clearInterval(interval)
  }, [])

  const handleGenerate = async (provider: string) => {
    try {
      setGenerating(true)
      const newToken = await generateApiToken(provider)
      toast.success(`Generated new token for ${provider}`)
      
      // Keep token visible until page reload/dismiss so user can copy it
      setTokens(prev => [newToken, ...prev])
    } catch (e: any) {
      toast.error(e.message || "Failed to generate token")
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiToken(id)
      toast.success("Token revoked")
      load()
    } catch (e: any) {
      toast.error("Failed to revoke token")
    }
  }

  const handleCopy = (token: string, id: string) => {
    navigator.clipboard.writeText(token)
    setCopied(id)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSaveMapping = async (accountId: string) => {
    try {
      const name = mappingInput[accountId] || ""
      await updateAccountMapping(accountId, name)
      toast.success("Account mapping saved")
    } catch (e) {
      toast.error("Failed to save mapping")
    }
  }

  const handleSaveName = async (accountId: string) => {
    try {
      const name = nameInput[accountId] || ""
      await renameAccount(accountId, name)
      toast.success("Challenge custom name saved")
      load(true)
    } catch (e) {
      toast.error("Failed to save custom name")
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">Integrations & API</h1>
        <p className="text-muted-foreground">Manage API tokens for local add-ons and third-party integrations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* NinjaTrader Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plug className="w-5 h-5" />
                NinjaTrader Add-On
              </CardTitle>
              {tokens.some(t => t.provider === "NinjaTrader") && (() => {
                const ntTokens = tokens.filter(t => t.provider === "NinjaTrader")
                const isConnected = ntTokens.some(t => t.lastUsed && (Date.now() - new Date(t.lastUsed).getTime() < 65000))
                const mostRecentToken = ntTokens
                  .filter(t => t.lastUsed)
                  .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())[0]
                
                return (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => load()} disabled={loading}>
                        <RefreshCw className={cn("w-3 h-3 text-muted-foreground", loading && "animate-spin")} />
                      </Button>
                      {isConnected ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                          <XCircle className="w-3 h-3 mr-1" /> Disconnected
                        </Badge>
                      )}
                    </div>
                    {mostRecentToken?.lastUsed && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        Last ping: {new Date(mostRecentToken.lastUsed).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )
              })()}
            </div>
            <CardDescription>
              Sync trades in real-time from your local NinjaTrader 8 platform to PROPSIM automatically.
            </CardDescription>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Dialog>
                <DialogTrigger className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full sm:w-auto")}>
                  <BookOpen className="w-4 h-4 mr-2" /> Setup Guide
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>How to Connect NinjaTrader</DialogTitle>
                    <DialogDescription>
                      Follow these steps to automatically sync your NinjaTrader 8 executions with PROPSIM.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 pt-4 text-sm">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">1</span> 
                        Install the Add-On
                      </h3>
                      <div className="pl-8 text-muted-foreground space-y-3">
                        <Button className="w-full sm:w-auto" variant="outline" asChild>
                          <a href="/PropSimIntegration.zip" download="PropSimIntegration.zip">
                            <Download className="w-4 h-4 mr-2" /> Download PropSimIntegration.zip
                          </a>
                        </Button>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Open your NinjaTrader 8 Control Center.</li>
                          <li>Go to <strong>Tools</strong> &rarr; <strong>Import</strong> &rarr; <strong>NinjaScript Add-On...</strong></li>
                          <li>Select the downloaded <code>.zip</code> file.</li>
                          <li><em>(Do not restart NinjaTrader yet)</em></li>
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">2</span> 
                        Generate Your API Token
                      </h3>
                      <div className="pl-8 text-muted-foreground">
                        Click the blue <strong>"Generate Sync Token"</strong> button below this popup and copy the secret text.
                      </div>
                    </div>


                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">3</span> 
                        Give NinjaTrader the Token
                      </h3>
                      <div className="pl-8 text-muted-foreground space-y-2">
                        <p>We need to tell the Add-On which PROPSIM account to send trades to.</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Open your computer's Documents folder and navigate to: <br/><code>Documents\NinjaTrader 8\</code></li>
                          <li>Create a new Text Document and name it exactly: <code>propsim_token.txt</code></li>
                          <li>Open the file, paste your API token inside, and click Save.</li>
                          <li>
                            <strong>Optional (Custom Server URL):</strong> By default, it connects to <code>http://localhost:3000</code>.
                            If your server is running on a different port or domain (e.g. <code>http://localhost:3001</code>), 
                            create a file named <code>propsim_url.txt</code> in the same folder, paste the full URL inside, and save.
                          </li>
                          <li>Now, completely <strong>Restart NinjaTrader 8</strong>.</li>
                        </ul>
                        <p className="text-xs italic text-primary/80 mt-2">You will now see a green "Connected" badge on this page!</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">4</span> 
                        Map Your Accounts
                      </h3>
                      <div className="pl-8 text-muted-foreground">
                        Scroll down to the <strong>Account Mapping</strong> section on this page to link your local NinjaTrader broker accounts to your active PROPSIM Challenges.
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              To connect NinjaTrader, generate a Sync Token below and paste it into the NinjaTrader Add-On settings.
            </p>
            <Button 
              onClick={() => handleGenerate("NinjaTrader")} 
              disabled={generating}
              className="w-full sm:w-auto"
            >
              <Key className="w-4 h-4 mr-2" />
              Generate Sync Token
            </Button>
          </CardContent>
        </Card>

        {/* Sync History Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Sync Trade History
            </CardTitle>
            <CardDescription>
              Query and sync past trades for a custom date range directly from NinjaTrader.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  value={syncStartDate}
                  onChange={e => setSyncStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">End Date</label>
                <Input
                  type="date"
                  value={syncEndDate}
                  onChange={e => setSyncEndDate(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleSyncHistory}
              disabled={syncLoading || !syncStartDate || !syncEndDate}
              className="w-full"
            >
              {syncLoading ? "Sync Request Queued..." : "Sync Date Range"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="pt-6">
        <h2 className="text-xl font-bold tracking-tight mb-4">Active API Tokens</h2>
        
        {loading ? (
          <div className="p-8 text-center text-muted-foreground border rounded-lg">Loading tokens...</div>
        ) : tokens.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
            No active API tokens found.
          </div>
        ) : (
          <div className="space-y-4">
            {tokens.map(token => (
              <Card key={token.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {token.provider}
                        <Badge variant="secondary" className="text-xs">API</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Created: {new Date(token.createdAt).toLocaleDateString()}
                      </div>
                      {token.lastUsed && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Last Sync: {new Date(token.lastUsed).toLocaleString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                      <div className="flex w-full sm:w-auto shadow-sm">
                        <div className="flex h-9 w-full sm:w-[200px] items-center overflow-hidden rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm">
                          <span className="tracking-widest opacity-60 font-bold translate-y-[2px]">••••••••••••••••••</span>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-l-none"
                          onClick={() => handleCopy(token.token, token.id)}
                        >
                          {copied === token.id ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto mt-2 sm:mt-0"
                        onClick={() => handleRevoke(token.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="pt-6">
        <h2 className="text-xl font-bold tracking-tight mb-4">Account Mapping</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Map your broker account names to your PROPSIM challenges. When a trade is synced, we'll match it to the correct account using this mapping.
        </p>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground border rounded-lg">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
            No active challenges found.
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((acc: any) => (
              <Card key={acc.id} className="overflow-hidden">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      {acc.name || `${acc.sizeLabel} Challenge`}
                      {acc.challengeType === "CUSTOM" ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none px-2 py-0.5 text-[10px] font-semibold rounded-full">
                          Custom
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none px-2 py-0.5 text-[10px] font-semibold rounded-full">
                          Official
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Firm: {acc.firmId}</div>
                  </div>
                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    {/* Rename Form */}
                    <div className="flex items-center gap-2 w-full">
                      <Input
                        type="text"
                        placeholder="Custom Name"
                        value={nameInput[acc.id] || ""}
                        onChange={(e) => setNameInput({...nameInput, [acc.id]: e.target.value})}
                        className="h-9 w-full sm:w-[200px]"
                      />
                      <Button variant="outline" size="sm" onClick={() => handleSaveName(acc.id)}>Save Name</Button>
                    </div>
                    {/* Broker Mapping Dropdown */}
                    <div className="flex items-center gap-2 w-full">
                      <select
                        value={mappingInput[acc.id] || ""}
                        onChange={(e) => setMappingInput({...mappingInput, [acc.id]: e.target.value})}
                        className="flex h-9 w-full sm:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">-- Map Broker Account --</option>
                        {discoveredAccounts.map(da => (
                          <option key={da.id} value={da.accountName}>{da.accountName}</option>
                        ))}
                      </select>
                      <Button size="sm" onClick={() => handleSaveMapping(acc.id)}>Map Account</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
