"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BookOpen, Plus, Trash2, Save, FileText } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

  // Load notes from localStorage on mount
  useEffect(() => {
    const loaded = loadNotes()
    setNotes(loaded)
    if (loaded.length > 0) {
      selectNote(loaded[0], loaded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      title: "Untitled Note",
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
        // Show toast only once per deliberate save attempt, not on every keystroke
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

  function deleteNote() {
    if (!selectedId) return
    const confirmed = window.confirm("Delete this note? This action cannot be undone.")
    if (!confirmed) return
    const updated = notes.filter((n) => n.id !== selectedId)
    setNotes(updated)
    saveNotes(updated)
    toast.success("Note deleted")
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-primary" />
            Trading Notebook
          </h1>
          <p className="text-muted-foreground mt-1">
            Market analysis, trade ideas, and research notes.
          </p>
        </div>
        <Button onClick={createNote} className="gap-2">
          <Plus className="w-4 h-4" />
          New Note
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 min-h-[600px]">
        {/* Left Panel – Note List */}
        <div className="flex flex-col gap-2">
          {notes.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <FileText className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No notes yet.</p>
                <Button size="sm" variant="outline" onClick={createNote} className="gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  Create your first note
                </Button>
              </CardContent>
            </Card>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                onClick={() => selectNote(note)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-all duration-200 hover:border-primary/50",
                  selectedId === note.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:bg-muted/30"
                )}
              >
                <p className="font-medium text-sm truncate leading-tight">
                  {note.title || "Untitled Note"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(note.updatedAt)}
                </p>
                {note.content && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {note.content.slice(0, 80)}
                    {note.content.length > 80 ? "…" : ""}
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Right Panel – Editor */}
        {selectedNote ? (
          <Card className="flex flex-col">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Input
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Note title…"
                    className="text-lg font-semibold border-0 px-0 h-auto focus-visible:ring-0 shadow-none bg-transparent"
                  />
                  {lastSaved && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Save className="w-3 h-3" />
                      Last saved {formatDate(lastSaved)}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={deleteNote}
                  className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Delete note"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4">
              <Textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Start writing your trade ideas, market analysis, research notes…"
                className="w-full min-h-[400px] resize-none border-0 p-0 shadow-none focus-visible:ring-0 bg-transparent text-sm leading-relaxed"
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] text-center gap-3">
              <BookOpen className="w-12 h-12 text-muted-foreground/30" />
              <h3 className="text-lg font-medium">Select a note or create one</h3>
              <p className="text-sm text-muted-foreground">
                Your notes are saved automatically as you type.
              </p>
              <Button size="sm" onClick={createNote} className="gap-1 mt-2">
                <Plus className="w-4 h-4" />
                New Note
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
