import { useQuery } from '@tanstack/react-query';
import { getGlobalServiceIncidents, getSettings } from '../../lib/api';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip
} from "@heroui/react";
import type { ServiceIncident } from '../../lib/types';
import { Link, useNavigate } from 'react-router-dom';

// Extend ServiceIncident to include service_name join result
interface ExtendedServiceIncident extends ServiceIncident {
  service_name: string;
}

export function IncidentsPage() {
  const navigate = useNavigate();
  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ['global-incidents'],
    queryFn: getGlobalServiceIncidents,
    refetchInterval: 30000
  });

  // Cast the data to ExtendedServiceIncident[] as the API returns joined data
  const incidentsList = incidents as ExtendedServiceIncident[];

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Ongoing';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const timezone = settings.timezone || 'Asia/Jakarta';

  // Count stats
  const ongoingCount = incidentsList.filter(i => i.status === 'down').length;
  const resolvedCount = incidentsList.filter(i => i.status === 'resolved').length;

  if (incidentsLoading) {
    return <div className="p-6 text-center text-default-500">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Incidents.</h1>
          <p className="text-default-500 text-sm">History of all service downtimes detected by the monitoring system.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger"></span>
            <span className="text-default-500">{ongoingCount} Ongoing</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            <span className="text-default-500">{resolvedCount} Resolved</span>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      {incidentsList.length === 0 ? (
        <div className="bg-content1 rounded-xl p-8 text-center">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-default-500">No incidents recorded yet.</p>
          <p className="text-sm text-default-400">All systems operational!</p>
        </div>
      ) : (
        <Table
          aria-label="Incidents table"
          classNames={{
            wrapper: "bg-background rounded-xl border border-divider",
            th: "bg-default-100 text-default-600 font-semibold",
            td: "py-3",
            tr: "hover:bg-content1 transition-colors"
          }}
        >
          <TableHeader>
            <TableColumn>SERVICE</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ERROR</TableColumn>
            <TableColumn>STARTED</TableColumn>
            <TableColumn>DURATION</TableColumn>
          </TableHeader>
          <TableBody>
            {incidentsList.map((incident: ExtendedServiceIncident) => (
              <TableRow
                key={incident.id}
                className="cursor-pointer"
                onClick={() => navigate(`/admin/incidents/${incident.id}`)}
              >
                <TableCell>
                  <Link
                    to={`/admin/services/${incident.service_id}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {incident.service_name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    color={incident.status === 'down' ? 'danger' : 'success'}
                    variant="flat"
                  >
                    {incident.status === 'down' ? 'Ongoing' : 'Resolved'}
                  </Chip>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-danger">{incident.error_message || '-'}</span>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-default-600">
                    {new Date(incident.started_at).toLocaleString('id-ID', { timeZone: timezone })}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`text-sm font-medium ${incident.status === 'down' ? 'text-danger' : 'text-default-600'}`}>
                    {formatDuration(incident.duration_seconds)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
