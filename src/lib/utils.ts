import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date/time with timezone and format settings
export function formatDateTime(
  date: string | Date,
  options?: {
    timezone?: string;
    timeFormat?: '12h' | '24h';
    showTime?: boolean;
    showDate?: boolean;
  }
): string {
  const {
    timezone = 'Asia/Jakarta',
    timeFormat = '24h',
    showTime = true,
    showDate = true
  } = options || {};

  const d = typeof date === 'string' ? new Date(date) : date;

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };

  if (showDate) {
    formatOptions.year = 'numeric';
    formatOptions.month = 'short';
    formatOptions.day = 'numeric';
  }

  if (showTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    formatOptions.hour12 = timeFormat === '12h';
  }

  try {
    return d.toLocaleString('en-US', formatOptions);
  } catch {
    // Fallback if timezone is invalid
    return d.toLocaleString();
  }
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString();
}
