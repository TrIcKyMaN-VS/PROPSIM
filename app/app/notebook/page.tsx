"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BookOpen, Plus, Trash2, Save, FileText, Sparkles, Clock } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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

const STORAGE_KEY = "propsim-notebook-notes"

interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

function loadNotes(): Note[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function NotebookPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const loaded = loadNotes()
    setNotes(loaded)
    if (loaded.length > 0) {
      selectNote(loaded[0], loaded)
    }
  }, [])

  function selectNote(note: Note, noteList?: Note[]) {
    setSelectedId(note.id)
    setTitle(note.title)
    setContent(note.content)
    setLastSaved(note.updatedAt)
  }

  function createNote() {
    const now = Date.now()
    const newNote: Note = {
      id: String(now),
      title: "Untitled Research Note",
      content: "",
      createdAt: now,
      updatedAt: now,
    }
    const updated = [newNote, ...notes]
    setNotes(updated)
    saveNotes(updated)
    selectNote(newNote)
    toast.success("New note created")
  }

  const persistCurrentNote = useCallback(
    (newTitle: string, newContent: string, notesList: Note[], id: string) => {
      const now = Date.now()
      const updated = notesList.map((n) =>
        n.id === id ? { ...n, title: newTitle, content: newContent, updatedAt: now } : n
      )
      setNotes(updated)
      saveNotes(updated)
      setLastSaved(now)
    },
    []
  )

  const scheduleSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (!selectedId) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setNotes((current) => {
          persistCurrentNote(newTitle, newContent, current, selectedId)
          return current
        })
        toast.success("Note saved", { id: "note-save", duration: 1500 })
      }, 500)
    },
    [selectedId, persistCurrentNote]
  )

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value)
    scheduleSave(e.target.value, content)
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    scheduleSave(title, e.target.value)
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function confirmDeleteNote() {
    if (!selectedId) return
    const updated = notes.filter((n) => n.id !== selectedId)
    setNotes(updated)
    saveNotes(updated)
    toast.success("Note deleted")
    setShowDeleteConfirm(false)
    if (updated.length > 0) {
      selectNote(updated[0])
    } else {
      setSelectedId(null)
      setTitle("")
      setContent("")
      setLastSaved(null)
    }
  }

  const selectedNote = notes.find((n) => n.id === selectedId)

  return (
    <div className="animate-in fade-in duration-300 max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">Trading Notebook</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
              RESEARCH &amp; NOTES
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Store market research, execution notes, and daily trade playbooks.
          </p>
        </div>

        <Button onClick={createNote} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" /> New Note
        </Button>
      </div>

      {/* Two-column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 min-h-[600px]">
        
        {/* Left Panel Note List */}
        <div className="flex flex-col gap-2.5">
          {notes.length === 0 ? (
            <Card className="border-dashed border-border/80 bg-card/40 backdrop-blur-xl p-8 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-bold text-foreground">No notes recorded.</p>
              <Button size="sm" variant="outline" onClick={createNote} className="mt-3 font-bold font-mono text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Create First Note
              </Button>
            </Card>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                onClick={() => selectNote(note)}
                className={cn(
                  "w-full text-left rounded-2xl border p-4 transition-all duration-200 group relative overflow-hidden",
                  selectedId === note.id
                    ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(56,189,248,0.12)]"
                    : "border-border/60 bg-card/50 hover:bg-muted/30 hover:border-primary/40"
                )}
              >
                <p className="font-bold text-sm text-foreground truncate leading-tight">
                  {note.title || "Untitled Note"}
                </p>
                <p className="text-[11px] font-mono text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground/60" /> {formatDate(note.updatedAt)}
                </p>
                {note.content && (
                  <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2 leading-relaxed font-mono">
                    {note.content.slice(0, 90)}
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Right Panel Editor */}
        {selectedNote ? (
          <Card className="border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl flex flex-col rounded-2xl overflow-hidden">
            <CardHeader className="p-5 border-b border-border/60 bg-muted/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Input
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Note Title..."
                    className="text-xl font-bold border-0 px-0 h-auto focus-visible:ring-0 shadow-none bg-transparent text-foreground placeholder:text-muted-foreground/50"
                  />
                  {lastSaved && (
                    <p className="text-xs font-mono text-muted-foreground/70 mt-1 flex items-center gap-1.5">
                      <Save className="w-3.5 h-3.5 text-cyan-400" />
                      Auto-saved {formatDate(lastSaved)}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="shrink-0 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-xl"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-5 md:p-6">
              <Textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Write trade setup notes, market thoughts, levels, and execution reviews..."
                className="w-full min-h-[460px] resize-none border-0 p-0 shadow-none focus-visible:ring-0 bg-transparent text-sm leading-relaxed font-sans placeholder:text-muted-foreground/40"
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-border/80 bg-card/40 backdrop-blur-xl rounded-2xl flex items-center justify-center p-12 text-center">
            <div className="space-y-3">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <h3 className="text-lg font-bold text-foreground">Select a note or create a new one</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Your notes are saved automatically in real time as you type.
              </p>
              <Button onClick={createNote} className="mt-2 font-bold font-mono text-xs">
                <Plus className="w-4 h-4 mr-1" /> New Note
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Delete Note?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete this research note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
              onClick={confirmDeleteNote}
            >
              Delete Note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
