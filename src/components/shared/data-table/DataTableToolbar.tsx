"use client"

import { Cross2Icon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./DataTableViewOptions"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  // Find the first filterable text column by checking all columns without triggering warnings
  const firstFilterableColumn = table.getAllColumns().find(column => {
    const canFilter = column.getCanFilter()
    const hasAccessor = typeof column.accessorFn !== "undefined" || column.id === "title" || column.id === "jobTitle" || column.id === "project"
    return canFilter && hasAccessor
  })

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {firstFilterableColumn && (
          <Input
            placeholder="Filter items..."
            value={(firstFilterableColumn.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              firstFilterableColumn.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
