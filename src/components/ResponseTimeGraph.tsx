import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAggregatedPings } from '../lib/api';
import type { Ping, Settings } from '../lib/types';
import { formatTime as formatTimeUtil, formatAxisTime } from '../lib/timeUtils';

interface ResponseTimeGraphProps {
  serviceId: number;
  days?: number;
  hours?: number; // New parameter for more specific time ranges
  settings?: Partial<Settings>;
}

export function ResponseTimeGraph({ serviceId, days = 1, hours, settings = {} }: ResponseTimeGraphProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; ping: Ping } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [width, setWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Use aggregated API with hours or days parameter
  const { data: pings = [] } = useQuery<Ping[]>({
    queryKey: ['aggregated-pings', serviceId, hours, days],
    queryFn: () => getAggregatedPings(serviceId, hours ? { hours } : { days }),
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate time range for X-axis (from cutoffTime to now)


  // Data is pre-filtered and aggregated by backend, just sort by time
  const validPings = pings
    .filter(p => p.response_time !== null)
    .sort((a, b) => {
      // Ensure we treat the strings as UTC
      const timeA = new Date(a.created_at.endsWith('Z') ? a.created_at : a.created_at + 'Z').getTime();
      const timeB = new Date(b.created_at.endsWith('Z') ? b.created_at : b.created_at + 'Z').getTime();
      return timeA - timeB;
    });


  // Helper to parse server time as UTC
  const parseUtcDate = (dateStr: string) => new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');

  // Calculate time range
  const now = new Date();
  const timeRangeMs = hours
    ? hours * 60 * 60 * 1000
    : days * 24 * 60 * 60 * 1000;

  const cutoffTime = new Date(now.getTime() - timeRangeMs);

  // Auto-fit start time: if earliest data is newer than cutoff, use earliest data (with slight buffer)
  // This solves the "empty space" issue for new monitors
  let timeRangeStart = cutoffTime.getTime();
  const sortedPings = validPings.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (sortedPings.length > 0) {
    const earliestPingTime = parseUtcDate(sortedPings[0].created_at).getTime();
    if (earliestPingTime > timeRangeStart) {
      // Add 5% buffer based on ACTUAL data span, not the full time range
      // This prevents huge empty spaces when viewing 30d range for a new monitor
      const dataSpan = now.getTime() - earliestPingTime;
      const buffer = Math.max(dataSpan * 0.05, 60 * 1000); // Minimum 1 minute buffer
      timeRangeStart = earliestPingTime - buffer;
    }
  }

  // Recalculate effective rangems based on new start
  const effectiveTimeRangeMs = now.getTime() - timeRangeStart;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || validPings.length < 2) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartWidthPx = rect.width - 70; // Account for left + right padding
    const chartX = x - 50; // Offset for left padding

    if (chartX < 0 || chartX > chartWidthPx) {
      setHoveredPoint(null);
      return;
    }

    // Calculate time based on mouse X position
    const ratio = chartX / chartWidthPx;
    // FIX: Use effectiveTimeRangeMs instead of timeRangeMs to match the rendered chart
    const mouseTime = timeRangeStart + ratio * effectiveTimeRangeMs;

    // Find closest ping based on time
    let closestPing = validPings[0];
    let closestIndex = 0;
    let minDiff = Infinity;

    validPings.forEach((ping, idx) => {
      const pingTime = new Date(ping.created_at.endsWith('Z') ? ping.created_at : ping.created_at + 'Z').getTime();
      const diff = Math.abs(pingTime - mouseTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestPing = ping;
        closestIndex = idx;
      }
    });

    if (closestPing) {
      setHoveredPoint({
        x: closestIndex,
        y: closestPing.response_time as number,
        ping: closestPing
      });
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  }, [validPings, timeRangeStart, effectiveTimeRangeMs]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  if (validPings.length < 2) {
    return (
      <div className="text-sm text-default-400 py-8 text-center rounded-lg">
        Not enough data for response time graph
      </div>
    );
  }

  // Calculate stats
  const responseTimes = validPings.map(p => p.response_time as number);
  const maxTime = Math.max(...responseTimes);

  // Chart dimensions
  const chartWidth = width;
  const chartHeight = 200;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const effectiveWidth = chartWidth - paddingLeft - paddingRight;
  const effectiveHeight = chartHeight - paddingTop - paddingBottom;

  // Y-axis scale (in seconds with some headroom)
  const maxYValue = Math.max(maxTime * 1.2, 1000); // At least 1 second max
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => (maxYValue / (yTickCount - 1)) * i);

  // Format time for display
  const formatTime = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${Math.round(ms)}ms`;
  };

  // Format Y-axis labels
  const formatYLabel = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Calculate X position based on time
  const getXPosition = (pingTime: Date) => {
    const timeSinceStart = pingTime.getTime() - timeRangeStart;
    const ratio = Math.max(0, Math.min(1, timeSinceStart / effectiveTimeRangeMs));
    return paddingLeft + ratio * effectiveWidth;
  };

  // Generate time labels for X-axis
  const getXTimeLabels = () => {
    const labels: { time: Date; position: number }[] = [];

    // Generate 6 evenly spaced time labels from timeRangeStart to now
    for (let i = 0; i <= 5; i++) {
      const ratio = i / 5;
      const time = new Date(timeRangeStart + effectiveTimeRangeMs * ratio);
      labels.push({ time, position: ratio });
    }

    return labels;
  };

  const xLabels = getXTimeLabels();

  // Generate path using time-based X positions
  const pathPoints = validPings.map((p, i) => {
    const pingTime = parseUtcDate(p.created_at);
    const x = getXPosition(pingTime);
    const y = paddingTop + effectiveHeight - ((p.response_time as number) / maxYValue) * effectiveHeight;
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  // Generate area path (closed) using time-based X positions
  const areaPath = validPings.length > 0 ? `
    M ${getXPosition(parseUtcDate(validPings[0].created_at))},${paddingTop + effectiveHeight}
    ${validPings.map((p) => {
    const pingTime = parseUtcDate(p.created_at);
    const x = getXPosition(pingTime);
    const y = paddingTop + effectiveHeight - ((p.response_time as number) / maxYValue) * effectiveHeight;
    return `L ${x},${y}`;
  }).join(' ')}
    L ${getXPosition(parseUtcDate(validPings[validPings.length - 1].created_at))},${paddingTop + effectiveHeight}
    Z
  ` : '';

  // Calculate hovered point position using time-based X
  const getHoveredPointPosition = () => {
    if (!hoveredPoint) return null;
    const pingTime = parseUtcDate(hoveredPoint.ping.created_at);
    const x = getXPosition(pingTime);
    const y = paddingTop + effectiveHeight - (hoveredPoint.y / maxYValue) * effectiveHeight;
    return { x, y };
  };

  const hoveredPos = getHoveredPointPosition();

  return (
    <div className="relative" ref={containerRef}>
      {/* Chart Container */}
      <div className="relative" style={{ height: '200px', width: '100%' }}>
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${width} ${chartHeight}`}
          preserveAspectRatio="none"
          height={chartHeight}
          className="block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id={`response-gradient-${serviceId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines and labels */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + effectiveHeight - (tick / maxYValue) * effectiveHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-slate-100 dark:text-slate-700"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="currentColor"
                  className="text-default-500"
                  fontSize="10"
                >
                  {formatYLabel(tick)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={areaPath}
            fill={`url(#response-gradient-${serviceId})`}
          />

          {/* Line path */}
          <path
            d={pathPoints}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Vertical indicator line when hovering */}
          {hoveredPos && (
            <>
              <line
                x1={hoveredPos.x}
                y1={paddingTop}
                x2={hoveredPos.x}
                y2={paddingTop + effectiveHeight}
                stroke="rgb(59, 130, 246)"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.5"
              />
              <circle
                cx={hoveredPos.x}
                cy={hoveredPos.y}
                r="5"
                fill="white"
                stroke="rgb(59, 130, 246)"
                strokeWidth="2"
              />
            </>
          )}

          {/* X-axis labels */}
          {xLabels.map((label, i) => {
            const x = paddingLeft + label.position * effectiveWidth;
            return (
              <text
                key={i}
                x={x}
                y={chartHeight - 10}
                textAnchor="middle"
                fill="currentColor"
                className="text-default-500"
                fontSize="10"
              >
                {hours
                  ? formatAxisTime(label.time, settings)
                  : label.time.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: settings.timezone || 'Asia/Jakarta'
                  })
                }
              </text>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="fixed z-50 bg-content1 border border-divider rounded-lg px-3 py-2 shadow-lg pointer-events-none"
            style={{
              left: tooltipPos.x + 15,
              top: tooltipPos.y - 60,
            }}
          >
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              {formatTimeUtil(parseUtcDate(hoveredPoint.ping.created_at), settings, { includeSeconds: true })}
              <span className="text-slate-400 dark:text-slate-500 mx-1">·</span>
              <span className="text-slate-500 dark:text-slate-400">
                {parseUtcDate(hoveredPoint.ping.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: settings.timezone || 'Asia/Jakarta'
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-slate-500 dark:text-slate-400">Response time</span>
              <span className="font-medium text-slate-700 dark:text-slate-200 ml-auto">
                {formatTime(hoveredPoint.y)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
