"use client"

import { useState, useCallback } from "react"
import { ReactFlow, Controls, Background, addEdge, applyNodeChanges, applyEdgeChanges, Node, Edge } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Button } from "@/components/ui/button"
import { Plus, Save } from "lucide-react"

const initialNodes: Node[] = [
  { id: "1", position: { x: 250, y: 50 }, data: { label: "IF: Daily Loss > $1000" }, style: { border: "2px solid var(--color-destructive)", padding: 10, borderRadius: 8, background: "var(--color-card)" } },
  { id: "2", position: { x: 250, y: 200 }, data: { label: "THEN: Fail Challenge" }, style: { border: "2px solid var(--color-primary)", padding: 10, borderRadius: 8, background: "var(--color-card)" } }
]
const initialEdges: Edge[] = [{ id: "e1-2", source: "1", target: "2", animated: true }]

export default function RulesBuilderPage() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>(initialEdges)

  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), [])
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])
  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [])

  const addNode = () => {
    const newNode: Node = {
      id: Math.random().toString(),
      position: { x: 100, y: 100 },
      data: { label: "New Condition" },
      style: { border: "1px solid var(--color-border)", padding: 10, borderRadius: 8, background: "var(--color-card)" }
    }
    setNodes(n => [...n, newNode])
  }

  return (
    <div className="h-[calc(100vh-6rem)] w-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visual Rule Builder</h1>
          <p className="text-muted-foreground">Drag and drop nodes to create custom automated trading rules.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addNode}><Plus className="w-4 h-4 mr-2" />Add Node</Button>
          <Button><Save className="w-4 h-4 mr-2" />Save Rules</Button>
        </div>
      </div>
      
      <div className="flex-1 border rounded-xl overflow-hidden bg-muted/5">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          colorMode="dark"
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}
