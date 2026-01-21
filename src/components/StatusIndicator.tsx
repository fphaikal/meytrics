import { CheckCircle, XCircle, PauseCircle } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'up' | 'down' | 'paused' | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  pulse?: boolean;
}

/**
 * Reusable status indicator component with pulse animation and status icons.
 * 
 * @param status - The current status ('up', 'down', 'paused', or null/undefined)
 * @param size - Size variant: 'sm' (12px), 'md' (16px), 'lg' (24px), 'xl' (48px)
 * @param showIcon - Whether to show an icon inside (works better with lg/xl sizes)
 * @param pulse - Whether to show pulse animation (default: true for 'up' status)
 */
export function StatusIndicator({
  status,
  size = 'sm',
  showIcon = false,
  pulse = true
}: StatusIndicatorProps) {
  // Size mappings for the main indicator
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-12 h-12'
  };

  // Container sizes (to accommodate pulse ring)
  const containerSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-20 h-20'
  };

  const iconSizes = {
    sm: 8,
    md: 10,
    lg: 14,
    xl: 24
  };

  // Color mappings
  const bgColors = {
    up: 'bg-emerald-500',
    down: 'bg-red-500',
    paused: 'bg-yellow-500',
    unknown: 'bg-default-400'
  };

  const pulseColors = {
    up: 'bg-emerald-500/50',
    down: 'bg-red-500/50',
    paused: 'bg-yellow-500/50',
    unknown: 'bg-default-400/50'
  };

  const statusKey = status === 'up' ? 'up' : status === 'down' ? 'down' : status === 'paused' ? 'paused' : 'unknown';
  const shouldPulse = pulse && (status === 'up' || status === 'down' || status === 'paused');

  // Icon component based on status
  const IconComponent = status === 'up' ? CheckCircle :
    status === 'down' ? XCircle :
      status === 'paused' ? PauseCircle : null;

  return (
    <div className={`relative flex items-center justify-center ${containerSizeClasses[size]}`}>
      {/* Pulse animation ring - expands outward and fades */}
      {shouldPulse && (
        <span
          className={`absolute rounded-full ${pulseColors[statusKey]} ${sizeClasses[size]}`}
          style={{
            animation: 'status-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite'
          }}
        />
      )}

      {/* Main indicator */}
      <span
        className={`relative flex items-center justify-center rounded-full ${sizeClasses[size]} ${bgColors[statusKey]} z-10 shadow-lg`}
      >
        {showIcon && IconComponent && (
          <IconComponent
            size={iconSizes[size]}
            className="text-white"
            strokeWidth={2.5}
          />
        )}
      </span>

      {/* Add custom keyframes via style tag */}
      <style>{`
        @keyframes status-pulse {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
