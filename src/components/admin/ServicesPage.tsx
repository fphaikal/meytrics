import { useState, useMemo, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Tooltip,
} from "@heroui/react";
import { Search, Plus, MoreHorizontal, ChevronDown, FolderOpen, Tags, Globe, Pause, Play, RotateCcw, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';

import { StatusIndicator } from '../StatusIndicator';

import {
  getServices, createService, updateService, deleteService, getCategories, getServicePings,
  bulkUpdateCategory, bulkPauseServices, bulkStartServices, bulkResetStats, bulkDeleteServices,
  getStatusPages, getStatusPageServiceIds, updateStatusPageServiceIds, getSettings, getTags
} from '../../lib/api';
import type { Service, Ping, StatusPage } from '../../lib/types';

export function ServicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Queries
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: getServices,
    refetchInterval: 10000
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings
  });

  // Fetch all tags
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags
  });

  // Tags filter state
  const [selectedTagFilter, setSelectedTagFilter] = useState<number | null>(null);

  const pingQueries = useQueries({
    queries: services.map((service: Service) => ({
      queryKey: ['pings', service.id],
      queryFn: () => getServicePings(service.id, 7),
      refetchInterval: 10000
    }))
  });

  const servicePings = useMemo(() => {
    const map: Record<number, Ping[]> = {};
    services.forEach((service: Service, index: number) => {
      // Use type assertion or default empty array to ensure Ping[] type
      map[service.id] = (pingQueries[index]?.data as Ping[]) || [];
    });
    return map;
  }, [services, pingQueries]);

  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'http',
    interval: 300,
    notify_down: true,
    category_id: null as number | null
  });
  const [saving, setSaving] = useState(false);
  const [filterValue, setFilterValue] = useState("");
  const [sortOrder, setSortOrder] = useState<"down_first" | "up_first" | "name">("down_first");
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());

  // Bulk action states
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStatusPageModal, setShowStatusPageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [statusPages, setStatusPages] = useState<StatusPage[]>([]);
  const [selectedStatusPageId, setSelectedStatusPageId] = useState<number | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingService) {
        await updateService(editingService.id, formData);
      } else {
        await createService(formData);
      }
      setEditingService(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(editingService ? 'Service updated successfully' : 'Service created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', url: '', type: 'http', interval: 300, notify_down: true, category_id: null });
  };

  const handleEdit = (service: Service) => {
    navigate(`/admin/services/${service.id}/edit`);
  };

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await deleteService(id);
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete service');
    }
  }, [queryClient]);

  // Bulk action handlers
  const handleBulkAction = async (action: string) => {
    if (selectedServices.size === 0) {
      alert('Please select at least one service');
      return;
    }
    const ids = Array.from(selectedServices);

    switch (action) {
      case 'categorize':
        setShowCategoryModal(true);
        break;
      case 'status-page':
        try {
          const pages = await getStatusPages();
          setStatusPages(pages);
          setShowStatusPageModal(true);
        } catch (error) {
          toast.error('Failed to load status pages');
        }
        break;
      case 'pause':
        setBulkLoading(true);
        try {
          await bulkPauseServices(ids);
          setSelectedServices(new Set());
          queryClient.invalidateQueries({ queryKey: ['services'] });
          toast.success('Services paused successfully');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to pause services');
        } finally {
          setBulkLoading(false);
        }
        break;
      case 'start':
        setBulkLoading(true);
        try {
          await bulkStartServices(ids);
          setSelectedServices(new Set());
          queryClient.invalidateQueries({ queryKey: ['services'] });
          toast.success('Services started successfully');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to start services');
        } finally {
          setBulkLoading(false);
        }
        break;
      case 'reset':
        setShowResetModal(true);
        break;
      case 'delete':
        setShowDeleteModal(true);
        break;
    }
  };

  const handleBulkCategoryUpdate = async () => {
    setBulkLoading(true);
    try {
      await bulkUpdateCategory(Array.from(selectedServices), selectedCategoryId);
      setShowCategoryModal(false);
      setSelectedServices(new Set());
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Category updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update category');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkAddToStatusPage = async () => {
    if (!selectedStatusPageId) return;
    setBulkLoading(true);
    try {
      const existingIds = await getStatusPageServiceIds(selectedStatusPageId);
      const newIds = [...new Set([...existingIds, ...Array.from(selectedServices)])];
      await updateStatusPageServiceIds(selectedStatusPageId, newIds);
      setShowStatusPageModal(false);
      setSelectedServices(new Set());
      toast.success('Services added to status page successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add to status page');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkResetStats = async () => {
    setBulkLoading(true);
    try {
      await bulkResetStats(Array.from(selectedServices));
      setShowResetModal(false);
      setSelectedServices(new Set());
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['pings'] });
      toast.success('Stats reset successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset stats');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    try {
      await bulkDeleteServices(Array.from(selectedServices));
      setShowDeleteModal(false);
      setSelectedServices(new Set());
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Services deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete services');
    } finally {
      setBulkLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const upCount = services.filter((s: Service) => s.current_status === 'up').length;
    const downCount = services.filter((s: Service) => s.current_status === 'down').length;
    const pausedCount = services.filter((s: Service) => s.current_status === 'paused').length;

    // Calculate overall uptime from uptime_percent field
    let totalUptime = 0;
    let servicesWithData = 0;
    services.forEach((s: Service) => {
      if (s.uptime_percent) {
        totalUptime += parseFloat(s.uptime_percent);
        servicesWithData++;
      }
    });
    const overallUptime = servicesWithData > 0 ? (totalUptime / servicesWithData).toFixed(1) : '0';

    return { upCount, downCount, pausedCount, overallUptime };
  }, [services]);

  // Filter and sort services
  const filteredServices = useMemo(() => {
    let result = [...services];

    if (filterValue) {
      result = result.filter((s: Service) =>
        s.name.toLowerCase().includes(filterValue.toLowerCase()) ||
        s.url.toLowerCase().includes(filterValue.toLowerCase())
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder === "down_first") {
        if (a.current_status === 'down' && b.current_status !== 'down') return -1;
        if (a.current_status !== 'down' && b.current_status === 'down') return 1;
      } else if (sortOrder === "up_first") {
        if (a.current_status === 'up' && b.current_status !== 'up') return -1;
        if (a.current_status !== 'up' && b.current_status === 'up') return 1;
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [services, filterValue, sortOrder]);

  // Helper to format uptime duration
  const formatUptime = (service: Service) => {
    if (service.current_status === 'paused') {
      return 'Paused';
    } else if (service.current_status === 'up') {
      return 'Up';
    } else if (service.current_status === 'down') {
      return 'Down';
    }
    return 'Unknown';
  };

  // Helper to format how long service has been monitored
  const formatMonitoringDuration = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    return parts.join(' ');
  };

  // Render uptime bars (last 12 hours, 1 bar per hour)
  const renderUptimeBars = (serviceId: number) => {
    const pings = servicePings[serviceId] || [];
    const now = new Date();
    const hours: { start: Date; end: Date; upCount: number; totalCount: number }[] = [];

    // Create 12 hour buckets going backward from current hour (local time)
    for (let i = 11; i >= 0; i--) {
      const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - i, 0, 0, 0);
      const hourEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - i + 1, 0, 0, 0);

      hours.push({ start: hourStart, end: hourEnd, upCount: 0, totalCount: 0 });
    }

    // Aggregate pings into hour buckets
    // Database stores UTC without 'Z', so we add 'Z' to parse as UTC
    pings.forEach((ping: Ping) => {
      // Parse as UTC by appending 'Z' if not already present
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

    return (
      <div className="flex gap-px items-center">
        {hours.map((hour, idx) => {
          const uptime = hour.totalCount > 0 ? (hour.upCount / hour.totalCount) * 100 : null;
          const bgColor = uptime === null ? 'bg-default-300' :
            uptime === 100 ? 'bg-emerald-500' :
              uptime >= 80 ? 'bg-yellow-500' :
                'bg-red-500';

          // Format time using timezone setting
          const timezone = settings.timezone || 'Asia/Jakarta';
          const timeFormat = (d: Date) => d.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timezone
          });
          const dateFormat = (d: Date) => d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: '2-digit',
            timeZone: timezone
          });

          return (
            <Tooltip
              key={idx}
              content={
                <div className="text-xs p-1">
                  <div className="font-medium">{dateFormat(hour.start)}, {timeFormat(hour.start)} - {timeFormat(hour.end)}</div>
                  <div className="text-success">Up {uptime !== null ? uptime.toFixed(0) : 0}%</div>
                  <div className="text-default-400">{hour.upCount}/{hour.totalCount} checks</div>
                </div>
              }
              placement="top"
            >
              <div className={`w-2 h-5 rounded-sm cursor-pointer ${bgColor}`} />
            </Tooltip>
          );
        })}
      </div>
    );
  };

  if (servicesLoading) {
    return <div className="text-center py-8 text-default-500">Loading...</div>;
  }

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Services.</h1>
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => { resetForm(); setEditingService(null); setShowForm(true); }}
          >
            New
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                size="sm"
                isSelected={selectedServices.size === filteredServices.length && filteredServices.length > 0}
                isIndeterminate={selectedServices.size > 0 && selectedServices.size < filteredServices.length}
                onValueChange={(isSelected) => {
                  if (isSelected) {
                    setSelectedServices(new Set(filteredServices.map((s: Service) => s.id)));
                  } else {
                    setSelectedServices(new Set());
                  }
                }}
              />
              <span className="text-sm text-default-600">
                {selectedServices.size > 0 ? `${selectedServices.size} selected` : `${services.filter((s: Service) => s.current_status === 'up').length} / ${services.length}`}
              </span>
            </div>

            {/* Bulk Actions Button */}
            <Dropdown>
              <DropdownTrigger>
                <Button
                  size="sm"
                  variant="flat"
                  color={selectedServices.size > 0 ? "primary" : "default"}
                  endContent={<ChevronDown className="w-4 h-4" />}
                  isDisabled={selectedServices.size === 0}
                >
                  Bulk Actions
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Bulk actions" className="min-w-50" onAction={(key) => handleBulkAction(key as string)}>
                <DropdownItem key="categorize" startContent={<FolderOpen className="w-4 h-4" />}>
                  Categorize monitors
                </DropdownItem>
                <DropdownItem key="tags" startContent={<Tags className="w-4 h-4" />}>
                  Add / Remove tags
                </DropdownItem>
                <DropdownItem key="status-page" startContent={<Globe className="w-4 h-4" />}>
                  Add to status page
                </DropdownItem>
                <DropdownItem key="pause" startContent={<Pause className="w-4 h-4" />}>
                  Pause monitors
                </DropdownItem>
                <DropdownItem key="start" startContent={<Play className="w-4 h-4" />}>
                  Start monitors
                </DropdownItem>
                <DropdownItem key="reset" startContent={<RotateCcw className="w-4 h-4" />}>
                  Reset stats
                </DropdownItem>
                <DropdownItem key="delete" startContent={<Trash2 className="w-4 h-4" />} className="text-danger" color="danger">
                  Delete monitors
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
          <Button size="sm" variant="flat" className="text-default-600">
            Show groups
          </Button>
          <div className="flex-1" />
          <Input
            size="sm"
            placeholder="Search by name or url"
            startContent={<Search className="w-4 h-4 text-default-400" />}
            className="max-w-50"
            value={filterValue}
            onValueChange={setFilterValue}
          />
          <Dropdown>
            <DropdownTrigger>
              <Button size="sm" variant="flat" startContent={<Tag className="w-4 h-4" />} endContent={<ChevronDown className="w-4 h-4" />}>
                {selectedTagFilter ? allTags.find((t: { id: number }) => t.id === selectedTagFilter)?.name || 'Tags' : 'Tags'}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Filter by tag"
              selectionMode="single"
              selectedKeys={selectedTagFilter ? new Set([selectedTagFilter.toString()]) : new Set()}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setSelectedTagFilter(selected === 'all' ? null : parseInt(selected));
              }}
            >
              <DropdownItem key="all">All Tags</DropdownItem>
              {allTags.map((tag: { id: number; name: string; color: string }) => (
                <DropdownItem key={tag.id.toString()} startContent={<div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />}>
                  {tag.name}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
          <Dropdown>
            <DropdownTrigger>
              <Button size="sm" variant="flat" endContent={<ChevronDown className="w-4 h-4" />}>
                {sortOrder === "down_first" ? "Down first" : sortOrder === "up_first" ? "Up first" : "Name"}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Sort order"
              selectionMode="single"
              selectedKeys={new Set([sortOrder])}
              onSelectionChange={(keys) => setSortOrder(Array.from(keys)[0] as any)}
            >
              <DropdownItem key="down_first">Down first</DropdownItem>
              <DropdownItem key="up_first">Up first</DropdownItem>
              <DropdownItem key="name">Name</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>

        {/* Service List */}
        <div className="space-y-2">
          {filteredServices.length === 0 ? (
            <div className="text-center py-12 text-default-500">
              No services found. Click "New" to add your first monitor.
            </div>
          ) : (
            filteredServices.map(service => (
              <div
                key={service.id}
                className={`flex items-center gap-4 p-4 bg-background rounded-lg border transition-colors ${selectedServices.has(service.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-divider hover:border-primary/50'
                  }`}
              >
                {/* Selection Checkbox */}
                <Checkbox
                  size="sm"
                  isSelected={selectedServices.has(service.id)}
                  onValueChange={(isSelected) => {
                    const newSelected = new Set(selectedServices);
                    if (isSelected) {
                      newSelected.add(service.id);
                    } else {
                      newSelected.delete(service.id);
                    }
                    setSelectedServices(newSelected);
                  }}
                />

                {/* Status Indicator */}
                <StatusIndicator status={service.current_status as 'up' | 'down' | 'paused' | null} size="sm" pulse />

                {/* Service Info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/admin/services/${service.id}`)}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground hover:text-primary">{service.name}</span>
                    {service.current_status === 'paused' && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400">
                        Paused
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-default-100 text-default-600 dark:bg-content1/10">
                      {service.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-default-500">
                      {formatUptime(service)} for {formatMonitoringDuration(service.created_at)}
                    </span>
                  </div>
                </div>

                {/* Interval */}
                <div className="text-sm text-default-500 hidden md:block">
                  <span className="text-default-400">⟳</span> {Math.floor(service.interval / 60)} min
                </div>

                {/* Uptime Bars */}
                <div className="hidden lg:flex items-center gap-2">
                  {renderUptimeBars(service.id)}
                  <span className="text-sm text-emerald-500 font-medium w-12 text-right">
                    {service.uptime_percent || '0'}%
                  </span>
                </div>

                {/* Actions */}
                <Dropdown>
                  <DropdownTrigger>
                    <Button isIconOnly size="sm" variant="light">
                      <MoreHorizontal className="w-4 h-4 text-default-500" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Service actions">
                    <DropdownItem key="edit" onPress={() => handleEdit(service)}>Edit</DropdownItem>
                    <DropdownItem key="copy" onPress={() => navigator.clipboard.writeText(service.url)}>Copy URL</DropdownItem>
                    <DropdownItem key="delete" className="text-danger" color="danger" onPress={() => handleDelete(service.id)}>Delete</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 shrink-0 hidden xl:block space-y-4">
        {/* Current Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold text-foreground">Current status.</h3>
          </CardHeader>
          <CardBody className="pt-0">
            {/* Status Circle */}
            <div className="flex justify-center m-4">
              <StatusIndicator
                status={stats.downCount > 0 ? 'down' : 'up'}
                size="xl"
                showIcon
                pulse
              />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 text-center mb-3 divide-x divide-divider">
              <div>
                <div className="text-lg font-bold text-foreground">{stats.downCount}</div>
                <div className="text-xs text-default-500">Down</div>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">{stats.upCount}</div>
                <div className="text-xs text-default-500">Up</div>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">{stats.pausedCount}</div>
                <div className="text-xs text-default-500">Paused</div>
              </div>
            </div>

            <div className="text-xs text-center text-default-500">
              Using {services.length} of 50 monitors.
            </div>
          </CardBody>
        </Card>

        {/* Last 24 Hours Card */}
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold text-foreground">Last 24 hours.</h3>
          </CardHeader>
          <CardBody className="pt-0 space-y-3">
            <div className="flex justify-between">
              <div>
                <div className="text-lg font-bold text-emerald-500">{stats.overallUptime}%</div>
                <div className="text-xs text-default-500">Overall uptime</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-foreground">{stats.downCount}</div>
                <div className="text-xs text-default-500">Incidents</div>
              </div>
            </div>
            <Divider />
            <div className="flex justify-between">
              <div>
                <div className="text-lg font-bold text-foreground">1d</div>
                <div className="text-xs text-default-500">Without incid.</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-foreground">0</div>
                <div className="text-xs text-default-500">Affected mon.</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Modal */}
      <Modal isOpen={showForm} onOpenChange={setShowForm}
        backdrop="opaque">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleSubmit} id="service-form" className="flex flex-col gap-4">
                  <Input
                    label="Name"
                    labelPlacement="outside"
                    value={formData.name}
                    onValueChange={(value) => setFormData({ ...formData, name: value })}
                    placeholder="My Service"
                    isRequired
                  />
                  <Input
                    label="URL"
                    labelPlacement="outside"
                    value={formData.url}
                    onValueChange={(value) => setFormData({ ...formData, url: value })}
                    placeholder="https://example.com"
                    isRequired
                  />
                  <div className="flex gap-4">
                    <Select
                      label="Type"
                      labelPlacement="outside"
                      placeholder="Select type"
                      selectedKeys={[formData.type]}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="max-w-xs"
                    >
                      <SelectItem key="http">HTTP</SelectItem>
                      <SelectItem key="tcp">TCP</SelectItem>
                    </Select>
                    <Select
                      label="Interval"
                      labelPlacement="outside"
                      placeholder="Select interval"
                      selectedKeys={[formData.interval.toString()]}
                      onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
                    >
                      <SelectItem key="60">1 minute</SelectItem>
                      <SelectItem key="180">3 minutes</SelectItem>
                      <SelectItem key="300">5 minutes</SelectItem>
                      <SelectItem key="600">10 minutes</SelectItem>
                      <SelectItem key="900">15 minutes</SelectItem>
                      <SelectItem key="1800">30 minutes</SelectItem>
                      <SelectItem key="3600">1 hour</SelectItem>
                    </Select>
                  </div>

                  <Select
                    label="Category"
                    labelPlacement="outside"
                    placeholder="Select category"
                    selectedKeys={formData.category_id ? [formData.category_id.toString()] : ["no_category"]}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value === "no_category" ? null : parseInt(e.target.value) })}
                  >
                    {[
                      <SelectItem key="no_category">No category</SelectItem>,
                      ...categories.map((cat: any) => (
                        <SelectItem key={cat.id.toString()}>{cat.name}</SelectItem>
                      ))
                    ]}
                  </Select>
                  <Checkbox
                    isSelected={formData.notify_down}
                    onValueChange={(isSelected) => setFormData({ ...formData, notify_down: isSelected })}
                  >
                    Send notification when service goes down
                  </Checkbox>
                </form>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" form="service-form" isLoading={saving}>
                  {editingService ? 'Update' : 'Add'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Categorize {selectedServices.size} monitors</ModalHeader>
              <ModalBody>
                <Select
                  label="Select Category"
                  labelPlacement="outside"
                  selectedKeys={selectedCategoryId ? [selectedCategoryId.toString()] : ["no_category"]}
                  onChange={(e) => setSelectedCategoryId(e.target.value === "no_category" ? null : parseInt(e.target.value))}
                >
                  {[
                    <SelectItem key="no_category">No category</SelectItem>,
                    ...categories.map((cat: any) => (
                      <SelectItem key={cat.id.toString()}>{cat.name}</SelectItem>
                    ))
                  ]}
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancel</Button>
                <Button color="primary" onPress={handleBulkCategoryUpdate} isLoading={bulkLoading}>
                  Apply
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Status Page Modal */}
      <Modal isOpen={showStatusPageModal} onOpenChange={setShowStatusPageModal}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Add {selectedServices.size} monitors to status page</ModalHeader>
              <ModalBody>
                <Select
                  label="Select Status Page"
                  selectedKeys={selectedStatusPageId ? [selectedStatusPageId.toString()] : []}
                  onChange={(e) => setSelectedStatusPageId(parseInt(e.target.value))}
                >
                  {statusPages.map(page => (
                    <SelectItem key={page.id.toString()}>{page.name}</SelectItem>
                  ))}
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancel</Button>
                <Button color="primary" onPress={handleBulkAddToStatusPage} isLoading={bulkLoading} isDisabled={!selectedStatusPageId}>
                  Add to Status Page
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Reset Stats Modal */}
      <Modal isOpen={showResetModal} onOpenChange={setShowResetModal}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Reset Statistics</ModalHeader>
              <ModalBody>
                <p className="text-default-600">
                  Are you sure you want to reset statistics for <strong>{selectedServices.size}</strong> monitors?
                  This will delete all ping history and uptime data. This action cannot be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancel</Button>
                <Button color="warning" onPress={handleBulkResetStats} isLoading={bulkLoading}>
                  Reset Stats
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onOpenChange={setShowDeleteModal}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-danger">Delete Monitors</ModalHeader>
              <ModalBody>
                <p className="text-default-600">
                  Are you sure you want to delete <strong>{selectedServices.size}</strong> monitors?
                  This action cannot be undone.
                </p>
                <div className="mt-2 p-3 bg-danger-50 rounded-lg text-sm text-danger">
                  {services.filter((s: Service) => selectedServices.has(s.id)).map((s: Service) => s.name).join(', ')}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancel</Button>
                <Button color="danger" onPress={handleBulkDelete} isLoading={bulkLoading}>
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div >
  );
}
