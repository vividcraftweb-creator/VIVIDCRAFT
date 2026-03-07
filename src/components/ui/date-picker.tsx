"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DateValue } from "@internationalized/date"
import { parseDate, today, getLocalTimeZone } from "@internationalized/date"

export interface DatePickerProps {
  value?: DateValue | null
  onChange: (date: DateValue | null) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  minValue?: DateValue
  maxValue?: DateValue
  className?: string
  label?: string
}

// Convert DateValue to JS Date
function dateValueToDate(dateValue: DateValue | null | undefined): Date | undefined {
  if (!dateValue) return undefined
  return new Date(dateValue.year, dateValue.month - 1, dateValue.day)
}

// Convert JS Date to DateValue
function dateToDateValue(date: Date | undefined): DateValue | null {
  if (!date) return null
  return parseDate(format(date, "yyyy-MM-dd"))
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  required = false,
  minValue,
  maxValue,
  className,
  label,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selectedDate = dateValueToDate(value)
  const minDate = dateValueToDate(minValue)
  const maxDate = dateValueToDate(maxValue)

  const handleSelect = (date: Date | undefined) => {
    onChange(dateToDateValue(date))
    setOpen(false)
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label className="text-sm font-medium text-slate-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-12",
              "bg-slate-800/90 border-slate-700/50 hover:bg-slate-700/50 hover:border-primary/50",
              "text-white hover:text-white",
              !selectedDate && "text-slate-400"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "MM/dd/yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={(date) => {
              if (minDate && date < minDate) return true
              if (maxDate && date > maxDate) return true
              return false
            }}
            initialFocus
            captionLayout="dropdown"
            fromDate={new Date(1900, 0, 1)}
            toDate={new Date(new Date().getFullYear() + 30, 11, 31)}
            fromYear={1900}
            toYear={new Date().getFullYear() + 30}
            className="rounded-lg border shadow-sm bg-slate-900"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
