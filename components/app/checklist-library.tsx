"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Plus, ListChecks } from "lucide-react"
import { toast } from "sonner"
import { usePropStore } from "@/lib/store"

export function ChecklistLibrary({ onSelect }: { onSelect?: (checklist: any) => void }) {
  const [open, setOpen] = useState(false)
  const [deleteTemplate, setDeleteTemplate] = useState<{ id: string; name: string } | null>(null)
  const checklistTemplates = usePropStore(s => s.checklistTemplates) || []
  const saveChecklistTemplate = usePropStore(s => s.saveChecklistTemplate)
  const deleteChecklistTemplate = usePropStore(s => s.deleteChecklistTemplate)

  const [newName, setNewName] = useState("")
  const [items, setItems] = useState<{id: string, text: string, required: boolean}[]>([])
  const [newItemText, setNewItemText] = useState("")

  const handleAddItem = () => {
    if (!newItemText) return
    setItems([...items, { id: Math.random().toString(), text: newItemText, required: true }])
    setNewItemText("")
  }

  const handleSave = () => {
    if (!newName || items.length === 0) {
      toast.error("Checklist must have a name and at least one item")
      return
    }
    if (saveChecklistTemplate) {
      saveChecklistTemplate({
        id: Math.random().toString(),
        name: newName,
        items
      })
      toast.success("Checklist Template Saved")
      setNewName("")
      setItems([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="w-full" />}>
        <ListChecks className="w-4 h-4 mr-2" /> Checklist Library
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Reusable Checklist Library</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 pt-4 h-[500px]">
          {/* Left Column: Existing Templates */}
          <div className="space-y-4 overflow-y-auto pr-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">My Templates</h3>
            {checklistTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates saved yet.</p>
            ) : (
              checklistTemplates.map((t: any) => (
                <Card key={t.id} className="relative cursor-pointer hover:border-primary/50 transition-colors" onClick={() => onSelect && onSelect(t)}>
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:bg-destructive/10 z-10"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTemplate({ id: t.id, name: t.name })
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-xs text-muted-foreground">{t.items?.length || 0} items</p>
                  </CardContent>
                </Card>
              ))
            )}
            
            <div className="mt-8">
               <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Official Templates</h3>
               <Card className="cursor-pointer hover:border-primary/50 transition-colors bg-muted/20" onClick={() => onSelect && onSelect({ name: "Liquidity Sweep", items: [{id:"1", text: "HTF Bias Confirmed", required: true}, {id:"2", text: "Liquidity Marked", required: true}, {id:"3", text: "Sweep Confirmed", required: true}, {id:"4", text: "MSS Confirmed", required: true}]})}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">Liquidity Sweep</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-xs text-muted-foreground">4 items</p>
                  </CardContent>
                </Card>
            </div>
          </div>

          {/* Right Column: Build New Template */}
          <div className="space-y-4 border-l pl-6 overflow-y-auto">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Create New</h3>
            <Input 
              placeholder="Template Name (e.g., Breakout Checklist)" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
            />
            
            <div className="space-y-2 mt-4">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 p-2 border rounded bg-card group">
                  <Checkbox 
                    checked={item.required} 
                    onCheckedChange={(c) => {
                      const newItems = [...items]
                      newItems[idx].required = !!c
                      setItems(newItems)
                    }}
                  />
                  <Input 
                    className="h-8 text-sm" 
                    value={item.text} 
                    onChange={e => {
                      const newItems = [...items]
                      newItems[idx].text = e.target.value
                      setItems(newItems)
                    }} 
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setItems(items.filter(i => i.id !== item.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input 
                placeholder="Add checklist item..." 
                value={newItemText} 
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              />
              <Button onClick={handleAddItem} variant="secondary"><Plus className="w-4 h-4" /></Button>
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={handleSave}>Save Template</Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Delete Checklist Template Confirmation Dialog */}
      <AlertDialog open={deleteTemplate !== null} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete template &quot;{deleteTemplate?.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTemplate(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTemplate) {
                  deleteChecklistTemplate(deleteTemplate.id)
                  toast.success("Template deleted")
                  setDeleteTemplate(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
