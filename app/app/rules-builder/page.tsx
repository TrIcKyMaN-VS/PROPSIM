"use client"

import { useState, useCallback, useEffect } from "react"
import { ReactFlow, Controls, Background, addEdge, applyNodeChanges, applyEdgeChanges, Node, Edge } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, Save, Settings2, Copy, Trash2, Zap, FolderOpen } from "lucide-react"
import { toast } from "sonner"
import { saveRuleTemplate, getRuleTemplates, deleteRuleTemplate } from "@/app/actions/rule-actions"

const initialNodes: Node[] = [
  { id: "1", type: "default", position: { x: 250, y: 50 }, data: { label: "IF: Daily Loss > $1000", config: { type: "Daily Loss", operator: ">", value: 1000 } }, style: { border: "2px solid var(--color-destructive)", padding: 10, borderRadius: 8, background: "var(--color-card)", width: 250 } },
  { id: "2", type: "default", position: { x: 250, y: 200 }, data: { label: "THEN: Block Trade", config: { action: "Block Trade" } }, style: { border: "2px solid var(--color-primary)", padding: 10, borderRadius: 8, background: "var(--color-card)", width: 250 } }
]
const initialEdges: Edge[] = [{ id: "e1-2", source: "1", target: "2", animated: true }]

export default function RulesBuilderPage() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>(initialEdges)
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), [])
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])
  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [])

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const data = await getRuleTemplates()
      setTemplates(data)
    } catch (e) {
      console.error(e)
    }
  }

  const addConditionNode = () => {
    const newNode: Node = {
      id: Math.random().toString(),
      type: "default",
      position: { x: 100, y: 100 },
      data: { label: "IF: New Condition", config: { type: "Daily Loss", operator: ">", value: 0 } },
      style: { border: "2px solid var(--color-destructive)", padding: 10, borderRadius: 8, background: "var(--color-card)", width: 250 }
    }
    setNodes(n => [...n, newNode])
  }

  const addActionNode = () => {
    const newNode: Node = {
      id: Math.random().toString(),
      type: "default",
      position: { x: 100, y: 300 },
      data: { label: "THEN: Action", config: { action: "Warning" } },
      style: { border: "2px solid var(--color-primary)", padding: 10, borderRadius: 8, background: "var(--color-card)", width: 250 }
    }
    setNodes(n => [...n, newNode])
  }

  const onNodeDoubleClick = (event: any, node: Node) => {
    setSelectedNode(node)
    setEditOpen(true)
  }

  const handleDuplicate = () => {
    if (!selectedNode) return
    const dup: Node = {
      ...selectedNode,
      id: Math.random().toString(),
      position: { x: selectedNode.position.x + 50, y: selectedNode.position.y + 50 }
    }
    setNodes(n => [...n, dup])
    setEditOpen(false)
    toast.success("Node duplicated")
  }

  const handleDelete = () => {
    if (!selectedNode) return
    setNodes(n => n.filter(x => x.id !== selectedNode.id))
    setEdges(e => e.filter(x => x.source !== selectedNode.id && x.target !== selectedNode.id))
    setEditOpen(false)
    toast.success("Node deleted")
  }

  const updateNodeData = (key: string, val: any) => {
    if (!selectedNode) return
    const isCondition = (selectedNode.data as any).label.toString().startsWith("IF")
    const newConfig = { ...selectedNode.data.config as any, [key]: val }
    
    let newLabel = (selectedNode.data as any).label
    if (isCondition) {
       newLabel = `IF: ${newConfig.type || ""} ${newConfig.operator || ""} ${newConfig.value || ""}`
    } else {
       newLabel = `THEN: ${newConfig.action || ""}`
    }

    setNodes(n => n.map(x => {
      if (x.id === selectedNode.id) {
        return { ...x, data: { ...x.data, label: newLabel, config: newConfig } }
      }
      return x
    }))
    
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, label: newLabel, config: newConfig } })
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return toast.error("Name required")
    setLoading(true)
    try {
      await saveRuleTemplate(templateName, nodes, edges)
      toast.success("Rule Engine Template Saved!")
      setSaveOpen(false)
      loadTemplates()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const applyTemplate = (t: any) => {
    setNodes(t.nodes)
    setEdges(t.edges)
    setLoadOpen(false)
    toast.success(`Loaded template: ${t.name}`)
  }

  return (
    <div className="h-[calc(100vh-6rem)] w-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executable Rule Builder</h1>
          <p className="text-muted-foreground">Build automated enforcement logic. Double-click a node to edit.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addConditionNode} className="border-destructive/50 hover:bg-destructive/10"><Plus className="w-4 h-4 mr-2" />Add Condition</Button>
          <Button variant="outline" onClick={addActionNode} className="border-primary/50 hover:bg-primary/10"><Zap className="w-4 h-4 mr-2" />Add Action</Button>
          <Button variant="secondary" onClick={() => setLoadOpen(true)}><FolderOpen className="w-4 h-4 mr-2" />Load</Button>
          <Button onClick={() => setSaveOpen(true)}><Save className="w-4 h-4 mr-2" />Save Rule Set</Button>
        </div>
      </div>
      
      <div className="flex-1 border rounded-xl overflow-hidden bg-muted/5 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          colorMode="dark"
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Node Configurator */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" /> Node Configurator
            </DialogTitle>
          </DialogHeader>
          
          {selectedNode && (
            <div className="space-y-6 pt-4">
              {(selectedNode.data as any).label.toString().startsWith("IF") ? (
                // Condition Config
                <>
                  <div className="space-y-2">
                    <Label>Condition Parameter</Label>
                    <Select value={(selectedNode.data.config as any)?.type} onValueChange={v => updateNodeData("type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily Loss">Daily Loss ($)</SelectItem>
                        <SelectItem value="Total Drawdown">Total Drawdown ($)</SelectItem>
                        <SelectItem value="Profit Target">Profit Target ($)</SelectItem>
                        <SelectItem value="Trading Hours">Trading Hours (Time)</SelectItem>
                        <SelectItem value="Max Contracts">Max Contracts</SelectItem>
                        <SelectItem value="Max Trades">Max Trades</SelectItem>
                        <SelectItem value="Consecutive Losses">Consecutive Losses</SelectItem>
                        <SelectItem value="Consecutive Wins">Consecutive Wins</SelectItem>
                        <SelectItem value="News Event">News Event Active</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Operator</Label>
                      <Select value={(selectedNode.data.config as any)?.operator} onValueChange={v => updateNodeData("operator", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">{">"} Greater Than</SelectItem>
                          <SelectItem value="<">{"<"} Less Than</SelectItem>
                          <SelectItem value="=">{"="} Equals</SelectItem>
                          <SelectItem value=">=">{">="} Greater/Equal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input type="text" value={(selectedNode.data.config as any)?.value || ""} onChange={e => updateNodeData("value", e.target.value)} />
                    </div>
                  </div>
                </>
              ) : (
                // Action Config
                <div className="space-y-2">
                  <Label>Execution Action</Label>
                  <Select value={(selectedNode.data.config as any)?.action} onValueChange={v => updateNodeData("action", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fail Challenge">Fail Challenge</SelectItem>
                      <SelectItem value="Warning">Warning</SelectItem>
                      <SelectItem value="Block Trade">Block Trade</SelectItem>
                      <SelectItem value="Reduce Position Size">Reduce Position Size (50%)</SelectItem>
                      <SelectItem value="Send Notification">Send Notification</SelectItem>
                      <SelectItem value="Lock Account">Lock Account for Day</SelectItem>
                      <SelectItem value="Mark Rule Violation">Mark Rule Violation</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    When the connected conditions are met, this action will execute automatically.
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end border-t pt-4">
                <Button variant="outline" onClick={handleDuplicate}><Copy className="w-4 h-4 mr-2" /> Duplicate</Button>
                <Button variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2" /> Delete Node</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Rule Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Strict EOD Pullback Rules" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTemplate} disabled={loading}>{loading ? "Saving..." : "Save Template"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Rule Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-4">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved templates found.</p>
            ) : (
              templates.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => applyTemplate(t)}>Load</Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                      if (confirm("Delete this template?")) {
                        await deleteRuleTemplate(t.id)
                        toast.success("Deleted")
                        loadTemplates()
                      }
                    }}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
