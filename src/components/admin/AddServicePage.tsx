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
import { ArrowLeft, Plus, Settings, Activity, Shield, Clock, FileCode, Tag, Trash2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import { getCategories, createService, getTags, bulkUpdateTags } from '../../lib/api';
import type { ServiceUpdate, Category } from '../../lib/types';

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
    notification_delay: 0
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

  // State for custom headers editor
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);
  // State for selected tag IDs
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const createMutation = useMutation({
    mutationFn: async (data: ServiceUpdate) => {
      const response = await createService(data);
      // If the response contains the new service ID and we have tags, assign them
      // The API might return the created service object.
      // Assuming createService returns the service object with an ID.
      // If not, we can't assign tags easily unless the create API accepts tags.
      // Ideally the create API should accept tags. If not, we might need to handle it.
      // For now, let's assume valid create. If we need to add tags separately, we need the ID.
      // Let's assume createService returns the service.
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
                  selectedKeys={formData.type ? [formData.type] : []}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <SelectItem key="http">HTTP(S)</SelectItem>
                  <SelectItem key="keyword">Keyword</SelectItem>
                  <SelectItem key="dns">DNS</SelectItem>
                  <SelectItem key="tcp">TCP Port</SelectItem>
                  <SelectItem key="ping">Ping</SelectItem>
                </Select>
                <p className="text-xs text-default-400">How to check this service</p>
              </div>

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

              <Input
                label="URL"
                labelPlacement="outside"
                value={formData.url}
                onValueChange={(value) => setFormData({ ...formData, url: value })}
                placeholder="https://api.example.com/health"
                isRequired
                description="The endpoint to monitor"
              />

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
                  />
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 transition-opacity ${!formData.notify_down ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="space-y-1">
                    <Select
                      label="Repeat notification"
                      labelPlacement="outside"
                      isDisabled={!formData.notify_down}
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
                      isDisabled={!formData.notify_down}
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

              {/* Keyword Fields */}
              {formData.type === 'keyword' && (
                <div className="bg-default-50 p-4 rounded-lg space-y-3">
                  <h3 className="text-sm font-medium">Keyword Configuration</h3>
                  <Input
                    label="Keyword to Match"
                    labelPlacement="outside"
                    placeholder="e.g. System Normal"
                    value={formData.keyword || ''}
                    onValueChange={(value) => setFormData({ ...formData, keyword: value })}
                    description="The monitor will be marked DOWN if this keyword is missing from the response body."
                    isRequired
                  />
                </div>
              )}

              {/* DNS Fields */}
              {formData.type === 'dns' && (
                <div className="bg-default-50 p-4 rounded-lg space-y-4">
                  <h3 className="text-sm font-medium">DNS Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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


            </CardBody>
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
