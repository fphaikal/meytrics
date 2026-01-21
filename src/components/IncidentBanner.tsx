import type { Incident } from '../lib/types';

interface IncidentBannerProps {
  incidents: Incident[];
}

export function IncidentBanner({ incidents }: IncidentBannerProps) {
  if (incidents.length === 0) return null;

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 border-red-600';
      case 'major':
        return 'bg-orange-500 border-orange-600';
      default:
        return 'bg-yellow-500 border-yellow-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'investigating':
        return 'Investigating';
      case 'identified':
        return 'Identified';
      case 'monitoring':
        return 'Monitoring';
      case 'resolved':
        return 'Resolved';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-3 mb-6">
      {incidents.map((incident) => (
        <div
          key={incident.id}
          className={`rounded-lg p-4 text-white border-l-4 ${getSeverityStyles(incident.severity)}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{incident.title}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                {getStatusLabel(incident.status)}
              </span>
            </div>
            <span className="text-xs opacity-80">
              {new Date(incident.created_at).toLocaleDateString()}
            </span>
          </div>

          {incident.description && (
            <p className="text-sm opacity-90 mb-2">{incident.description}</p>
          )}

          {incident.affected_services && incident.affected_services.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <span className="opacity-70">Affected:</span>
              {incident.affected_services.map((service, idx) => (
                <span key={idx} className="bg-white/20 px-2 py-0.5 rounded">
                  {service}
                </span>
              ))}
            </div>
          )}

          {incident.updates && incident.updates.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="text-xs opacity-70 mb-1">Latest update:</div>
              <p className="text-sm">{incident.updates[0].message}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
