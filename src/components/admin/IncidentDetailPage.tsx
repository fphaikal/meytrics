import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getServiceIncidentById, getServices, getSettings } from '../../lib/api';
import { Chip, Button, Card, CardBody, Spinner, Tabs, Tab } from "@heroui/react";
import { ArrowLeft, ExternalLink, AlertTriangle, CheckCircle, Copy, Link as LinkIcon } from 'lucide-react';
import type { ServiceIncident, Service } from '../../lib/types';

interface ExtendedServiceIncident extends ServiceIncident {
  service_name?: string;
  service_url?: string;
  service_type?: string;
}

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [requestTab, setRequestTab] = useState<string>('url');
  const [responseTab, setResponseTab] = useState<string>('body');

  const { data: incident, isLoading: incidentLoading, error } = useQuery<ExtendedServiceIncident>({
    queryKey: ['incident', id],
    queryFn: () => getServiceIncidentById(parseInt(id!)),
    enabled: !!id
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: getServices
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings
  });

  const timezone = settings.timezone || 'Asia/Jakarta';

  // Find service details
  const service = services.find(s => s.id === incident?.service_id);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Ongoing';
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins} minute${mins > 1 ? 's' : ''} ${secs > 0 ? `${secs}s` : ''}`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins > 0 ? ` ${mins} minute${mins > 1 ? 's' : ''}` : ''}`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr + 'Z');
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Extract status code from error message
  const extractStatusCode = (errorMessage: string | null) => {
    if (!errorMessage) return null;
    const match = errorMessage.match(/status:?\s*(\d{3})/i) || errorMessage.match(/(\d{3})/);
    return match ? match[1] : null;
  };

  if (incidentLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="text-center py-12">
        <p className="text-default-500">Incident not found</p>
        <Button className="mt-4" onPress={() => navigate('/admin/incidents')}>
          Back to Incidents
        </Button>
      </div>
    );
  }

  const statusCode = extractStatusCode(incident.error_message);
  const serviceName = incident.service_name || service?.name || 'Unknown Service';
  const serviceUrl = incident.service_url || service?.url || '';
  const serviceType = incident.service_type || service?.type || 'http';
  const httpMethod = serviceType === 'http' ? 'HEAD' : 'GET';

  return (
    <div className="mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-default-500 mb-4">
        <button onClick={() => navigate('/admin/incidents')} className="hover:text-primary flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Incidents
        </button>
        <span>/</span>
        <span className="text-foreground">{serviceName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${incident.status === 'down' ? 'bg-danger/10' : 'bg-success/10'
          }`}>
          {incident.status === 'down' ? (
            <AlertTriangle className="w-6 h-6 text-danger" />
          ) : (
            <CheckCircle className="w-6 h-6 text-success" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{serviceName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Chip
              size="sm"
              color={incident.status === 'down' ? 'danger' : 'success'}
              variant="flat"
            >
              {incident.status === 'down' ? 'Ongoing' : 'Resolved'}
            </Chip>
            <span className="text-sm text-default-500">
              {new Date(incident.started_at + 'Z').toLocaleString('id-ID', {
                timeZone: timezone,
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="flat"
          startContent={<ExternalLink className="w-4 h-4" />}
          onPress={() => navigate(`/admin/services/${incident.service_id}`)}
        >
          Monitor
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="flex gap-6">
        {/* Left Column - Main Content */}
        <div className="flex-1">
          {/* Status Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardBody className="p-4">
                <p className="text-sm text-default-500 mb-1">Cause</p>
                <p className="text-lg font-semibold text-foreground">
                  {statusCode ? `Status ${statusCode}` : 'Connection Error'}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4">
                <p className="text-sm text-default-500 mb-1">Started at</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatTimeAgo(incident.started_at)}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4">
                <p className="text-sm text-default-500 mb-1">Length</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatDuration(incident.duration_seconds)}
                </p>
              </CardBody>
            </Card>
          </div>

          {/* Error Message */}
          {incident.error_message && (
            <Card className="mb-6">
              <CardBody className="p-4">
                <div className="flex items-center gap-2 text-danger mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Error Details</span>
                </div>
                <p className="text-sm text-default-600 bg-danger/5 p-3 rounded-lg font-mono">
                  {incident.error_message}
                </p>
              </CardBody>
            </Card>
          )}

          {/* Metadata */}
          <Card className="mb-6">
            <CardBody className="p-4">
              <p className="text-sm text-default-500 mb-3">Metadata</p>
              <div className="space-y-2">
                {statusCode && (
                  <div className="flex items-center justify-between py-2 border-b border-divider">
                    <span className="text-sm text-default-600">Response code</span>
                    <span className="text-sm font-medium text-foreground">{statusCode}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-divider">
                  <span className="text-sm text-default-600">Service ID</span>
                  <span className="text-sm font-medium text-foreground">{incident.service_id}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-divider">
                  <span className="text-sm text-default-600">Incident ID</span>
                  <span className="text-sm font-medium text-foreground">{incident.id}</span>
                </div>
                {incident.ended_at && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-default-600">Resolved at</span>
                    <span className="text-sm font-medium text-foreground">
                      {new Date(incident.ended_at + 'Z').toLocaleString('id-ID', { timeZone: timezone })}
                    </span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Timeline */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Timeline</h2>
            <div className="space-y-4">
              {/* Resolved Event */}
              {incident.status === 'resolved' && incident.ended_at && (
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center mt-0.5">
                    <CheckCircle className="w-4 h-4 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">Incident resolved automatically.</p>
                  </div>
                  <span className="text-xs text-default-500">
                    {new Date(incident.ended_at + 'Z').toLocaleString('id-ID', {
                      timeZone: timezone,
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}

              {/* Started Event */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-danger/10 flex items-center justify-center mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">Incident started.</p>
                  {incident.error_message && (
                    <p className="text-xs text-default-500 mt-0.5">{incident.error_message}</p>
                  )}
                </div>
                <span className="text-xs text-default-500">
                  {new Date(incident.started_at + 'Z').toLocaleString('id-ID', {
                    timeZone: timezone,
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-8">
            <Button
              variant="flat"
              onPress={() => navigate('/admin/incidents')}
            >
              Back to Incidents
            </Button>
            <Button
              color="primary"
              startContent={<LinkIcon className="w-4 h-4" />}
              onPress={() => navigate(`/admin/services/${incident.service_id}`)}
            >
              View Service
            </Button>
          </div>
        </div>

        {/* Right Column - Request/Response Panel */}
        <div className="w-96 shrink-0 space-y-4">
          {/* Request Card */}
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Request.</h3>
                <Tabs
                  size="sm"
                  selectedKey={requestTab}
                  onSelectionChange={(key) => setRequestTab(key as string)}
                  classNames={{
                    tabList: "bg-default-100",
                    cursor: "bg-background"
                  }}
                >
                  <Tab key="url" title="URL" />
                  <Tab key="headers" title="Headers" />
                </Tabs>
              </div>

              {requestTab === 'url' ? (
                <div className="bg-default-100 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">{httpMethod}</span>
                  <code className="text-sm text-foreground flex-1 break-all">{serviceUrl || 'N/A'}</code>
                  {serviceUrl && (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => copyToClipboard(serviceUrl)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-default-100 rounded-lg p-3">
                  <code className="text-sm text-default-500">&lt;empty&gt;</code>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Response Card */}
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Response.</h3>
                <Tabs
                  size="sm"
                  selectedKey={responseTab}
                  onSelectionChange={(key) => setResponseTab(key as string)}
                  classNames={{
                    tabList: "bg-default-100",
                    cursor: "bg-background"
                  }}
                >
                  <Tab key="body" title="Body" />
                  <Tab key="headers" title="Headers" />
                </Tabs>
              </div>

              {responseTab === 'body' ? (
                <div className="bg-default-100 rounded-lg p-3 min-h-20">
                  {statusCode ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-danger">HTTP {statusCode}</span>
                      </div>
                      <code className="text-sm text-default-500 block">
                        {incident.error_message || '<empty>'}
                      </code>
                    </div>
                  ) : (
                    <code className="text-sm text-default-500">&lt;empty&gt;</code>
                  )}
                </div>
              ) : (
                <div className="bg-default-100 rounded-lg p-3 min-h-20">
                  {statusCode ? (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-default-500">Status</span>
                        <span className="text-foreground font-mono">{statusCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-default-500">Content-Type</span>
                        <span className="text-foreground font-mono">text/html</span>
                      </div>
                    </div>
                  ) : (
                    <code className="text-sm text-default-500">&lt;empty&gt;</code>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
