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

export function WeekPicker({
  value,
  onChange,
  className
}: {
  value?: string // format: YYYY-WXX
  onChange?: (week: string) => void
  className?: string
}) {
  // convert week key to a date roughly in that week
  const date = React.useMemo(() => {
    if (!value) return undefined
    const [yStr, wStr] = value.split("-W")
    if (!yStr || !wStr) return undefined
    const year = parseInt(yStr)
    const week = parseInt(wStr)
    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    return simple
  }, [value])

  const getWeekKeyFromDate = (d: Date) => {
    const year = d.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const numberOfDays = Math.floor(
      (d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000),
    );
    const week = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
    return `${year}-W${week.toString().padStart(2, "0")}`;
  }

  const selectedRange = React.useMemo(() => {
    if (!date) return undefined
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay()) // Sunday
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
    
    return {
      from: startOfWeek,
      to: endOfWeek
    }
  }, [date])

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
          defaultMonth={date}
          selected={selectedRange}
          onSelect={(range, selectedDay) => {
            if (selectedDay && onChange) {
              onChange(getWeekKeyFromDate(selectedDay))
            }
          }}
          showWeekNumber
        />
      </PopoverContent>
    </Popover>
  )
}
