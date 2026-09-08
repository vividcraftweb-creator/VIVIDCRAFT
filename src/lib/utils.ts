import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes user roles so that 'FREELANCER', 'ARTIST', 'CREATOR', etc.
 * always map to 'ARTIST'.
 */
export function formatRole(role?: string | null): 'ARTIST' | 'CLIENT' | 'ADMIN' | string {
  if (!role) return 'ARTIST';
  const r = role.toUpperCase();
  if (r === 'ARTIST' || r === 'FREELANCER' || r === 'CREATOR' || r === 'SELLER') {
    return 'ARTIST';
  }
  if (r === 'CLIENT' || r === 'BUYER') {
    return 'CLIENT';
  }
  if (r === 'ADMIN') {
    return 'ADMIN';
  }
  return r;
}

/**
 * Capitalized role name for user-facing UI labels (e.g., 'Artist', 'Client', 'Admin')
 */
export function formatRoleDisplay(role?: string | null): string {
  const normalized = formatRole(role);
  if (normalized === 'ARTIST') return 'Artist';
  if (normalized === 'CLIENT') return 'Client';
  if (normalized === 'ADMIN') return 'Admin';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

/**
 * Standard badge styling for roles across admin and dashboard pages
 */
export function getRoleBadgeClass(role?: string | null): string {
  const normalized = formatRole(role);
  if (normalized === 'ARTIST') {
    return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
  }
  if (normalized === 'CLIENT') {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  }
  if (normalized === 'ADMIN') {
    return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  }
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
}
