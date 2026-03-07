'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import type { NotificationType } from '@/types/database.types';

export interface FilterState {
  types: NotificationType[];
  read?: boolean;
  searchQuery: string;
}

interface NotificationFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] = [
  { value: 'PROPOSAL_RECEIVED', label: 'Proposals' },
  { value: 'CONTRACT_STARTED', label: 'Contracts' },
  { value: 'MILESTONE_FUNDED', label: 'Funded Milestones' },
  { value: 'MILESTONE_SUBMITTED', label: 'Submitted Milestones' },
  { value: 'MILESTONE_COMPLETED', label: 'Completed Milestones' },
  { value: 'PAYMENT_RECEIVED', label: 'Payments' },
];

export function NotificationFilters({ filters, onFiltersChange }: NotificationFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.searchQuery);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Update filters when debounced search changes
  if (debouncedSearch !== filters.searchQuery) {
    onFiltersChange({ ...filters, searchQuery: debouncedSearch });
  }

  const handleTypeToggle = (type: NotificationType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: newTypes });
  };

  const handleReadFilterChange = (value: 'all' | 'unread') => {
    onFiltersChange({
      ...filters,
      read: value === 'all' ? undefined : false,
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    onFiltersChange({
      types: [],
      read: undefined,
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filters.types.length > 0 || filters.read !== undefined || filters.searchQuery !== '';

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      {/* Search Input */}
      <div className="flex-1">
        <Input
          type="text"
          placeholder="Search notifications..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2">
        <Button
          variant={filters.read === undefined ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleReadFilterChange('all')}
          className="whitespace-nowrap"
        >
          All
        </Button>
        <Button
          variant={filters.read === false ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleReadFilterChange('unread')}
          className="whitespace-nowrap"
        >
          Unread Only
        </Button>
      </div>

      {/* Type Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="whitespace-nowrap">
            <Filter className="h-4 w-4 mr-2" />
            Types
            {filters.types.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {filters.types.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {NOTIFICATION_TYPES.map((type) => (
            <DropdownMenuCheckboxItem
              key={type.value}
              checked={filters.types.includes(type.value)}
              onCheckedChange={() => handleTypeToggle(type.value)}
            >
              {type.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="whitespace-nowrap"
        >
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  );
}
