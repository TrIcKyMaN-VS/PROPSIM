"use client"

import { useState, useEffect, useCallback } from "react"
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
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react"
import { toast } from "sonner"

interface ImageLightboxProps {
  src?: string | null
  images?: string[]
  initialIndex?: number
  alt?: string
  open: boolean
  onClose: () => void
}

export function ImageLightbox({
  src,
  images,
  initialIndex = 0,
  alt = "Trade Screenshot",
  open,
  onClose,
}: ImageLightboxProps) {
  // Support both single src and array of images
  const imageList = images && images.length > 0 ? images : src ? [src] : []
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [copied, setCopied] = useState(false)

  // Reset index when modal opens or images change
  useEffect(() => {
    if (open) {
      if (src && (!images || images.length === 0)) {
        setCurrentIndex(0)
      } else if (images && images.length > 0) {
        const found = src ? images.indexOf(src) : -1
        setCurrentIndex(found >= 0 ? found : Math.min(initialIndex, images.length - 1))
      }
      setZoom(1)
    }
  }, [open, src, images, initialIndex])

  const activeSrc = imageList[currentIndex] || src || null

  const handleNext = useCallback(() => {
    if (imageList.length > 1) {
      setCurrentIndex((i) => (i + 1) % imageList.length)
      setZoom(1)
    }
  }, [imageList.length])

  const handlePrev = useCallback(() => {
    if (imageList.length > 1) {
      setCurrentIndex((i) => (i - 1 + imageList.length) % imageList.length)
      setZoom(1)
    }
  }, [imageList.length])

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.3, 3.5))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.3, 0.6))
  const handleResetZoom = () => setZoom(1)

  const toggleZoom = () => {
    setZoom((z) => (z === 1 ? 1.7 : 1))
  }

  const handleCopyLink = () => {
    if (activeSrc) {
      navigator.clipboard.writeText(activeSrc)
      setCopied(true)
      toast.success("Image link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if (e.key === "ArrowLeft") {
        handlePrev()
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn()
      } else if (e.key === "-") {
        handleZoomOut()
      } else if (e.key === "0") {
        handleResetZoom()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose, handleNext, handlePrev])

  if (!open || !activeSrc) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="!w-[98vw] !max-w-[98vw] sm:!max-w-[98vw] !h-[96vh] !max-h-[96vh] p-0 bg-neutral-950/98 border border-neutral-800/80 rounded-2xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-2xl z-[9999]"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{alt}</DialogTitle>
        </DialogHeader>

        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950/90 border-b border-neutral-800/80 select-none shrink-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-200 tracking-tight flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-primary" />
              {alt}
            </span>
            {imageList.length > 1 && (
              <span className="text-[11px] font-mono font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-700">
                {currentIndex + 1} / {imageList.length}
              </span>
            )}
            <span className="text-[10px] text-neutral-400 font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Zoom Controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 0.6}
              className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800"
              title="Zoom out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetZoom}
              className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs font-mono font-bold"
              title="Reset Zoom (0)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 3.5}
              className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800"
              title="Zoom in (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            <div className="h-4 w-px bg-neutral-800 mx-1" />

            {/* Copy Link */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyLink}
              className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800"
              title="Copy image URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>

            {/* Open Original */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(activeSrc, "_blank")}
              className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800"
              title="Open original in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 ml-1 rounded-full"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Canvas & Navigation Controls */}
        <div className="relative flex-1 w-full h-[calc(96vh-52px)] overflow-auto flex items-center justify-center p-2 bg-neutral-950">
          {/* Previous Button (if multiple images) */}
          {imageList.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePrev()
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700/80 shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
              title="Previous Screenshot (ArrowLeft)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Main Screenshot Image */}
          <div
            className="w-full h-full flex items-center justify-center cursor-zoom-in overflow-auto p-4"
            onClick={toggleZoom}
          >
            <img
              src={activeSrc}
              alt={`${alt} ${currentIndex + 1}`}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                transition: "transform 0.18s cubic-bezier(0.2, 0, 0, 1)",
              }}
              className="max-w-full max-h-[calc(96vh-75px)] object-contain select-none shadow-2xl rounded-lg pointer-events-auto border border-neutral-900"
            />
          </div>

          {/* Next Button (if multiple images) */}
          {imageList.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleNext()
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700/80 shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
              title="Next Screenshot (ArrowRight)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Bottom Thumbnail Strip (if multiple images) */}
          {imageList.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 backdrop-blur-md shadow-xl max-w-[85vw] overflow-x-auto">
              {imageList.map((img, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentIndex(idx)
                    setZoom(1)
                  }}
                  className={`relative w-12 h-8 rounded-md overflow-hidden border transition-all shrink-0 ${
                    currentIndex === idx
                      ? "border-primary ring-2 ring-primary/40 scale-105"
                      : "border-neutral-700 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
