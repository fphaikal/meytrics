import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  try {
    // If it's already an ISO string with Z, just parse it
    if (dateStr.endsWith('Z')) {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    }

    // If it looks like SQL date "YYYY-MM-DD HH:MM:SS" (common in SQLite/MySQL raw)
    if (dateStr.includes(' ')) {
      const d = new Date(dateStr.replace(' ', 'T') + 'Z');
      return isNaN(d.getTime()) ? null : d;
    }

    // Try standard parse
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;

  } catch (e) {
    return null;
  }
}
