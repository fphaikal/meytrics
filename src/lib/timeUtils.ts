import type { Settings } from './types';

/**
 * Format a date to a time string based on settings
 */
export function formatTime(
  date: Date | string,
  settings: Partial<Settings>,
  options?: {
    includeSeconds?: boolean;
    includeDate?: boolean;
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const timeFormat = settings.time_format || '24h';
  const timezone = settings.timezone || 'Asia/Jakarta';

  const hour12 = timeFormat === '12h';

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12,
    timeZone: timezone,
  };

  if (options?.includeSeconds) {
    timeOptions.second = '2-digit';
  }

  let result = d.toLocaleTimeString('en-US', timeOptions);

  if (options?.includeDate) {
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: timezone,
    };
    const dateStr = d.toLocaleDateString('en-US', dateOptions);
    result = `${result} · ${dateStr}`;
  }

  return result;
}

/**
 * Format timezone offset string (e.g., "GMT+7")
 */
export function getTimezoneOffset(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  });
  const parts = formatter.formatToParts(now);
  const tzPart = parts.find(p => p.type === 'timeZoneName');
  return tzPart?.value || 'GMT';
}

/**
 * Format a date to just the time portion for X-axis labels
 */
export function formatAxisTime(
  date: Date | string,
  settings: Partial<Settings>
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const timeFormat = settings.time_format || '24h';
  const timezone = settings.timezone || 'Asia/Jakarta';

  const hour12 = timeFormat === '12h';

  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12,
    timeZone: timezone,
  });
}
