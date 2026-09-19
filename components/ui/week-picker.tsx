import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { getISOWeekKey, getWeekRange } from "@/lib/date-utils"

export function WeekPicker({
  value,
  onChange,
  className
}: {
  value?: string // format: YYYY-WXX
  onChange?: (week: string) => void
  className?: string
}) {
  const selectedRange = React.useMemo(() => {
    if (!value) return undefined
    return getWeekRange(value)
  }, [value])


  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-muted/20 border-input",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? <span>Week {value.split("-W")[1]}, {value.split("-W")[0]}</span> : <span>Pick a week</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={selectedRange?.from}
          selected={selectedRange}
          onSelect={(range, selectedDay) => {
            if (selectedDay && onChange) {
              onChange(getISOWeekKey(selectedDay))
            }
          }}
          showWeekNumber
        />
      </PopoverContent>
    </Popover>
  )
}
