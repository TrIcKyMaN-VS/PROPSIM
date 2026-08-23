"use client"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ComponentProps } from "react"

type Props = ComponentProps<typeof Button> & {
  loading?: boolean
  loadingText?: string
}

export function LoadingButton({
  loading,
  loadingText = "Saving...",
  children,
  disabled,
  ...props
}: Props) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  )
}