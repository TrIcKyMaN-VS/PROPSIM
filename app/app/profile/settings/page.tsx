"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, MonitorSmartphone, Key, HelpCircle, Activity } from "lucide-react"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { toast } from "sonner"

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

  const handleConnect = (provider: string) => {
    toast.info(`Redirecting to ${provider} to link account...`)
    // NextAuth: signIn(provider, { action: "link" }) in a real scenario
  }

  const handleDisconnect = (provider: string) => {
    toast.success(`${provider} account disconnected.`)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security & Connected Accounts</h1>
        <p className="text-muted-foreground">Manage your SSO connections and active device sessions.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5 text-primary" /> Connected Providers</CardTitle>
            <CardDescription>Link social and professional accounts for one-click login.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="bg-muted p-2 rounded-md">
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">Google</h4>
                  <p className="text-sm text-muted-foreground">{session?.user?.email || "Not connected"}</p>
                </div>
              </div>
              <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleDisconnect('Google')}>
                Disconnect
              </Button>
            </div>

            {/* Microsoft */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="bg-muted p-2 rounded-md">
                  <svg className="h-6 w-6" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
                    <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
                    <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
                    <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">Microsoft</h4>
                  <p className="text-sm text-muted-foreground">Not connected</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => handleConnect('Microsoft')}>
                Connect
              </Button>
            </div>

            {/* GitHub */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="bg-muted p-2 rounded-md">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">GitHub</h4>
                  <p className="text-sm text-muted-foreground">Not connected</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => handleConnect('GitHub')}>
                Connect
              </Button>
            </div>
          </CardContent>
        </Card>

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

        {/* AI Provider Settings */}
        <AiSettingsCard />

      </div>
    </div>
  )
}

import { BrainCircuit, Save } from "lucide-react"
import { getUserAiSettings, saveUserAiSettings } from "@/app/actions/ai-settings-actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
        <CardDescription>Choose between PROPSIM Managed AI (default) or provide your own API keys for unlimited personal usage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading AI settings...</div>
        ) : (
          <>
            <div className="space-y-2 max-w-sm">
              <Label>Active Provider</Label>
              <Select value={settings.provider} onValueChange={(v) => setSettings({...settings, provider: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPSIM">PROPSIM Managed (Default)</SelectItem>
                  <SelectItem value="OPENAI">OpenAI (Personal Key)</SelectItem>
                  <SelectItem value="ANTHROPIC" disabled>Anthropic (Coming Soon)</SelectItem>
                  <SelectItem value="GEMINI" disabled>Google Gemini (Coming Soon)</SelectItem>
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
              
              <div className="grid gap-4">
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
