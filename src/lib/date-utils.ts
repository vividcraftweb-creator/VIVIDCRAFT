import { format, parse, isValid, isBefore, isAfter, startOfDay } from 'date-fns';
import { parseDate, today, getLocalTimeZone, type DateValue } from '@internationalized/date';

/**
 * Format Date object to MM/DD/YYYY string for display
 */
export function formatDateToDisplay(date: Date | null | undefined): string {
  if (!date || !isValid(date)) return '';
  return format(date, 'MM/dd/yyyy');
}

/**
 * Format Date to ISO string (YYYY-MM-DD) for database storage
 */
export function formatDateToISO(date: Date | null | undefined): string | undefined {
  if (!date || !isValid(date)) return undefined;
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse ISO date string (YYYY-MM-DD) to Date object
 */
export function parseISODate(isoStr: string | null | undefined): Date | null {
  if (!isoStr) return null;

  try {
    const parsed = parse(isoStr, 'yyyy-MM-dd', new Date());
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Convert YYYY-MM month format to first day of month Date object
 * Used for backward compatibility with Experience/Education fields
 */
export function parseMonthToDate(monthStr: string | null | undefined): Date | null {
  if (!monthStr) return null;

  try {
    // Parse YYYY-MM format and set to first day of month
    const parsed = parse(monthStr, 'yyyy-MM', new Date());
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Format Date to YYYY-MM for backward compatibility
 */
export function formatDateToMonth(date: Date | null | undefined): string | undefined {
  if (!date || !isValid(date)) return undefined;
  return format(date, 'yyyy-MM');
}

/**
 * Validation: ensure date is in the future (not today or past)
 */
export function isFutureDate(date: Date | null | undefined): boolean {
  if (!date || !isValid(date)) return false;
  const today = startOfDay(new Date());
  return isAfter(startOfDay(date), today);
}

/**
 * Validation: ensure date is within range
 */
export function isDateInRange(
  date: Date | null | undefined,
  min?: Date,
  max?: Date
): boolean {
  if (!date || !isValid(date)) return false;

  if (min && isBefore(date, startOfDay(min))) return false;
  if (max && isAfter(date, startOfDay(max))) return false;

  return true;
}

/**
 * Parse various date formats to Date object
 * Handles: ISO (YYYY-MM-DD), Month (YYYY-MM), and full ISO timestamps
 */
export function parseFlexibleDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  // Try ISO date first (YYYY-MM-DD)
  const isoDate = parseISODate(dateStr);
  if (isoDate) return isoDate;

  // Try month format (YYYY-MM)
  const monthDate = parseMonthToDate(dateStr);
  if (monthDate) return monthDate;

  // Try parsing as full ISO timestamp
  try {
    const parsed = new Date(dateStr);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ============================================================================
// HeroUI @internationalized/date utilities
// ============================================================================

/**
 * Convert ISO string (YYYY-MM-DD) to CalendarDate for HeroUI DatePicker
 */
export function parseISOToCalendarDate(isoStr: string | null | undefined): DateValue | null {
  if (!isoStr) return null;

  try {
    // Remove time part if present
    const dateOnly = isoStr.split('T')[0];
    return parseDate(dateOnly);
  } catch {
    return null;
  }
}

/**
 * Convert CalendarDate to ISO string (YYYY-MM-DD) for database storage
 */
export function formatCalendarDateToISO(date: DateValue | null | undefined): string | undefined {
  if (!date) return undefined;
  return date.toString();
}

/**
 * Get today's date as CalendarDate
 */
export function getTodayCalendarDate(): DateValue {
  return today(getLocalTimeZone());
}

/**
 * Parse flexible date formats to CalendarDate
 * Handles: ISO (YYYY-MM-DD), Month (YYYY-MM)
 */
export function parseFlexibleToCalendarDate(dateStr: string | null | undefined): DateValue | null {
  if (!dateStr) return null;

  try {
    // Try ISO date first (YYYY-MM-DD)
    const dateOnly = dateStr.split('T')[0];

    // If it's YYYY-MM (month only), append -01 for first of month
    if (dateOnly.match(/^\d{4}-\d{2}$/)) {
      return parseDate(`${dateOnly}-01`);
    }

    // Otherwise parse as is
    return parseDate(dateOnly);
  } catch {
    return null;
  }
}
