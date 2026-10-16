"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Download,
  X,
  Maximize2,
} from "lucide-react"

interface ImageLightboxProps {
  src: string | null
  alt?: string
  open: boolean
  onClose: () => void
}

export function ImageLightbox({ src, alt = "Trade Screenshot", open, onClose }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (open) {
      setZoom(1)
    }
  }, [open, src])

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.3, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.3, 0.7))
  const handleResetZoom = () => setZoom(1)

  const toggleZoom = () => {
    setZoom((z) => (z === 1 ? 1.6 : 1))
  }

  if (!src) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="!w-[98vw] !max-w-[98vw] sm:!max-w-[98vw] !h-[95vh] !max-h-[95vh] p-0 bg-black/95 border-border/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl z-[9999]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{alt}</DialogTitle>
        </DialogHeader>

        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950/80 border-b border-border/40 select-none shrink-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-primary" />
              {alt}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 0.7}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetZoom}
              className="h-8 w-8 text-muted-foreground hover:text-foreground text-xs font-mono font-bold"
              title="Reset Zoom (1:1)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            <div className="h-4 w-px bg-border/60 mx-1" />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(src, "_blank")}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Open original in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 ml-1 rounded-full"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Full View Canvas with Zoom and Smooth Drag/Scroll */}
        <div
          className="relative flex-1 w-full h-[calc(95vh-52px)] overflow-auto flex items-center justify-center p-2 cursor-zoom-in"
          onClick={toggleZoom}
        >
          <img
            src={src}
            alt={alt}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.18s cubic-bezier(0.2, 0, 0, 1)",
            }}
            className="max-w-full max-h-[calc(95vh-70px)] object-contain select-none shadow-lg rounded-md pointer-events-auto"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
