import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardBody,
  Chip,
  Tooltip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Divider
} from "@heroui/react";
import { ArrowLeft, ExternalLink, Pause, Play, Edit, RefreshCw, Activity, ShieldCheck, Lock, Clock, Calendar, AlertTriangle, CheckCircle, BarChart, Globe, Server, ArrowUp, ArrowDown, Award, FileCode, Link as LinkIcon } from 'lucide-react';
import { toast } from '../../lib/toast';
import { parseDate } from '../../lib/utils';
import { getServices, getServicePings, getSettings, updateService, getServiceIncidents, getServicePingSummary } from '../../lib/api';
import type { Service, Ping, ServiceIncident } from '../../lib/types';
import { StatusIndicator } from '../StatusIndicator';
import { ResponseTimeGraph } from '../ResponseTimeGraph';

import { WorldMap } from '../ui/WorldMap';

export function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const serviceId = parseInt(id || '0');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Queries
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: getServices,
    refetchInterval: 10000
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings
  });

  // Always fetch pings for 24h for the status bars
  const { data: pings = [], isLoading: pingsLoading } = useQuery({
    queryKey: ['pings', serviceId, 1],
    queryFn: () => getServicePings(serviceId, 1),
    enabled: !!serviceId,
    refetchInterval: 10000
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['service-incidents', serviceId],
    queryFn: () => getServiceIncidents(serviceId),
    enabled: !!serviceId,
    refetchInterval: 10000
  });

  const service = services.find((s: Service) => s.id === serviceId);

  const handleTogglePause = async () => {
    if (!service) return;
    try {
      await updateService(service.id, { paused: !service.paused });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(service.paused ? 'Service resumed' : 'Service paused');
    } catch (error) {
      console.error('Failed to toggle pause:', error);
      toast.error('Failed to toggle pause status');
    }
  };

  // Fetch summary stats separately based on time range
  const { data: statsData } = useQuery({
    queryKey: ['ping-summary', serviceId, timeRange],
    queryFn: () => {
      if (timeRange === '1h') return getServicePingSummary(serviceId, { hours: 1 });
      if (timeRange === '24h') return getServicePingSummary(serviceId, { hours: 24 });
      if (timeRange === '7d') return getServicePingSummary(serviceId, { days: 7 });
      return getServicePingSummary(serviceId, { days: 30 });
    },
    enabled: !!serviceId,
    refetchInterval: 30000
  });

  // Use stats from API or fallback to default
  const stats = statsData || { avg: 0, min: 0, max: 0, uptime: 0 };


  // Aggregate pings by hour for status bars
  const renderStatusBars = () => {
    const now = new Date();
    const hours: { start: Date; end: Date; upCount: number; totalCount: number }[] = [];

    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - i, 0, 0, 0);
      const hourEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - i + 1, 0, 0, 0);
      hours.push({ start: hourStart, end: hourEnd, upCount: 0, totalCount: 0 });
    }

    pings.forEach((ping: Ping) => {
      const timeStr = ping.created_at.endsWith('Z') ? ping.created_at : ping.created_at.replace(' ', 'T') + 'Z';
      const pingTime = new Date(timeStr);

      for (const hour of hours) {
        if (pingTime >= hour.start && pingTime < hour.end) {
          hour.totalCount++;
          if (ping.status === 'up') hour.upCount++;
          break;
        }
      }
    });

    const timezone = settings.timezone || 'Asia/Jakarta';

    return (
      <div className="flex gap-px items-center flex-1">
        {hours.map((hour, idx) => {
          const uptime = hour.totalCount > 0 ? (hour.upCount / hour.totalCount) * 100 : null;
          const bgColor = uptime === null ? 'bg-default-300' :
            uptime === 100 ? 'bg-emerald-500' :
              uptime >= 80 ? 'bg-yellow-500' :
                'bg-red-500';

          const timeFormat = (d: Date) => d.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timezone
          });

          return (
            <Tooltip
              key={idx}
              content={
                <div className="text-xs p-1">
                  <div className="font-medium">{timeFormat(hour.start)} - {timeFormat(hour.end)}</div>
                  <div className="text-success">Up {uptime !== null ? uptime.toFixed(0) : 0}%</div>
                  <div className="text-default-400">{hour.upCount}/{hour.totalCount} checks</div>
                </div>
              }
              placement="top"
            >
              <div className={`flex-1 h-8 rounded-sm cursor-pointer ${bgColor}`} />
            </Tooltip>
          );
        })}
      </div>
    );
  };

  const loading = servicesLoading || pingsLoading;

  if (loading) {
    return <div className="text-center py-8 text-default-500">Loading...</div>;
  }

  if (!service) {
    return (
      <div className="text-center py-8">
        <p className="text-default-500 mb-4">Service not found</p>
        <Button onPress={() => navigate('/admin')}>Back to Services</Button>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-default-500 mb-4">
        <button onClick={() => navigate('/admin')} className="hover:text-primary flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Monitoring
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <StatusIndicator status={service.paused ? 'paused' : service.current_status} size="lg" pulse />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{service.name}</h1>
              <a href={service.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-sm text-default-500">
              {service.type.toUpperCase()} monitor for {service.url}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="flat"
            onPress={handleTogglePause}
            startContent={service.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          >
            {service.paused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="flat"
            startContent={<Edit className="w-4 h-4" />}
            onPress={() => navigate(`/admin/services/${service.id}/edit`)}
          >
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="flex flex-col justify-between mb-6 col-span-4 gap-4">
          {/* Status Cards Row */}
          <div className="grid grid-cols-3 gap-4 ">
            {/* Current Status */}
            <Card shadow='md'>
              <CardBody className="py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-default-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Current {service.current_status} for
                    </p>
                    <div className={`text-2xl font-bold mt-1 capitalize ${service.current_status === 'up' ? 'text-emerald-500' : service.current_status === 'down' ? 'text-danger' : 'text-warning'}`}>
                      {(() => {
                        if (service.paused) return 'Monitoring Paused';

                        const status = service.current_status;
                        let startTimeStr: string;

                        if (status === 'down') {
                          const openIncident = incidents.find((i: ServiceIncident) => i.status === 'down' && !i.ended_at);
                          startTimeStr = openIncident ? openIncident.started_at : service.created_at;
                        } else if (status === 'up') {
                          const lastIncident = [...incidents]
                            .filter((i: ServiceIncident) => i.status === 'resolved' && i.ended_at)
                            .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())[0];
                          startTimeStr = lastIncident?.ended_at || service.created_at;
                        } else {
                          startTimeStr = service.created_at;
                        }

                        const startTime = parseDate(startTimeStr);

                        if (!startTime || isNaN(startTime.getTime())) {
                          return '00:00:00:00';
                        }

                        const diffMs = Math.max(0, now.getTime() - startTime.getTime());
                        if (isNaN(diffMs)) return '00:00:00:00';

                        const seconds = Math.floor(diffMs / 1000);
                        const minutes = Math.floor(seconds / 60);
                        const hours = Math.floor(minutes / 60);
                        const days = Math.floor(hours / 24);

                        const pad = (n: number) => n.toString().padStart(2, '0');
                        return `${pad(days)}:${pad(hours % 24)}:${pad(minutes % 60)}:${pad(seconds % 60)}`;
                      })()}
                    </div>
                  </div>
                  <Activity className="w-5 h-5 text-default-400" />
                </div>
              </CardBody>
            </Card>

            {/* Last Check */}
            <Card shadow='md' className="relative overflow-hidden">
              <CardBody className="p-4 z-10">
                <div className="flex items-center gap-2 mb-1 text-default-500">
                  <Clock className="w-4 h-4" />
                  <p className="text-sm">Last check</p>
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {pings.length > 0 ? (
                    (() => {
                      if (service.paused) return 'Paused';

                      const lastCheck = parseDate(pings[0].created_at);
                      if (!lastCheck) return 'Never';

                      const diffInSeconds = Math.floor((now.getTime() - lastCheck.getTime()) / 1000);
                      if (isNaN(diffInSeconds)) return 'Unknown';

                      if (diffInSeconds < 60) return `${Math.max(0, diffInSeconds)}s ago`;
                      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
                      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
                      return `${Math.floor(diffInSeconds / 86400)}d ago`;
                    })()
                  ) : '-'}
                </p>
                <p className="text-xs text-default-400">
                  <RefreshCw className="w-3 h-3 inline mr-1" />
                  Every {service.interval}s
                </p>
              </CardBody>
              <Clock className="absolute -bottom-4 -right-4 w-24 h-24 text-default-100 dark:text-default-50/5 z-0" />
            </Card>

            {/* Last 24 Hours */}
            <Card shadow='md'>
              <CardBody className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-default-500">
                    <Activity className="w-4 h-4" />
                    <p className="text-sm">Last 24 hours</p>
                  </div>
                  <Chip size="sm" variant="flat" color="success">{stats.uptime}%</Chip>
                </div>
                {renderStatusBars()}
              </CardBody>
            </Card>
          </div>
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <Card shadow='md' className="relative overflow-hidden">
              <CardBody className="p-4 z-10">
                <div className="flex items-center gap-2 mb-1 text-default-500">
                  <Calendar className="w-4 h-4" />
                  <p className="text-sm">Last 7 days</p>
                </div>
                <p className="text-2xl font-bold text-success">{service.uptime_percent || '--'}%</p>
              </CardBody>
              <Calendar className="absolute -bottom-2 -right-2 w-16 h-16 text-success-50 dark:text-success-900/20 z-0" />
            </Card>
            <Card shadow='md' className="relative overflow-hidden">
              <CardBody className="p-4 z-10">
                <div className="flex items-center gap-2 mb-1 text-default-500">
                  <Calendar className="w-4 h-4" />
                  <p className="text-sm">Last 30 days</p>
                </div>
                <p className="text-2xl font-bold text-success">{service.uptime_percent || '--'}%</p>
              </CardBody>
              <Calendar className="absolute -bottom-2 -right-2 w-16 h-16 text-success-50 dark:text-success-900/20 z-0" />
            </Card>
            <Card shadow='md' className="relative overflow-hidden">
              <CardBody className="p-4 z-10">
                <div className="flex items-center gap-2 mb-1 text-default-500">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm">Incidents</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{incidents.length}</p>
              </CardBody>
              <AlertTriangle className="absolute -bottom-2 -right-2 w-16 h-16 text-default-100 dark:text-default-50/5 z-0" />
            </Card>
          </div>

          {/* Response Time Chart */}
          <Card shadow='md'>
            <CardBody className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-primary" />
                  Response time
                </h3>
                <div className="flex gap-2">
                  {(['1h', '24h', '7d', '30d'] as const).map((range) => (
                    <Button
                      key={range}
                      size="sm"
                      variant={timeRange === range ? 'solid' : 'flat'}
                      color={timeRange === range ? 'primary' : 'default'}
                      onPress={() => setTimeRange(range)}
                    >
                      {range === '1h' ? 'Last hour' : range === '24h' ? 'Last 24h' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}
                    </Button>
                  ))}
                </div>
              </div>

              <ResponseTimeGraph
                serviceId={service.id}
                days={timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1}
                hours={timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : undefined}
              />


              {/* Response Time Stats */}
              {/* Response Time Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-divider">
                <div className="flex flex-col items-center justify-center p-2">
                  <div className="flex items-center gap-2 mb-1 text-default-500">
                    <Activity className="w-4 h-4" />
                    <p className="text-sm">Average</p>
                  </div>
                  <p className="text-xl font-semibold text-foreground">{stats.avg} ms</p>
                </div>
                <div className="flex flex-col items-center justify-center p-2">
                  <div className="flex items-center gap-2 mb-1 text-success">
                    <ArrowDown className="w-4 h-4" />
                    <p className="text-sm">Minimum</p>
                  </div>
                  <p className="text-xl font-semibold text-success">{stats.min} ms</p>
                </div>
                <div className="flex flex-col items-center justify-center p-2">
                  <div className="flex items-center gap-2 mb-1 text-default-500">
                    <ArrowUp className="w-4 h-4" />
                    <p className="text-sm">Maximum</p>
                  </div>
                  <p className="text-xl font-semibold text-foreground">{stats.max} ms</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Latest Incidents */}
          <Card shadow='md'>
            <CardBody className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Latest incidents
                </h3>
                <Chip size="sm" variant="flat">{incidents.length} total</Chip>
              </div>
              {incidents.length === 0 ? (
                <div className="text-center py-8 text-default-500">
                  No incidents recorded
                </div>
              ) : (
                <Table aria-label="Incidents table" removeWrapper>
                  <TableHeader>
                    <TableColumn>STATUS</TableColumn>
                    <TableColumn>ERROR</TableColumn>
                    <TableColumn>STARTED</TableColumn>
                    <TableColumn>DURATION</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {incidents.map((incident: ServiceIncident) => {
                      const timezone = settings.timezone || 'Asia/Jakarta';
                      const startTime = new Date(incident.started_at);
                      const formatDuration = (seconds: number | null) => {
                        if (!seconds) return 'Ongoing';
                        if (seconds < 60) return `${seconds}s`;
                        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
                        const hours = Math.floor(seconds / 3600);
                        const mins = Math.floor((seconds % 3600) / 60);
                        return `${hours}h ${mins}m`;
                      };

                      return (
                        <TableRow key={incident.id}>
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
                            <span className="text-sm">
                              {startTime.toLocaleString('id-ID', { timeZone: timezone })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-medium ${incident.status === 'down' ? 'text-danger' : 'text-foreground'}`}>
                              {formatDuration(incident.duration_seconds)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Domain & Region Info */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Domain & SSL */}
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Domain & SSL.</h3>
              </div>

              <div className="space-y-6">
                {/* Domain Expiry - Placeholder for now until WHOIS implementation */}
                <div>
                  <p className="text-sm text-default-500 mb-1">Domain valid until</p>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-500" />
                    {/* Fallback to SSL date or generic future date if domain check not implemented yet */}
                    <span className="text-lg font-semibold text-foreground">
                      {service.domain_expiry ? new Date(service.domain_expiry).toLocaleDateString('en-GB') : '-'}
                    </span>
                    {service.domain_expiry && (
                      <Chip size="sm" color="success" variant="flat">
                        {Math.ceil((new Date(service.domain_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                      </Chip>
                    )}
                    {!service.domain_expiry && <span className="text-xs text-default-400">(Not monitored)</span>}
                  </div>
                </div>

                <Divider />

                <div>
                  <p className="text-sm text-default-500 mb-1">SSL certificate valid until</p>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${service.ssl_expiry ? 'text-emerald-500' : 'text-default-300'}`} />
                    <span className="text-lg font-semibold text-foreground">
                      {service.ssl_expiry ? new Date(service.ssl_expiry).toLocaleDateString('en-GB') : '-'}
                    </span>
                    {service.ssl_expiry && (
                      <Chip size="sm" color={
                        Math.ceil((new Date(service.ssl_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) > 30 ? "success" : "warning"
                      } variant="flat">
                        {Math.ceil((new Date(service.ssl_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                      </Chip>
                    )}
                    {!service.ssl_expiry && <span className="text-xs text-default-400">(No SSL data)</span>}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>



          {/* Regions */}
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Server className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Server Location.</h3>
              </div>

              <div className="relative h-48 w-full bg-[#1e293b] rounded-lg overflow-hidden flex items-center justify-center">
                <WorldMap
                  markers={
                    service.server_lat && service.server_lon
                      ? [{ name: service.server_city || 'Server', coordinates: [service.server_lon, service.server_lat] }]
                      : []
                  }
                />
              </div>

              <div className="mt-4">
                <h4 className="text-lg font-bold">
                  {service.server_city ? `${service.server_city}, ${service.server_country}` : (service.region || 'Unknown Location')}
                </h4>
                <p className="text-sm text-default-500">
                  {service.server_lat ? `Lat: ${service.server_lat}, Lon: ${service.server_lon}` : 'Location detection pending...'}
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Status Badges */}
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-warning" />
                <h3 className="text-lg font-bold text-foreground">Status Badges.</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Status Badge</p>
                  <div className="flex items-center justify-between gap-3 p-3 bg-default-100 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto flex-1 pb-1 -mb-1">
                      <img src={`/api/badges/${service.id}/status.svg`} alt="Service Status" className="h-5 max-w-none" />
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Tooltip content="Copy Markdown">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          onPress={() => {
                            const url = `${window.location.origin}/api/badges/${service.id}/status.svg`;
                            navigator.clipboard.writeText(`[![${service.name} Status](${url})](${window.location.origin}/status/${service.id})`);
                            toast.success('Markdown copied');
                          }}
                        >
                          <FileCode className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Copy URL">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          onPress={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/badges/${service.id}/status.svg`);
                            toast.success('URL copied');
                          }}
                        >
                          <LinkIcon className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Uptime Badge (30 Days)</p>
                  <div className="flex items-center justify-between gap-3 p-3 bg-default-100 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto flex-1 pb-1 -mb-1">
                      <img src={`/api/badges/${service.id}/uptime.svg?days=30`} alt="Service Uptime" className="h-5 max-w-none" />
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Tooltip content="Copy Markdown">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          onPress={() => {
                            const url = `${window.location.origin}/api/badges/${service.id}/uptime.svg?days=30`;
                            navigator.clipboard.writeText(`[![${service.name} Uptime](${url})](${window.location.origin}/status/${service.id})`);
                            toast.success('Markdown copied');
                          }}
                        >
                          <FileCode className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Copy URL">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          onPress={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/badges/${service.id}/uptime.svg?days=30`);
                            toast.success('URL copied');
                          }}
                        >
                          <LinkIcon className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

      </div>
    </div >
  );
}
