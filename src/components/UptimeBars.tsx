import { useState } from 'react';
import type { DailyPing } from '../lib/types';

interface UptimeBarsProps {
    dailyPings: DailyPing[];
    variant?: 'bars' | 'dots';
    statusColors?: {
        success?: string;
        warning?: string;
        error?: string;
        primary?: string;
        secondary?: string;
    };
}

export function UptimeBars({ dailyPings, variant = 'bars', statusColors }: UptimeBarsProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    // Take last 90 days. For dots we might want distinct count?
    // UptimeRobot uses 90 bars/dots.
    const bars = dailyPings.slice(-90);

    // Fill up to 90 bars if needed
    const filledBars = [...Array(90 - bars.length).fill(null), ...bars];

    const formatDowntime = (minutes: number | undefined) => {
        if (!minutes || minutes === 0) return null;
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours < 24) {
            return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
        }
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} day${days > 1 ? 's' : ''}`;
    };

    const handleMouseEnter = (index: number, event: React.MouseEvent) => {
        setHoveredIndex(index);
        const rect = event.currentTarget.getBoundingClientRect();
        setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top });
    };

    return (
        <div className="relative">
            {/* Standard Bars */}
            {variant === 'bars' ? (
                <div className="flex items-end gap-[1px] h-8">
                    {filledBars.map((ping, index) => {
                        // Calculate uptime percentage for proportional coloring
                        const uptimePercent = ping && ping.uptime_percent ? parseFloat(ping.uptime_percent) : 0;
                        const downtimePercent = 100 - uptimePercent;

                        // Responsive visibility: Hide oldest 60 bars (indices 0-59) on mobile (< sm breakpoint)
                        // Shows 30 bars on mobile, 90 bars on tablet/desktop
                        const visibilityClass = index < 60 ? 'hidden sm:block' : 'block';
                        const flexVisibilityClass = index < 60 ? 'hidden sm:flex' : 'flex';

                        // No data - gray bar
                        if (!ping || ping.status === 'no_data') {
                            return (
                                <div
                                    key={index}
                                    className={`${visibilityClass} flex-1 min-w-[2px] h-full rounded-full cursor-pointer transition-opacity hover:opacity-70 bg-foreground/15`}
                                    onMouseEnter={(e) => ping && handleMouseEnter(index, e)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    style={{
                                        backgroundColor: !ping ? undefined : 'rgba(156, 163, 175, 0.2)'
                                    }}
                                />
                            );
                        }

                        // Has data - show proportional green/red bar
                        const minRedHeight = 15;
                        const displayRedHeight = downtimePercent > 0 ? Math.max(downtimePercent, minRedHeight) : 0;
                        const displayGreenHeight = 100 - displayRedHeight;

                        return (
                            <div
                                key={index}
                                className={`${flexVisibilityClass} flex-1 min-w-[2px] h-full rounded-full cursor-pointer transition-opacity hover:opacity-70 flex-col overflow-hidden`}
                                onMouseEnter={(e) => handleMouseEnter(index, e)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                {downtimePercent > 0 && (
                                    <div
                                        className={!statusColors ? "bg-red-500 w-full" : "w-full"}
                                        style={{
                                            height: `${displayRedHeight}%`,
                                            backgroundColor: statusColors?.error
                                        }}
                                    />
                                )}
                                {displayGreenHeight > 0 && (
                                    <div
                                        className={!statusColors ? "bg-emerald-500 w-full flex-1" : "w-full flex-1"}
                                        style={{
                                            height: `${displayGreenHeight}%`,
                                            backgroundColor: statusColors?.success
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Dots Style */
                <div className="flex items-center justify-between gap-[2px] h-8">
                    {filledBars.map((ping, index) => {
                        const uptimePercent = ping && ping.uptime_percent ? parseFloat(ping.uptime_percent) : 0;
                        const isDown = uptimePercent < 100;
                        const noData = !ping || ping.status === 'no_data';

                        // Responsive visibility: Hide oldest 60 dots on mobile
                        const visibilityClass = index < 60 ? 'hidden sm:block' : 'block';

                        return (
                            <div
                                key={index}
                                className={`${visibilityClass} flex-1 min-w-[4px] aspect-square rounded-full cursor-pointer transition-transform hover:scale-125 ${noData
                                    ? 'bg-slate-200 dark:bg-slate-700'
                                    : !statusColors
                                        ? (isDown ? 'bg-red-500' : 'bg-emerald-500')
                                        : ''
                                    }`}
                                style={{
                                    backgroundColor: noData
                                        ? undefined
                                        : (isDown ? statusColors?.error : statusColors?.success)
                                }}
                                onMouseEnter={(e) => ping && handleMouseEnter(index, e)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Tooltip (Same for both) */}
            {hoveredIndex !== null && filledBars[hoveredIndex] && (
                <div
                    className="fixed z-50 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none"
                    style={{
                        left: tooltipPosition.x,
                        top: tooltipPosition.y - 10,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="font-medium mb-1">{filledBars[hoveredIndex]?.date}</div>
                    {filledBars[hoveredIndex]?.status === 'no_data' ? (
                        <div className="text-slate-300">No data</div>
                    ) : (
                        <>
                            <div className="flex justify-between gap-4">
                                <span className="text-slate-300">Uptime:</span>
                                <span className={
                                    filledBars[hoveredIndex]?.uptime_percent === 100
                                        ? 'text-emerald-400'
                                        : filledBars[hoveredIndex]?.uptime_percent === 0
                                            ? 'text-red-400'
                                            : 'text-yellow-400'
                                }>
                                    {filledBars[hoveredIndex]?.uptime_percent}%
                                </span>
                            </div>
                            {/* Show downtime duration if any */}
                            {filledBars[hoveredIndex]?.downtime_minutes && filledBars[hoveredIndex]?.downtime_minutes > 0 && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-300">Down:</span>
                                    <span className="text-red-400">
                                        {formatDowntime(filledBars[hoveredIndex]?.downtime_minutes)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between gap-4">
                                <span className="text-slate-300">Checks:</span>
                                <span>{filledBars[hoveredIndex]?.total_checks}</span>
                            </div>
                            {filledBars[hoveredIndex]?.avg_response_time && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-300">Avg Response:</span>
                                    <span>{filledBars[hoveredIndex]?.avg_response_time}ms</span>
                                </div>
                            )}
                        </>
                    )}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                </div>
            )}
        </div>
    );
}
