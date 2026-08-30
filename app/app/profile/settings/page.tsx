"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, MonitorSmartphone, HelpCircle, Activity, Globe } from "lucide-react"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { usePropStore } from "@/lib/store"

export default function ProfileSettingsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  // Mock sessions to simulate what would come from the database /api/auth/sessions endpoint
  const [activeSessions, setActiveSessions] = useState([
    { id: "1", userAgent: "Chrome on Windows", ip: "192.168.1.42", current: true, lastActive: "Just now" },
    { id: "2", userAgent: "Safari on iPhone", ip: "10.0.0.15", current: false, lastActive: "2 days ago" },
    { id: "3", userAgent: "Edge on Mac", ip: "172.16.254.1", current: false, lastActive: "1 week ago" }
  ])

  const handleLogoutOtherDevices = async () => {
    setLoading(true)
    try {
      // In a real app, this calls a Server Action or API to invalidate DB sessions
      await new Promise(resolve => setTimeout(resolve, 800))
      setActiveSessions(prev => prev.filter(s => s.current))
      toast.success("Successfully logged out of all other devices.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security & Settings</h1>
        <p className="text-muted-foreground">Manage your security settings and active device sessions.</p>
      </div>

      <div className="grid gap-6">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MonitorSmartphone className="h-5 w-5 text-primary" /> Active Sessions</CardTitle>
            <CardDescription>Manage devices currently logged into your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSessions.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 text-primary p-2 rounded-md">
                    {device.current ? <Activity className="h-5 w-5" /> : <MonitorSmartphone className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      {device.userAgent}
                      {device.current && <Badge variant="default" className="text-[10px] h-4">Current Device</Badge>}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>IP: {device.ip}</span>
                      <span>•</span>
                      <span>Last active: {device.lastActive}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="bg-muted/50 pt-6 rounded-b-xl border-t">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                Your account is secure.
              </div>
              <Button 
                variant="destructive" 
                onClick={handleLogoutOtherDevices} 
                disabled={loading || activeSessions.length <= 1}
              >
                {loading ? "Logging out..." : "Logout Other Devices"}
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Trading Preferences */}
        <TradingPreferencesCard />

        {/* AI Provider Settings */}
        <AiSettingsCard />

        {/* Timezone settings card */}
        <TimezoneSettingsCard />

      </div>
    </div>
  )
}

import { BrainCircuit, Save } from "lucide-react"
import { getUserAiSettings, saveUserAiSettings } from "@/app/actions/ai-settings-actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function TimezoneSettingsCard() {
  const displayTimeMode = usePropStore(s => s.displayTimeMode)
  const setDisplayTimeMode = usePropStore(s => s.setDisplayTimeMode)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> Timezone & Market Display
        </CardTitle>
        <CardDescription>
          Configure how execution timestamps and entry/exit times are displayed across the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-w-sm">
          <Label>Display Time Mode</Label>
          <Select 
            value={displayTimeMode || "Exchange Time"} 
            onValueChange={(v) => {
              setDisplayTimeMode(v as "Exchange Time" | "Local Time")
              toast.success(`Display timezone set to ${v}.`)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Timezone Mode" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start" side="bottom">
              <SelectItem value="Exchange Time">Exchange Time (New York Market Time - America/New_York)</SelectItem>
              <SelectItem value="Local Time">Local Time (Your Browser Timezone)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Exchange Time automatically translates all futures executions (e.g. MNQ, NQ, ES, MES, RTY, YM) to America/New_York (EST/EDT) to match broker statements and exchange hours, while Local Time displays trades in your current system timezone.
        </p>
      </CardContent>
    </Card>
  )
}

function AiSettingsCard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [settings, setSettings] = useState({
    provider: "PROPSIM",
    hasOpenaiKey: false,
    hasAnthropicKey: false,
    hasGeminiKey: false
  })

  // Inputs for new keys
  const [keys, setKeys] = useState({
    openaiKey: "",
    anthropicKey: "",
    geminiKey: ""
  })

  useEffect(() => {
    getUserAiSettings().then(data => {
      setSettings(data)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = { provider: settings.provider }
      if (keys.openaiKey) payload.openaiKey = keys.openaiKey
      if (keys.anthropicKey) payload.anthropicKey = keys.anthropicKey
      if (keys.geminiKey) payload.geminiKey = keys.geminiKey

      await saveUserAiSettings(payload)
      
      // Update local state to reflect that keys exist now
      setSettings(prev => ({
        ...prev,
        hasOpenaiKey: prev.hasOpenaiKey || !!keys.openaiKey,
        hasAnthropicKey: prev.hasAnthropicKey || !!keys.anthropicKey,
        hasGeminiKey: prev.hasGeminiKey || !!keys.geminiKey,
      }))
      setKeys({ openaiKey: "", anthropicKey: "", geminiKey: "" })
      
      toast.success("AI Settings saved securely.")
    } catch (err: any) {
      toast.error(err.message || "Failed to save AI settings.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-primary" /> AI Provider Settings</CardTitle>
        <CardDescription>Choose between VSX Managed AI (default) or provide your own API keys for unlimited personal usage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading AI settings...</div>
        ) : (
          <>
            <div className="space-y-2 max-w-sm">
              <Label>Active Provider</Label>
              <Select value={settings.provider} onValueChange={(v) => setSettings({...settings, provider: v || "PROPSIM"})}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="start" side="bottom">
                  <SelectItem value="PROPSIM">VSX Managed (Default)</SelectItem>
                  <SelectItem value="OPENAI">OpenAI (Personal Key)</SelectItem>
                  <SelectItem value="ANTHROPIC">Anthropic (Personal Key)</SelectItem>
                  <SelectItem value="GEMINI">Google Gemini (Personal Key)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div>
                <h4 className="font-medium">Personal API Keys</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Keys are encrypted securely using AES-256-GCM. We never expose your keys to the frontend or return them in responses.
                </p>
              </div>
              
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>OpenAI API Key</Label>
                    {settings.hasOpenaiKey && <Badge variant="outline" className="text-success text-[10px] h-4">Configured</Badge>}
                  </div>
                  <Input 
                    type="password" 
                    placeholder={settings.hasOpenaiKey ? "••••••••••••••••••••••••" : "sk-..."}
                    value={keys.openaiKey}
                    onChange={e => setKeys({...keys, openaiKey: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Google Gemini API Key</Label>
                    {settings.hasGeminiKey && <Badge variant="outline" className="text-success text-[10px] h-4">Configured</Badge>}
                  </div>
                  <Input 
                    type="password" 
                    placeholder={settings.hasGeminiKey ? "••••••••••••••••••••••••" : "AIzaSy..."}
                    value={keys.geminiKey}
                    onChange={e => setKeys({...keys, geminiKey: e.target.value})}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label>Anthropic API Key</Label>
                    {settings.hasAnthropicKey && <Badge variant="outline" className="text-success text-[10px] h-4">Configured</Badge>}
                  </div>
                  <Input 
                    type="password" 
                    placeholder={settings.hasAnthropicKey ? "••••••••••••••••••••••••" : "sk-ant-..."}
                    value={keys.anthropicKey}
                    onChange={e => setKeys({...keys, anthropicKey: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="bg-muted/50 pt-6 rounded-b-xl border-t justify-end">
        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? "Saving..." : "Save AI Settings"}
          <Save className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  )
}

function TradingPreferencesCard() {
  const defaultPlannedRisk = usePropStore(s => s.defaultPlannedRisk)
  const setDefaultPlannedRisk = usePropStore(s => s.setDefaultPlannedRisk)
  const [val, setVal] = useState(defaultPlannedRisk.toString())

  // We need Input from ui components, already imported at top
  const handleSave = () => {
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) {
      setDefaultPlannedRisk(num)
      toast.success("Trading preferences updated.")
    } else {
      toast.error("Please enter a valid dollar amount.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Trading Preferences</CardTitle>
        <CardDescription>Configure your default trading risk metrics to automate your analytics.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Default Planned Risk ($)</Label>
          <div className="text-sm text-muted-foreground mb-3 leading-relaxed">
            This is the standard dollar amount you risk per trade (e.g. 1R = $100). 
            When you import trades, the simulator will automatically use this value to calculate your Net R multiple.
          </div>
          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="any"
                className="pl-7 h-9"
                value={val}
                onChange={e => setVal(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={handleSave}>Save</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
