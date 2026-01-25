import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Checkbox,
  Card,
  CardBody,
  Slider,
  Chip,
  Switch
} from "@heroui/react";
import { SplitSection } from '../ui/SplitSection';
import { ArrowLeft, Plus, Settings, Activity, Shield, Clock, FileCode, Tag, Trash2, Globe, Search, Network, Wifi, Database, TriangleAlert } from 'lucide-react';
import { toast } from '../../lib/toast';
import { getCategories, createService, getTags, bulkUpdateTags, getWebhooks, getSettings } from '../../lib/api';
import type { ServiceUpdate, Category } from '../../lib/types';

const ThresholdInput = ({ value, onChange, isDisabled }: { value: string, onChange: (v: string) => void, isDisabled: boolean }) => {
  const [inputValue, setInputValue] = useState('');

  const values = value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newVal = inputValue.trim();
      if (newVal && !values.includes(newVal) && /^\d+$/.test(newVal)) {
        onChange([...values, newVal].join(', '));
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      onChange(values.slice(0, -1).join(', '));
    }
  };

  const removeValue = (valToRemove: string) => {
    onChange(values.filter(v => v !== valToRemove).join(', '));
  };

  return (
    <div className={`flex flex-col gap-1.5`}>
      <label className="text-small font-medium text-foreground">Check Thresholds (Days)</label>
      <div
        className={`flex flex-wrap gap-2 p-2 min-h-10 items-center rounded-medium bg-default-100 hover:bg-default-200 transition-colors cursor-text group ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={(e) => {
          // Focus input when clicking on container
          const input = e.currentTarget.querySelector('input');
          input?.focus();
        }}
      >
        {values.map((v, i) => (
          <Chip key={i} onClose={() => removeValue(v)} size="sm" variant="flat">
            {v} days
          </Chip>
        ))}
        <input
          type="text"
          className="bg-transparent outline-none flex-1 min-w-15 text-small placeholder:text-default-400"
          placeholder={values.length === 0 ? "e.g. 7" : ""}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
        />
      </div>
      <p className="text-tiny text-default-400">Type a number and press Enter to add. Multiple thresholds supported.</p>
    </div>
  );
};

export function AddServicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ServiceUpdate>({
    name: '',
    url: '',
    type: 'http',
    interval: 60,
    category_id: null,
    notify_down: true,
    // Advanced settings
    timeout: 30,
    slow_threshold: undefined,
    http_method: 'GET',
    custom_headers: {},
    follow_redirects: true,
    auth_type: 'none',
    auth_user: '',
    auth_pass: '',
    notification_repeat: 0,
    notification_delay: 0,
    notify_ssl_expiry: false,
    notify_domain_expiry: false,
    ssl_expiry_threshold: '7',
    domain_expiry_threshold: '14'
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });

  // Fetch all tags
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags
  });

  // Fetch webhooks and settings to check for available integrations
  const { data: webhooks = [] } = useQuery({
    queryKey: ['webhooks'],
    queryFn: getWebhooks
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings
  });

  const hasIntegrations = (webhooks && webhooks.length > 0) || (settings && settings.smtp_host);

  // State for custom headers editor
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);
  // State for selected tag IDs
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const createMutation = useMutation({
    mutationFn: async (data: ServiceUpdate) => {
      const response = await createService(data);
      if (selectedTagIds.length > 0 && response && response.id) {
        await bulkUpdateTags([response.id], selectedTagIds, 'add');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service created successfully');
      navigate('/admin');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create service');
    }
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Convert headers array to object for API
    const headersObject: Record<string, string> = {};
    headers.forEach(h => {
      if (h.key.trim()) {
        headersObject[h.key.trim()] = h.value;
      }
    });

    // Create service with custom_headers
    await createMutation.mutateAsync({
      ...formData,
      custom_headers: headersObject
    });
  };

  // Header management functions
  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const removeHeader = (index: number) => setHeaders(headers.filter((_, i) => i !== index));
  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  // Tag toggle function
  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-default-500 mb-4">
        <button onClick={() => navigate('/admin')} className="hover:text-primary flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Monitoring
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Add New Service</h1>
        <div className="flex items-center gap-3">
          <Button
            color="primary"
            type="submit"
            form="service-form"
            isLoading={createMutation.isPending}
            startContent={<Plus className="w-4 h-4" />}
          >
            Create Service
          </Button>
        </div>
      </div>

      <form id="service-form" onSubmit={handleSubmit} className="space-y-8 pb-10">
        {/* Basic Information */}
        <SplitSection
          title="Basic Information"
          description="Configure the primary details of your monitor including URL and check interval."
          icon={<Settings className="w-5 h-5 text-primary" />}
        >
          <Card>
            <CardBody className="gap-5 p-5">
              <div className="space-y-1">
                <Select
                  label="Monitor Type"
                  labelPlacement="outside"
                  selectedKeys={['postgres', 'mysql', 'mongodb', 'redis'].includes(formData.type as string) ? ['database'] : [formData.type as string]}
                  disallowEmptySelection={true}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'database') {
                      setFormData({ ...formData, type: 'postgres' }); // Default to postgres
                    } else if (val) {
                      setFormData({ ...formData, type: val as any });
                    }
                  }}
                >
                  <SelectItem key="http" startContent={<Globe className="w-4 h-4" />}>HTTP(S)</SelectItem>
                  <SelectItem key="keyword" startContent={<Search className="w-4 h-4" />}>Keyword</SelectItem>
                  <SelectItem key="dns" startContent={<Network className="w-4 h-4" />}>DNS</SelectItem>
                  <SelectItem key="tcp" startContent={<Wifi className="w-4 h-4" />}>TCP Port</SelectItem>
                  <SelectItem key="ping" startContent={<Activity className="w-4 h-4" />}>Ping</SelectItem>
                  <SelectItem key="database" startContent={<Database className="w-4 h-4" />}>Database</SelectItem>
                </Select>
                <p className="text-xs text-default-400">How to check this service</p>
              </div>

              {/* Database Engine Selection */}
              {['postgres', 'mysql', 'mongodb', 'redis'].includes(formData.type as string) && (
                <div className="space-y-1">
                  <Select
                    label="Database Engine"
                    labelPlacement="outside"
                    selectedKeys={[formData.type as string]}
                    disallowEmptySelection={true}
                    onChange={(e) => {
                      if (e.target.value) setFormData({ ...formData, type: e.target.value as any })
                    }}
                    startContent={<Database className="w-4 h-4" />}
                  >
                    <SelectItem key="postgres" startContent={
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Z" />
                        <path d="M12 12a3 3 0 1 0 3-3" />
                      </svg>
                    }>PostgreSQL</SelectItem>
                    <SelectItem key="mysql" startContent={
                      <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    }>MySQL / MariaDB</SelectItem>
                    <SelectItem key="mongodb" startContent={
                      <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                      </svg>
                    }>MongoDB</SelectItem>
                    <SelectItem key="redis" startContent={
                      <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16v16H4z" />
                        <path d="M4 8h16" />
                        <path d="M4 12h16" />
                        <path d="M4 16h16" />
                      </svg>
                    }>Redis</SelectItem>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Service Name"
                  labelPlacement="outside"
                  value={formData.name}
                  onValueChange={(value) => setFormData({ ...formData, name: value })}
                  placeholder="e.g. Production API"
                  isRequired
                  description="A friendly name to identify this service"
                />
                <div className="space-y-1">
                  <Select
                    label="Category"
                    labelPlacement="outside"
                    selectedKeys={formData.category_id ? [formData.category_id.toString()] : ["no_category"]}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value === "no_category" ? null : parseInt(e.target.value) })}
                  >
                    {[
                      <SelectItem key="no_category">No category</SelectItem>,
                      ...categories.map((cat: Category) => (
                        <SelectItem key={cat.id.toString()}>{cat.name}</SelectItem>
                      ))
                    ]}
                  </Select>
                  <p className="text-xs text-default-400">Group related services together</p>
                </div>
              </div>

              {!['postgres', 'mysql', 'mongodb', 'redis'].includes(formData.type as string) && (
                <Input
                  label="URL"
                  labelPlacement="outside"
                  value={formData.url}
                  onValueChange={(value) => setFormData({ ...formData, url: value })}
                  placeholder="https://api.example.com/health"
                  isRequired
                  description="The endpoint to monitor"
                />
              )}



              {/* Keyword Fields */}
              {formData.type === 'keyword' && (
                <div className="">
                  <h3 className="text-sm font-medium mb-10">Keyword Configuration</h3>
                  <Input
                    label="Keyword to Match"
                    labelPlacement="outside"
                    placeholder="e.g. System Normal"
                    value={formData.keyword || ''}
                    onValueChange={(value) => setFormData({ ...formData, keyword: value })}
                    description="The string to search for in the response body"
                    isRequired
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-start">
                    <Select
                      label="Condition"
                      labelPlacement="outside"
                      selectedKeys={[formData.keyword_condition || 'exists']}
                      onChange={(e) => setFormData({ ...formData, keyword_condition: e.target.value as 'exists' | 'not_exists' })}
                    >
                      <SelectItem key="exists">Start incident when keyword MISSING</SelectItem>
                      <SelectItem key="not_exists">Start incident when keyword EXISTS</SelectItem>
                    </Select>

                    <div className="flex items-center justify-between p-3 bg-white dark:bg-default-100 rounded-lg border border-default-200">
                      <div className="flex flex-col">
                        <span className="text-sm">Case-sensitive check</span>
                        <span className="text-xs text-default-400">Match exact casing</span>
                      </div>
                      <Switch
                        isSelected={formData.keyword_case_sensitive}
                        onValueChange={(isSelected) => setFormData({ ...formData, keyword_case_sensitive: isSelected })}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DNS Fields */}
              {formData.type === 'dns' && (
                <div className="">
                  <h3 className="text-sm font-medium mb-4">DNS Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <Select
                      label="Record Type"
                      labelPlacement="outside"
                      selectedKeys={[formData.dns_record_type || 'A']}
                      onChange={(e) => setFormData({ ...formData, dns_record_type: e.target.value || 'A' })}
                    >
                      <SelectItem key="A">A (IPv4)</SelectItem>
                      <SelectItem key="AAAA">AAAA (IPv6)</SelectItem>
                      <SelectItem key="CNAME">CNAME</SelectItem>
                      <SelectItem key="MX">MX</SelectItem>
                      <SelectItem key="TXT">TXT</SelectItem>
                      <SelectItem key="NS">NS</SelectItem>
                    </Select>

                    <Input
                      label="Expected Value (Optional)"
                      labelPlacement="outside"
                      placeholder="e.g. 1.2.3.4"
                      value={formData.dns_expected_value || ''}
                      onValueChange={(value) => setFormData({ ...formData, dns_expected_value: value })}
                      description="If set, the monitor will fail if the resolved record value doesn't contain this text."
                    />
                  </div>
                </div>
              )}

              {/* Database Fields */}
              {['postgres', 'mysql', 'mongodb', 'redis'].includes(formData.type as string) && (
                <div className="space-y-8">
                  <h3 className="text-sm font-medium">Database Configuration</h3>
                  <Input
                    label="Connection String"
                    labelPlacement="outside"
                    placeholder={
                      formData.type === 'postgres' ? 'postgres://user:pass@host:5432/db' :
                        formData.type === 'mysql' ? 'mysql://user:pass@host:3306/db' :
                          formData.type === 'mongodb' ? 'mongodb://user:pass@host:27017/db' :
                            'redis://:pass@host:6379'
                    }
                    value={formData.db_connection_string || ''}
                    onValueChange={(value) => setFormData({ ...formData, db_connection_string: value, url: value })}
                    description="Full connection URI including credentials"
                    isRequired
                  />
                  {formData.type !== 'mongodb' && formData.type !== 'redis' && (
                    <Input
                      label="Health Check Query (Optional)"
                      labelPlacement="outside"
                      placeholder="SELECT 1"
                      value={formData.db_query || ''}
                      onValueChange={(value) => setFormData({ ...formData, db_query: value })}
                      description="Custom SQL query to verify database health"
                    />
                  )}
                </div>
              )}

              <div className="space-y-4">
                <label className="text-sm font-medium ">Check Interval</label>
                <Slider
                  step={60}
                  minValue={60}
                  maxValue={3600}
                  value={formData.interval || 60}
                  onChange={(value) => setFormData({ ...formData, interval: value as number })}
                  className="w-full mt-2"
                  showSteps={false}
                  marks={[
                    { value: 60, label: '1m' },
                    { value: 300, label: '5m' },
                    { value: 900, label: '15m' },
                    { value: 1800, label: '30m' },
                    { value: 3600, label: '1h' },
                  ]}
                />
                <p className="text-xs text-default-400">Current: {Math.floor((formData.interval || 60) / 60)} minutes</p>
              </div>

              <div className="mt-6 border-t pt-6 border-divider">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">Notification Settings</p>
                    <p className="text-xs text-default-400">Configure when and how to send alerts</p>
                  </div>
                  <Switch
                    isSelected={formData.notify_down}
                    onValueChange={(isSelected) => setFormData({ ...formData, notify_down: isSelected })}
                    color="primary"
                    size="sm"
                    isDisabled={!hasIntegrations}
                  />
                </div>

                {!hasIntegrations && (
                  <div className="mb-6 p-4 bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-900/20 rounded-lg flex items-start gap-3">
                    <TriangleAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div className="text-sm text-warning-800 dark:text-warning-300">
                      <p className="font-semibold mb-1">No Integrations Configured</p>
                      <p>You need to set up at least one integration (Webhook or SMTP) to enable notifications. <span className="underline cursor-pointer hover:text-warning-900 dark:hover:text-warning-200" onClick={() => navigate('/admin/integrations')}>Go to Integrations</span></p>
                    </div>
                  </div>
                )}

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 transition-opacity ${(!formData.notify_down || !hasIntegrations) ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="space-y-1">
                    <Select
                      label="Repeat notification"
                      labelPlacement="outside"
                      isDisabled={!formData.notify_down || !hasIntegrations}
                      selectedKeys={formData.notification_repeat !== undefined ? [formData.notification_repeat.toString()] : ["0"]}
                      onChange={(e) => setFormData({ ...formData, notification_repeat: parseInt(e.target.value) })}
                    >
                      <SelectItem key="0">Don't repeat</SelectItem>
                      <SelectItem key="60">Every 1 minute</SelectItem>
                      <SelectItem key="300">Every 5 minutes</SelectItem>
                      <SelectItem key="600">Every 10 minutes</SelectItem>
                      <SelectItem key="900">Every 15 minutes</SelectItem>
                      <SelectItem key="1800">Every 30 minutes</SelectItem>
                      <SelectItem key="3600">Every 1 hour</SelectItem>
                    </Select>
                    <p className="text-xs text-default-400">Resend alerts if service remains down</p>
                  </div>

                  <div className="space-y-1">
                    <Select
                      label="Delay notification"
                      labelPlacement="outside"
                      isDisabled={!formData.notify_down || !hasIntegrations}
                      selectedKeys={formData.notification_delay !== undefined ? [formData.notification_delay.toString()] : ["0"]}
                      onChange={(e) => setFormData({ ...formData, notification_delay: parseInt(e.target.value) })}
                    >
                      <SelectItem key="0">Don't delay</SelectItem>
                      <SelectItem key="60">Wait 1 minute</SelectItem>
                      <SelectItem key="120">Wait 2 minutes</SelectItem>
                      <SelectItem key="300">Wait 5 minutes</SelectItem>
                      <SelectItem key="600">Wait 10 minutes</SelectItem>
                    </Select>
                    <p className="text-xs text-default-400">Wait before sending first alert</p>
                  </div>
                </div>
              </div>

              {/* Expiry Notifications (SSL & Domain) - Only for HTTP */}
              {formData.type === 'http' && (
                <div className={`mt-6 pt-6 border-t border-divider transition-opacity ${(!formData.notify_down || !hasIntegrations) ? 'opacity-50 pointer-events-none' : ''}`}>
                  <p className="text-sm font-medium mb-4">Expiry Notifications</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* SSL Expiry */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">SSL Certificate Expiry</span>
                        <Switch
                          isSelected={formData.notify_ssl_expiry}
                          onValueChange={(isSelected) => setFormData({ ...formData, notify_ssl_expiry: isSelected })}
                          isDisabled={!formData.notify_down || !hasIntegrations}
                          size="sm"
                        />
                      </div>
                      {formData.notify_ssl_expiry && (
                        <ThresholdInput
                          value={formData.ssl_expiry_threshold?.toString() || '7'}
                          onChange={(v) => setFormData({ ...formData, ssl_expiry_threshold: v })}
                          isDisabled={!formData.notify_down || !hasIntegrations}
                        />
                      )}
                    </div>

                    {/* Domain Expiry */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Domain Name Expiry</span>
                        <Switch
                          isSelected={formData.notify_domain_expiry}
                          onValueChange={(isSelected) => setFormData({ ...formData, notify_domain_expiry: isSelected })}
                          isDisabled={!formData.notify_down || !hasIntegrations}
                          size="sm"
                        />
                      </div>
                      {formData.notify_domain_expiry && (
                        <ThresholdInput
                          value={formData.domain_expiry_threshold?.toString() || '14'}
                          onChange={(v) => setFormData({ ...formData, domain_expiry_threshold: v })}
                          isDisabled={!formData.notify_down || !hasIntegrations}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}            </CardBody>
          </Card>
        </SplitSection>

        {/* Request Settings */}
        <SplitSection
          title="Request Settings"
          description="Configure how the monitor makes requests to your service."
          icon={<Activity className="w-5 h-5 text-warning" />}
        >
          <Card>
            <CardBody className="gap-5 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <Select
                    label="HTTP Method"
                    labelPlacement="outside"
                    selectedKeys={formData.http_method ? [formData.http_method] : ['GET']}
                    onChange={(e) => setFormData({ ...formData, http_method: e.target.value as ServiceUpdate['http_method'] })}
                  >
                    <SelectItem key="GET">GET</SelectItem>
                    <SelectItem key="HEAD">HEAD</SelectItem>
                    <SelectItem key="POST">POST</SelectItem>
                    <SelectItem key="PUT">PUT</SelectItem>
                    <SelectItem key="PATCH">PATCH</SelectItem>
                    <SelectItem key="DELETE">DELETE</SelectItem>
                    <SelectItem key="OPTIONS">OPTIONS</SelectItem>
                  </Select>
                  <p className="text-xs text-default-400">Request method to use</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm">Request Timeout</label>
                  <Slider
                    step={1}
                    minValue={1}
                    maxValue={60}
                    value={formData.timeout || 30}
                    onChange={(value) => setFormData({ ...formData, timeout: value as number })}
                    className="max-w-md"
                    showSteps={false}
                    marks={[
                      { value: 1, label: '1s' },
                      { value: 30, label: '30s' },
                      { value: 60, label: '60s' },
                    ]}
                  />
                  <p className="text-xs text-default-400">Current: {formData.timeout || 30} seconds</p>
                </div>
              </div>

              <Checkbox
                isSelected={formData.follow_redirects !== false}
                onValueChange={(isSelected) => setFormData({ ...formData, follow_redirects: isSelected })}
              >
                Follow HTTP redirects (3xx responses)
              </Checkbox>
            </CardBody>
          </Card>
        </SplitSection>

        {/* Performance Monitoring */}
        <SplitSection
          title="Performance Monitoring"
          description="Set thresholds to detect slow response times and get alerted."
          icon={<Clock className="w-5 h-5 text-success" />}
        >
          <Card>
            <CardBody className="gap-5 p-5">
              <Input
                type="number"
                label="Slow Response Threshold (ms)"
                labelPlacement="outside"
                placeholder="e.g., 1000"
                value={formData.slow_threshold?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, slow_threshold: value ? parseInt(value) : undefined })}
                description="Trigger a 'slow' webhook alert when response time exceeds this value. Leave empty to disable."
              />
            </CardBody>
          </Card>
        </SplitSection>

        {/* Authentication */}
        <SplitSection
          title="Authentication"
          description="Configure authentication for accessing protected endpoints."
          icon={<Shield className="w-5 h-5 text-danger" />}
        >
          <Card>
            <CardBody className="gap-5 p-5">
              <div className="space-y-1">
                <Select
                  label="Authentication Type"
                  labelPlacement="outside"
                  selectedKeys={formData.auth_type ? [formData.auth_type] : ['none']}
                  onChange={(e) => setFormData({ ...formData, auth_type: e.target.value as ServiceUpdate['auth_type'] })}
                >
                  <SelectItem key="none">None</SelectItem>
                  <SelectItem key="basic">HTTP Basic Auth</SelectItem>
                  <SelectItem key="bearer">Bearer Token</SelectItem>
                </Select>
                <p className="text-xs text-default-400">Method used to authenticate requests</p>
              </div>

              {formData.auth_type === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Username"
                    labelPlacement="outside"
                    value={formData.auth_user || ''}
                    onValueChange={(value) => setFormData({ ...formData, auth_user: value })}
                    description="Basic Auth username"
                  />
                  <Input
                    label="Password"
                    labelPlacement="outside"
                    type="password"
                    value={formData.auth_pass || ''}
                    onValueChange={(value) => setFormData({ ...formData, auth_pass: value })}
                    description="Basic Auth password"
                  />
                </div>
              )}

              {formData.auth_type === 'bearer' && (
                <Input
                  label="Bearer Token"
                  labelPlacement="outside"
                  type="password"
                  value={formData.auth_pass || ''}
                  onValueChange={(value) => setFormData({ ...formData, auth_pass: value })}
                  placeholder="Enter your token"
                  description="Token to include in Authorization header"
                />
              )}
            </CardBody>
          </Card>
        </SplitSection>

        {/* Custom Headers */}
        <SplitSection
          title="Custom Headers"
          description="Add custom HTTP headers to include in monitoring requests."
          icon={<FileCode className="w-5 h-5 text-secondary" />}
        >
          <Card>
            <CardBody className="gap-4 p-5">
              {headers.length === 0 ? (
                <div className="text-center py-4 text-default-400">
                  <p>No custom headers configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {headers.map((header, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <Input
                        size="sm"
                        placeholder="Header Name"
                        value={header.key}
                        onValueChange={(v) => updateHeader(index, 'key', v)}
                        className="flex-1"
                      />
                      <Input
                        size="sm"
                        placeholder="Header Value"
                        value={header.value}
                        onValueChange={(v) => updateHeader(index, 'value', v)}
                        className="flex-1"
                      />
                      <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={() => removeHeader(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                size="sm"
                variant="flat"
                color="primary"
                startContent={<Plus className="w-4 h-4" />}
                onPress={addHeader}
              >
                Add Header
              </Button>
            </CardBody>
          </Card>
        </SplitSection>

        {/* Tags */}
        <SplitSection
          title="Tags"
          description="Assign tags to organize and filter your services."
          icon={<Tag className="w-5 h-5 text-primary" />}
        >
          <Card>
            <CardBody className="gap-4 p-5">
              {allTags.length === 0 ? (
                <div className="text-center py-4 text-default-400">
                  <p>No tags available. Create tags from the Tags page.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag: { id: number; name: string; color: string }) => (
                    <Chip
                      key={tag.id}
                      variant={selectedTagIds.includes(tag.id) ? "solid" : "bordered"}
                      color={selectedTagIds.includes(tag.id) ? "primary" : "default"}
                      className="cursor-pointer"
                      style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : { borderColor: tag.color }}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </Chip>
                  ))}
                </div>
              )}
              <p className="text-xs text-default-400">Click on tags to assign or remove them from this service</p>
            </CardBody>
          </Card>
        </SplitSection>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="flat"
            color="default"
            onPress={() => navigate('/admin')}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            type="submit"
            isLoading={createMutation.isPending}
            startContent={<Plus className="w-4 h-4" />}
          >
            Create Service
          </Button>
        </div>
      </form>
    </div>
  );
}
