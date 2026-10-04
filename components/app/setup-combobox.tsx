"use client"

import React, { useState, useMemo } from "react"
import { usePropStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { Check, ChevronsUpDown, Plus, Trash2, X, Sparkles, Crosshair } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SetupComboboxProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SetupCombobox({
  value = "",
  onChange,
  placeholder = "Select or create setup...",
  className,
  disabled = false,
}: SetupComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [setupToDelete, setSetupToDelete] = useState<string | null>(null)

  const customSetups = usePropStore((s) => s.customSetups) || []
  const deletedSetups = usePropStore((s) => s.deletedSetups) || []
  const addCustomSetup = usePropStore((s) => s.addCustomSetup)
  const deleteCustomSetup = usePropStore((s) => s.deleteCustomSetup)
  const playbooks = usePropStore((s) => s.playbooks) || []
  const trades = usePropStore((s) => s.trades) || []

  // Aggregate all known setups across custom, playbooks, and trades
  const availableSetups = useMemo(() => {
    const set = new Set<string>()

    // 1. User custom setups
    customSetups.forEach((s) => {
      if (s?.trim()) set.add(s.trim())
    })

    // 2. Playbooks from DB
    playbooks
      .filter((p: any) => !p.deletedAt && p.name?.trim())
      .forEach((p: any) => set.add(p.name.trim()))

    // 3. Trade records
    trades.forEach((t) => {
      if (t.playbookName?.trim()) set.add(t.playbookName.trim())
    })

    // Filter out blacklisted deleted setups
    const deletedLower = new Set(deletedSetups.map((d) => d.toLowerCase().trim()))
    return Array.from(set)
      .filter((s) => !deletedLower.has(s.toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
  }, [customSetups, playbooks, trades, deletedSetups])

  // Filter based on user query
  const filteredSetups = useMemo(() => {
    if (!search.trim()) return availableSetups
    const q = search.toLowerCase().trim()
    return availableSetups.filter((s) => s.toLowerCase().includes(q))
  }, [availableSetups, search])

  const exactMatchExists = useMemo(() => {
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    return availableSetups.some((s) => s.toLowerCase() === q)
  }, [availableSetups, search])

  const handleSelect = (setup: string) => {
    onChange(setup)
    setOpen(false)
    setSearch("")
  }

  const handleCreateNew = () => {
    const trimmed = search.trim()
    if (!trimmed) return
    addCustomSetup(trimmed)
    onChange(trimmed)
    setSearch("")
    setOpen(false)
    toast.success(`Setup "${trimmed}" created!`)
  }

  const handleConfirmDelete = async () => {
    if (!setupToDelete) return
    const target = setupToDelete
    setSetupToDelete(null)
    await deleteCustomSetup(target)
    if (value.toLowerCase() === target.toLowerCase()) {
      onChange("")
    }
    toast.success(`Setup "${target}" removed from options`)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-mono text-xs font-semibold h-9 px-3 bg-card/60 border-border/80 hover:bg-muted/40",
              className
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <Crosshair className="w-3.5 h-3.5 text-primary shrink-0" />
              {value ? (
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-bold bg-primary/10 text-primary border-primary/20 px-2 py-0 truncate max-w-[200px]"
                >
                  {value}
                </Badge>
              ) : (
                <span className="text-muted-foreground font-normal">{placeholder}</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {value && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange("")
                  }}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  title="Clear setup"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
              <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-72 sm:w-80 p-2 font-mono text-xs bg-popover/95 backdrop-blur-xl border-border/90 shadow-2xl z-50">
          <div className="space-y-2">
            <div className="relative">
              <Input
                placeholder="Search or type new setup..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    if (!exactMatchExists && search.trim()) {
                      handleCreateNew()
                    } else if (filteredSetups.length > 0) {
                      handleSelect(filteredSetups[0])
                    }
                  }
                }}
                className="h-8 font-mono text-xs bg-muted/40 border-border/80 pl-2.5 pr-7"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* If user typed a new setup that doesn't exist */}
            {!exactMatchExists && search.trim() && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleCreateNew}
                className="w-full justify-start text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 h-8 px-2.5 border border-dashed border-primary/30"
              >
                <Plus className="w-3.5 h-3.5 mr-2 shrink-0" />
                <span className="truncate">Add &quot;{search.trim()}&quot;</span>
              </Button>
            )}

            {/* List of existing setups */}
            <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
              {filteredSetups.length === 0 && exactMatchExists && (
                <div className="py-4 text-center text-muted-foreground text-xs font-sans">
                  No setups found. Type above to create one.
                </div>
              )}

              {value && (
                <button
                  type="button"
                  onClick={() => handleSelect("")}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-muted/50 text-left text-muted-foreground hover:text-foreground text-xs"
                >
                  <span className="flex items-center gap-1.5 italic">
                    <X className="w-3 h-3" /> None / Clear
                  </span>
                </button>
              )}

              {filteredSetups.map((setup) => {
                const isSelected = value.toLowerCase() === setup.toLowerCase()
                return (
                  <div
                    key={setup}
                    className={cn(
                      "group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-medium",
                      isSelected
                        ? "bg-primary/15 text-primary font-bold border border-primary/20"
                        : "hover:bg-muted/60 text-foreground"
                    )}
                    onClick={() => handleSelect(setup)}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 mr-2">
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{setup}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSetupToDelete(setup)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/15 hover:text-rose-400 text-muted-foreground transition-all shrink-0"
                      title={`Delete "${setup}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="pt-1 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground px-1">
              <span>{availableSetups.length} setup{availableSetups.length === 1 ? "" : "s"} available</span>
              <span className="flex items-center gap-1 font-sans">
                <Sparkles className="w-2.5 h-2.5 text-primary" /> Auto-saved
              </span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Confirmation Dialog for Deleting a Setup Option */}
      <AlertDialog open={!!setupToDelete} onOpenChange={(open) => !open && setSetupToDelete(null)}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-400">
              <Trash2 className="w-5 h-5" /> Delete Setup Option?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to remove <strong className="text-foreground font-mono">&quot;{setupToDelete}&quot;</strong> from your setup options?
              <br /><br />
              Existing trades with this setup will keep their record, but it will no longer appear in future dropdown options.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Setup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
