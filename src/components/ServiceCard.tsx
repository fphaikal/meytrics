import { useState } from 'react';
import type { Service, DailyPing, Settings } from '../lib/types';
import { UptimeBars } from './UptimeBars';
import { ResponseTimeGraph } from './ResponseTimeGraph';

interface ServiceCardProps {
  service: Service;
  dailyPings: DailyPing[];
  settings?: Partial<Settings>;
}

export function ServiceCard({ service, dailyPings, settings = {} }: ServiceCardProps) {
  const [showGraph, setShowGraph] = useState(false);
  const isUp = service.current_status === 'up' || service.current_status === null;
  const statusText = service.current_status === null ? 'No data' : isUp ? 'Operational' : 'Down';

  // Get latest response time from daily pings
  const latestResponseTime = dailyPings.length > 0 && dailyPings[dailyPings.length - 1].avg_response_time
    ? Math.round(dailyPings[dailyPings.length - 1].avg_response_time as number)
    : null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="p-4">
        {/* Header Row - matches UptimeRobot layout */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800 dark:text-slate-200">{service.name}</span>
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-blue-500 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-sm font-medium text-emerald-500">{service.uptime_percent || '0.00'}%</span>
            {latestResponseTime !== null && (
              <>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  onClick={() => setShowGraph(!showGraph)}
                  className="text-sm text-slate-500 hover:text-blue-500 transition-colors flex items-center gap-1"
                  title="Click to show/hide response time graph"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>{latestResponseTime}ms</span>
                  <svg
                    className={`w-3 h-3 transition-transform ${showGraph ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${service.current_status === null
                ? 'bg-slate-300'
                : isUp
                  ? 'bg-emerald-500'
                  : 'bg-red-500'
                }`}
            />
            <span
              className={`text-sm ${service.current_status === null
                ? 'text-slate-400'
                : isUp
                  ? 'text-emerald-500'
                  : 'text-red-500'
                }`}
            >
              {statusText}
            </span>
          </div>
        </div>

        {/* Uptime Bars */}
        <UptimeBars dailyPings={dailyPings} />

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
