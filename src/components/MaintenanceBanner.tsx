import type { Maintenance } from '../lib/types';

interface MaintenanceBannerProps {
  maintenances: Maintenance[];
}

export function MaintenanceBanner({ maintenances }: MaintenanceBannerProps) {
  if (maintenances.length === 0) return null;

  const now = new Date();

  const getMaintenanceStatus = (maintenance: Maintenance) => {
    const start = new Date(maintenance.start_time);
    const end = new Date(maintenance.end_time);

    if (now >= start && now <= end) {
      return 'in-progress';
    }
    return 'scheduled';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-3 mb-6">
      {maintenances.map((maintenance) => {
        const status = getMaintenanceStatus(maintenance);
        const isInProgress = status === 'in-progress';

        return (
          <div
            key={maintenance.id}
            className={`rounded-lg p-4 border-l-4 ${isInProgress
                ? 'bg-blue-500 border-blue-600 text-white'
                : 'bg-blue-50 border-blue-400 text-blue-800'
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-semibold">{maintenance.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${isInProgress ? 'bg-white/20' : 'bg-blue-200'
                  }`}>
                  {isInProgress ? 'In Progress' : 'Scheduled'}
                </span>
              </div>
            </div>

            <div className="text-sm mb-2">
              <span className="opacity-80">
                {formatDate(maintenance.start_time)} → {formatDate(maintenance.end_time)}
              </span>
            </div>

            {maintenance.description && (
              <p className={`text-sm ${isInProgress ? 'opacity-90' : 'opacity-80'}`}>
                {maintenance.description}
              </p>
            )}

            {maintenance.affected_services && maintenance.affected_services.length > 0 && (
              <div className="flex items-center gap-1 text-xs mt-2">
                <span className="opacity-70">Affected:</span>
                {maintenance.affected_services.map((service, idx) => (
                  <span key={idx} className={`px-2 py-0.5 rounded ${isInProgress ? 'bg-white/20' : 'bg-blue-200'
                    }`}>
                    {service}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
