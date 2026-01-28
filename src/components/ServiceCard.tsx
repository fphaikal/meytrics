import { useState } from 'react';
import type { Service, DailyPing, Settings } from '../lib/types';
import { UptimeBars } from './UptimeBars';
import { ResponseTimeGraph } from './ResponseTimeGraph';

interface ServiceCardProps {
  service: Service;
  dailyPings: DailyPing[];
  settings?: Partial<Settings>;
  monitorStyle?: 'bars' | 'dots' | 'list';
  statusColors?: {
    success?: string;
    warning?: string;
    error?: string;
    primary?: string;
    secondary?: string;
  };
}

export function ServiceCard({ service, dailyPings, settings = {}, monitorStyle = 'bars', statusColors }: ServiceCardProps) {
  const [showGraph, setShowGraph] = useState(false);
  const isUp = service.current_status === 'up';
  const isPaused = service.current_status === 'paused' || service.paused;
  // If status is null, it's 'No data'. If paused, 'Paused'. If up, 'Operational'. Else 'Down'.
  const statusText = service.current_status === null
    ? 'No data'
    : isPaused
      ? 'Paused'
      : isUp
        ? 'Operational'
        : 'Down';

  // Get latest response time from daily pings
  const latestResponseTime = dailyPings.length > 0 && dailyPings[dailyPings.length - 1].avg_response_time
    ? Math.round(dailyPings[dailyPings.length - 1].avg_response_time as number)
    : null;

  const uptimeColor = statusColors?.success || undefined;
  // If uptimeColor is present, use style override, otherwise fallback to Tailwind class
  // But wait, the existing code uses text-emerald-500.
  // I will use style for custom colors if present.

  // List View (Compact)
  if (monitorStyle === 'list') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span
              className={`w-3 h-3 rounded-full flex-shrink-0 ${!statusColors ? (service.current_status === null ? 'bg-slate-300' : isPaused ? 'bg-slate-400' : isUp ? 'bg-emerald-500' : 'bg-red-500') : ''
                }`}
              style={{
                backgroundColor: statusColors ? (
                  service.current_status === null ? undefined : (isPaused ? statusColors.secondary : isUp ? statusColors.success : statusColors.error)
                ) : undefined
              }}
            />
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-none">{service.name}</span>
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-500 transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50 dark:border-slate-800">
            <button
              onClick={() => setShowGraph(!showGraph)}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-500 transition-colors"
              title="Click to show/hide response time graph"
            >
              {latestResponseTime !== null && (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>{latestResponseTime}ms</span>
                </>
              )}
              <svg
                className={`w-4 h-4 transition-transform ${showGraph ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-4">
              <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
              <span
                className={`text-sm font-medium ${!uptimeColor ? 'text-emerald-500' : ''}`}
                style={{ color: uptimeColor }}
              >
                {service.uptime_percent || '0.00'}%
              </span>
              <span
                className={`text-sm font-medium px-2 py-0.5 rounded ${!statusColors
                  ? (service.current_status === null ? 'bg-slate-100 text-slate-500' : isPaused ? 'bg-slate-100 text-slate-600' : isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')
                  : ''
                  }`}
                style={{
                  color: statusColors ? (
                    service.current_status === null ? undefined : (isPaused ? statusColors.secondary : isUp ? statusColors.success : statusColors.error)
                  ) : undefined,
                  backgroundColor: statusColors ? (
                    service.current_status === null ? undefined : (isPaused ? `${statusColors.secondary}15` : isUp ? `${statusColors.success}15` : `${statusColors.error}15`)
                  ) : undefined
                }}
              >
                {statusText}
              </span>
            </div>
          </div>
        </div>

        {/* Response Time Graph (expandable for List view) */}
        {showGraph && (
          <div className="border-t border-slate-100 dark:border-slate-700 p-4">
            <ResponseTimeGraph
              serviceId={service.id}
              days={1}
              settings={settings}
            />
          </div>
        )}
      </div>
    );
  }

  // Bars and Dots View
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="p-4">
        {/* Header Row - matches UptimeRobot layout */}
        <div className="flex flex-wrap items-center justify-between mb-3 gap-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-xs">{service.name}</span>
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-500 transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
            <span
              className={`text-sm font-medium ${!uptimeColor ? 'text-emerald-500' : ''}`}
              style={{ color: uptimeColor }}
            >
              {service.uptime_percent || '0.00'}%
            </span>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
            <button
              onClick={() => setShowGraph(!showGraph)}
              className="text-sm text-slate-500 hover:text-blue-500 transition-colors flex items-center gap-1 ml-auto sm:ml-0"
              title="Click to show/hide response time graph"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {latestResponseTime !== null ? (
                <span>{latestResponseTime}ms</span>
              ) : (
                <span className="text-xs italic text-slate-400">No Data</span>
              )}
              <svg
                className={`w-3 h-3 transition-transform ${showGraph ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <span
              className={`w-2 h-2 rounded-full ${
                // Fallback classes if no custom color
                !statusColors ? (service.current_status === null ? 'bg-slate-300' : isPaused ? 'bg-slate-400' : isUp ? 'bg-emerald-500' : 'bg-red-500') : ''
                }`}
              style={{
                backgroundColor: statusColors ? (
                  service.current_status === null ? undefined : (isPaused ? statusColors.secondary : isUp ? statusColors.success : statusColors.error)
                ) : undefined
              }}
            />
            <span
              className={`text-sm ${!statusColors ? (service.current_status === null ? 'text-slate-400' : isPaused ? 'text-slate-500' : isUp ? 'text-emerald-500' : 'text-red-500') : ''
                }`}
              style={{
                color: statusColors ? (
                  service.current_status === null ? undefined : (isPaused ? statusColors.secondary : isUp ? statusColors.success : statusColors.error)
                ) : undefined
              }}
            >
              {statusText}
            </span>
          </div>
        </div>

        {/* Uptime Bars or Dots */}
        <UptimeBars
          dailyPings={dailyPings}
          statusColors={statusColors}
          variant={monitorStyle === 'dots' ? 'dots' : 'bars'}
        />

        {/* Response Time Graph (expandable) */}
        {showGraph && (
          <ResponseTimeGraph
            serviceId={service.id}
            days={1}
            settings={settings}
          />
        )}
      </div>
    </div>
  );
}
