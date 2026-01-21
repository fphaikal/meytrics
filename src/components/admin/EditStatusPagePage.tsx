import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Card,
  CardBody,
  Spinner,
  Textarea,
  Chip
} from "@heroui/react";
import { SplitSection } from '../ui/SplitSection';
import { ArrowLeft, Save, ExternalLink, X, Plus, Trash2, GripVertical, Globe, Lock } from 'lucide-react';
import { getStatusPages, updateStatusPage, getServices, getStatusPageServiceIds, updateStatusPageServiceIds, getStatusPageSections, createStatusPageSection, updateStatusPageSection, deleteStatusPageSection, assignServiceToSection, type StatusPageSection } from '../../lib/api';
import type { StatusPage, Service } from '../../lib/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from '../../lib/toast';

// Sortable Service Component (for services within a section)
interface SortableServiceProps {
  serviceId: number;
  serviceName: string;
  statusPageId: string;
  onRemove: () => void;
}

function SortableService({ serviceId, serviceName, onRemove }: SortableServiceProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `service-${serviceId}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto'
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-default-100 rounded group">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-default-100 rounded">
        <GripVertical className="w-4 h-4 text-default-300" />
      </div>
      <span className="text-sm flex-1">{serviceName}</span>
      <Chip size="sm" variant="flat" color="primary">
        With status history & chart
      </Chip>
      <Button
        isIconOnly
        size="sm"
        variant="light"
        className="opacity-0 group-hover:opacity-100"
        onPress={onRemove}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

// Sortable Section Component
interface SortableSectionProps {
  id: number;
  section: StatusPageSection;
  services: Service[];
  selectedServiceIds: number[];
  setSelectedServiceIds: React.Dispatch<React.SetStateAction<number[]>>;
  sections: StatusPageSection[];
  setSections: React.Dispatch<React.SetStateAction<StatusPageSection[]>>;
  statusPageId: string;
}

function SortableSection({ id, section, services, selectedServiceIds, setSelectedServiceIds, sections, setSections, statusPageId }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto'
  };

  return (
    <div ref={setNodeRef} style={style} className="border border-default-200 rounded-lg p-4 space-y-4 bg-content1">
      {/* Section Name */}
      <div>
        <label className="text-xs text-default-500 mb-1 block">Section name</label>
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-default-100 rounded">
            <GripVertical className="w-4 h-4 text-default-400" />
          </div>
          <Input
            size="sm"
            value={section.name}
            onValueChange={(value) => {
              setSections(sections.map(s =>
                s.id === section.id ? { ...s, name: value } : s
              ));
            }}
            onBlur={() => {
              if (section.id) {
                updateStatusPageSection(parseInt(statusPageId), section.id, { name: section.name });
              }
            }}
            className="flex-1"
            placeholder="Leave blank to hide the section heading"
          />
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="danger"
            onPress={async () => {
              if (section.id) {
                await deleteStatusPageSection(parseInt(statusPageId), section.id);
                setSections(sections.filter(s => s.id !== section.id));
                toast.success('Section deleted');
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-default-400 mt-1">Leave blank to hide the section heading.</p>
      </div>

      {/* Resources / Services */}
      <div>
        <label className="text-xs text-default-500 mb-2 block">Resources</label>

        {/* Add service dropdown */}
        <Select
          size="sm"
          placeholder="+ Search to add resources"
          className="mb-3"
          onChange={async (e) => {
            if (e.target.value) {
              const serviceId = parseInt(e.target.value);
              // First ensure service is in status page
              if (!selectedServiceIds.includes(serviceId)) {
                const newIds = [...selectedServiceIds, serviceId];
                setSelectedServiceIds(newIds);
                await updateStatusPageServiceIds(parseInt(statusPageId), newIds);
              }
              // Then assign to this section
              await assignServiceToSection(parseInt(statusPageId), serviceId, section.id);
              // Reload
              const sectionsData = await getStatusPageSections(parseInt(statusPageId));
              setSections(sectionsData);
            }
          }}
        >
          {services
            .filter(s => !section.services?.some(svc => svc.service_id === s.id))
            .map((s) => (
              <SelectItem key={s.id}>{s.name}</SelectItem>
            ))}
        </Select>

        {/* Services list with drag and drop */}
        <DndContext
          sensors={useSensors(
            useSensor(PointerSensor),
            useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
          )}
          collisionDetection={closestCenter}
          onDragEnd={async (event: DragEndEvent) => {
            const { active, over } = event;
            if (over && active.id !== over.id && section.services) {
              const oldIndex = section.services.findIndex(s => `service-${s.service_id}` === active.id);
              const newIndex = section.services.findIndex(s => `service-${s.service_id}` === over.id);
              const reorderedServices = arrayMove([...section.services], oldIndex, newIndex);

              // Update local state immediately for responsive UI
              setSections(sections.map(s =>
                s.id === section.id ? { ...s, services: reorderedServices } : s
              ));

              // Save order to backend
              for (let i = 0; i < reorderedServices.length; i++) {
                // Update sort_order for each service in the section
                await fetch(`/api/admin/status-pages/${statusPageId}/services/${reorderedServices[i].service_id}/order`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify({ sort_order: i })
                });
              }
            }
          }}
        >
          <SortableContext
            items={section.services?.map(s => `service-${s.service_id}`) || []}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {section.services && section.services.length > 0 ? (
                section.services.map((svc) => (
                  <SortableService
                    key={svc.service_id}
                    serviceId={svc.service_id}
                    serviceName={svc.service_name}
                    statusPageId={statusPageId}
                    onRemove={async () => {
                      await assignServiceToSection(parseInt(statusPageId), svc.service_id, null);
                      const sectionsData = await getStatusPageSections(parseInt(statusPageId));
                      setSections(sectionsData);
                    }}
                  />
                ))
              ) : (
                <p className="text-sm text-default-400 italic p-2">No resources added yet. Use the dropdown above to add services.</p>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}



interface StatusPageFormData {
  slug: string;
  name: string;
  title: string;
  subtitle: string;
  navbar_title: string;
  logo_url: string;
  favicon_url: string;
  hero_bg_color: string;
  theme_mode: string;
  bg_pattern: string;
  monitor_style: string;
  meta_description: string;
  og_image_url: string;
  custom_css: string;
  is_default: boolean;
  is_public: boolean;
}

export function EditStatusPagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'structure'>('settings');
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [sections, setSections] = useState<StatusPageSection[]>([]);
  const [formData, setFormData] = useState<StatusPageFormData>({
    slug: '',
    name: '',
    title: '',
    subtitle: '',
    navbar_title: '',
    logo_url: '',
    favicon_url: '',
    hero_bg_color: '#1e2a38',
    theme_mode: 'system',
    bg_pattern: 'none',
    monitor_style: 'bars',
    meta_description: '',
    og_image_url: '',
    custom_css: '',
    is_default: false,
    is_public: true
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch status pages
  const { data: statusPages } = useQuery({
    queryKey: ['statusPages'],
    queryFn: getStatusPages
  });

  // Fetch services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: getServices
  });

  const updateMutation = useMutation({
    mutationFn: async (data: StatusPageFormData) => {
      await updateStatusPage(parseInt(id!), data);
      await updateStatusPageServiceIds(parseInt(id!), selectedServiceIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statusPages'] });
      // navigate('/admin/status-pages');
      toast.success('Status page updated successfully');
    },
    onError: () => {
      toast.error('Failed to update status page');
    }
  });

  useEffect(() => {
    const loadData = async () => {
      if (statusPages && id) {
        const page = statusPages.find((p: StatusPage) => p.id === parseInt(id));
        if (page) {
          setFormData({
            slug: page.slug,
            name: page.name,
            title: page.title || '',
            subtitle: page.subtitle || '',
            navbar_title: page.navbar_title || '',
            logo_url: page.logo_url || '',
            favicon_url: page.favicon_url || '',
            hero_bg_color: page.hero_bg_color || '#1e2a38',
            theme_mode: page.theme_mode || 'system',
            bg_pattern: page.bg_pattern || 'none',
            monitor_style: page.monitor_style || 'bars',
            meta_description: page.meta_description || '',
            og_image_url: page.og_image_url || '',
            custom_css: page.custom_css || '',
            is_default: page.is_default,
            is_public: page.is_public
          });

          // Load assigned service IDs
          try {
            const serviceIds = await getStatusPageServiceIds(page.id);
            setSelectedServiceIds(serviceIds);
          } catch (error) {
            console.error('Failed to load service IDs:', error);
          }

          // Load sections
          try {
            const sectionsData = await getStatusPageSections(page.id);
            setSections(sectionsData);
          } catch (error) {
            console.error('Failed to load sections:', error);
          }

          setLoading(false);
        }
      }
    };
    loadData();
  }, [statusPages, id]);

  // Handle file upload
  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formDataUpload,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Ensure we're authenticated if needed, though this route is public currently
        }
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      const fullUrl = `http://localhost:3000${data.url}`;

      setFormData(prev => ({
        ...prev,
        [type === 'logo' ? 'logo_url' : 'favicon_url']: fullUrl
      }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto ">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-default-500 mb-4">
        <button onClick={() => navigate('/admin/status-pages')} className="hover:text-primary flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Status Pages
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Edit Status Page</h1>
        <div className="flex items-center gap-4">
          <Button
            size="sm"
            color={formData.is_public ? "success" : "default"}
            variant={formData.is_public ? "flat" : "bordered"}
            onPress={() => {
              const newPublicState = !formData.is_public;
              setFormData({ ...formData, is_public: newPublicState });
              updateMutation.mutate({ ...formData, is_public: newPublicState });
            }}
            isLoading={updateMutation.isPending}
            startContent={!updateMutation.isPending && (formData.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />)}
          >
            {formData.is_public ? "Publicly Accessible" : "Private (Hidden)"}
          </Button>
          <a
            href={`/status/${formData.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            Preview
          </a>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6 border-b border-default-200">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'settings'
            ? 'text-primary border-b-2 border-primary'
            : 'text-default-500 hover:text-foreground'
            }`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'structure'
            ? 'text-primary border-b-2 border-primary'
            : 'text-default-500 hover:text-foreground'
            }`}
          onClick={() => setActiveTab('structure')}
        >
          Structure
        </button>
      </div>

      {/* Structure Tab Content */}
      {activeTab === 'structure' && (
        <div className="space-y-6 pb-8">
          <SplitSection
            title="Page Structure"
            description="Organize services into sections. Drag and drop to reorder sections and services."
          >
            <div className="space-y-6">
              {/* Sections List with Drag and Drop */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={async (event: DragEndEvent) => {
                  const { active, over } = event;
                  if (over && active.id !== over.id) {
                    const sortedSections = sections.filter(s => s.id !== null);
                    const oldIndex = sortedSections.findIndex(s => s.id === active.id);
                    const newIndex = sortedSections.findIndex(s => s.id === over.id);
                    const reorderedSections = arrayMove(sortedSections, oldIndex, newIndex);

                    // Update display order
                    const reorderedWithOrder = reorderedSections.map((s, idx) => ({ ...s, display_order: idx }));
                    setSections([...reorderedWithOrder, ...sections.filter(s => s.id === null)]);

                    // Save order to backend
                    for (let i = 0; i < reorderedWithOrder.length; i++) {
                      if (reorderedWithOrder[i].id) {
                        await updateStatusPageSection(parseInt(id!), reorderedWithOrder[i].id!, { display_order: i });
                      }
                    }
                  }
                }}
              >
                <SortableContext
                  items={sections.filter(s => s.id !== null).map(s => s.id!)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {sections.filter(s => s.id !== null).map((section) => (
                      <SortableSection
                        key={section.id}
                        id={section.id!}
                        section={section}
                        services={services}
                        selectedServiceIds={selectedServiceIds}
                        setSelectedServiceIds={setSelectedServiceIds}
                        sections={sections}
                        setSections={setSections}
                        statusPageId={id!}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Add Section Button */}
              <Button
                variant="bordered"
                className="w-full mt-4"
                startContent={<Plus className="w-4 h-4" />}
                onPress={async () => {
                  const newSection = await createStatusPageSection(parseInt(id!), '', sections.filter(s => s.id !== null).length);
                  setSections([...sections.filter(s => s.id !== null), { ...newSection, services: [] }, ...sections.filter(s => s.id === null)]);
                  toast.success('Section added');
                }}
              >
                Add section
              </Button>

              {/* Uncategorized Services */}
              {sections.find(s => s.id === null)?.services && sections.find(s => s.id === null)!.services!.length > 0 && (
                <div className="border border-dashed border-default-300 rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-medium text-default-600 mb-2">Unassigned Services</h4>
                  <p className="text-xs text-default-400 mb-3">These services are on this status page but not assigned to any section.</p>
                  <div className="space-y-2">
                    {sections.find(s => s.id === null)?.services?.map((svc) => (
                      <div key={svc.service_id} className="flex items-center gap-2 p-2 bg-content1 rounded">
                        <span className="text-sm flex-1">{svc.service_name}</span>
                        <Select
                          size="sm"
                          placeholder="Move to section"
                          className="w-48"
                          onChange={async (e) => {
                            if (e.target.value) {
                              const sectionId = parseInt(e.target.value);
                              await assignServiceToSection(parseInt(id!), svc.service_id, sectionId);
                              const sectionsData = await getStatusPageSections(parseInt(id!));
                              setSections(sectionsData);
                              toast.success('Service assigned to section');
                            }
                          }}
                        >
                          {sections.filter(s => s.id !== null).map((s) => (
                            <SelectItem key={s.id!}>{s.name || 'Unnamed Section'}</SelectItem>
                          ))}
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SplitSection>

          {/* Back Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="flat"
              color="default"
              onPress={() => navigate('/admin/status-pages')}
            >
              Back to List
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <form onSubmit={handleSubmit} className="space-y-8 pb-10">
          {/* Basic Information */}
          <SplitSection
            title="Basic Information"
            description="Configure the primary details of your status page including its URL and visibility."
          >
            <Card>
              <CardBody className="gap-5 p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Slug (URL Path)"
                    labelPlacement="outside"
                    value={formData.slug}
                    onValueChange={(value) => setFormData({ ...formData, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    isRequired
                    placeholder="e.g. main"
                    description={`https://your-domain.com/status/${formData.slug || 'slug'}`}
                  />
                  <Input
                    label="Internal Name"
                    labelPlacement="outside"
                    value={formData.name}
                    onValueChange={(value) => setFormData({ ...formData, name: value })}
                    isRequired
                    placeholder="e.g. Main Status Page"
                    description="Used to identify this page in the admin panel"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Page Title"
                    labelPlacement="outside"
                    value={formData.title}
                    onValueChange={(value) => setFormData({ ...formData, title: value })}
                    placeholder="e.g. Service Status"
                    description="Displayed in the browser tab"
                  />
                  <Input
                    label="Subtitle"
                    labelPlacement="outside"
                    value={formData.subtitle}
                    onValueChange={(value) => setFormData({ ...formData, subtitle: value })}
                    placeholder="e.g. Real-time system status"
                    description="Displayed below the main heading"
                  />
                </div>

                <div className="hidden">
                  {/* Default Page option removed as per request */}
                </div>
              </CardBody>
            </Card>
          </SplitSection>

          {/* Branding */}
          <SplitSection
            title="Branding & Design"
            description="Customize the look and feel to match your brand identity."
          >
            <Card>
              <CardBody className="gap-6 p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logo</label>
                    <div className="flex gap-4 items-start">
                      {formData.logo_url ? (
                        <div className="w-16 h-16 relative border rounded-lg bg-slate-50 p-2 shrink-0">
                          <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, logo_url: '' })}
                            className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-0.5 hover:bg-danger-600 transition-colors shadow-sm"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 border-2 border-dashed border-default-300 rounded-lg flex items-center justify-center text-default-400 bg-content1 shrink-0">
                          <span className="text-xs">No Logo</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'logo');
                          }}
                          classNames={{
                            input: "file:mr-4 file:py-2 file:px-4 file:rounded-small file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary hover:file:bg-primary-100 transition-colors text-sm text-default-500",
                            inputWrapper: "!bg-transparent shadow-none"
                          }}
                        />
                        <p className="text-xs text-default-400 mt-1 pl-1">Recommended: 200x50px PNG or SVG</p>
                      </div>
                    </div>
                  </div>

                  {/* Favicon Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Favicon</label>
                    <div className="flex gap-4 items-start">
                      {formData.favicon_url ? (
                        <div className="w-16 h-16 relative border rounded-lg bg-slate-50 p-2 shrink-0">
                          <img src={formData.favicon_url} alt="Favicon" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, favicon_url: '' })}
                            className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-0.5 hover:bg-danger-600 transition-colors shadow-sm"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 border-2 border-dashed border-default-300 rounded-lg flex items-center justify-center text-default-400 bg-content1 shrink-0">
                          <span className="text-xs">No Icon</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'favicon');
                          }}
                          classNames={{
                            input: "file:mr-4 file:py-2 file:px-4 file:rounded-small file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary hover:file:bg-primary-100 transition-colors text-sm text-default-500",
                            inputWrapper: "!bg-transparent shadow-none"
                          }}
                        />
                        <p className="text-xs text-default-400 mt-1 pl-1">Recommended: 32x32px PNG or ICO</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-default-100 mt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">Hero Background Color</label>
                    <div className="flex gap-3 items-center">
                      <div className="relative">
                        <input
                          type="color"
                          value={formData.hero_bg_color}
                          onChange={(e) => setFormData({ ...formData, hero_bg_color: e.target.value })}
                          className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer overflow-hidden opacity-0 absolute inset-0 z-10"
                        />
                        <div
                          className="w-10 h-10 rounded-lg border border-default-200 shadow-sm"
                          style={{ backgroundColor: formData.hero_bg_color }}
                        />
                      </div>
                      <Input
                        aria-label="Hero Background Color Code"
                        value={formData.hero_bg_color}
                        onValueChange={(value) => setFormData({ ...formData, hero_bg_color: value })}
                        placeholder="#1E2A38"
                        className="max-w-30"
                        startContent={<span className="text-default-400 text-small">#</span>}
                      />
                    </div>
                    <p className="text-xs text-default-400 mt-1">Background color for the header area</p>
                  </div>

                  <Select
                    label="Theme Mode"
                    labelPlacement="outside"
                    selectedKeys={[formData.theme_mode]}
                    onChange={(e) => setFormData({ ...formData, theme_mode: e.target.value })}
                  >
                    <SelectItem key="system">System</SelectItem>
                    <SelectItem key="light">Light</SelectItem>
                    <SelectItem key="dark">Dark</SelectItem>
                  </Select>
                  <Select
                    label="Background Pattern"
                    labelPlacement="outside"
                    selectedKeys={[formData.bg_pattern]}
                    onChange={(e) => setFormData({ ...formData, bg_pattern: e.target.value })}
                  >
                    <SelectItem key="none">None</SelectItem>
                    <SelectItem key="dots">Dots</SelectItem>
                    <SelectItem key="grid">Grid</SelectItem>
                    <SelectItem key="waves">Waves</SelectItem>
                  </Select>
                  <Select
                    label="Monitor Style"
                    labelPlacement="outside"
                    selectedKeys={[formData.monitor_style]}
                    onChange={(e) => setFormData({ ...formData, monitor_style: e.target.value })}
                  >
                    <SelectItem key="bars">Bars</SelectItem>
                    <SelectItem key="dots">Dots</SelectItem>
                    <SelectItem key="list">List</SelectItem>
                  </Select>
                </div>
              </CardBody>
            </Card>

          </SplitSection>

          {/* SEO & Meta */}
          <SplitSection
            title="SEO & Social Sharing"
            description="Control how your status page appears in search results and on social media."
          >
            <Card>
              <CardBody className="gap-5 p-5">
                <Textarea
                  label="Meta Description"
                  labelPlacement="outside"
                  value={formData.meta_description}
                  onValueChange={(value) => setFormData({ ...formData, meta_description: value })}
                  minRows={2}
                  placeholder="Monitor the status of all our services in real-time..."
                  description="A brief description of your status page for search engines."
                />
                <Input
                  label="OpenGraph Image URL"
                  labelPlacement="outside"
                  value={formData.og_image_url}
                  onValueChange={(value) => setFormData({ ...formData, og_image_url: value })}
                  placeholder="https://example.com/og-image.jpg"
                  type="url"
                  description="Preview image displayed when sharing on social media (1200x630px)."
                />
              </CardBody>
            </Card>
          </SplitSection>

          {/* Custom CSS */}
          <SplitSection
            title="Advanced Styling"
            description="Override the default styling with your own CSS."
          >
            <Card>
              <CardBody className="p-0">
                <Textarea
                  placeholder="/* .status-card { background: #f0f0f0; } */"
                  value={formData.custom_css}
                  onValueChange={(value) => setFormData({ ...formData, custom_css: value })}
                  minRows={8}
                  className="font-mono text-sm"
                  classNames={{
                    input: "p-4 focus:ring-0",
                    inputWrapper: "shadow-none bg-transparent"
                  }}
                />
              </CardBody>
            </Card>
            <p className="text-xs text-default-400 mt-2">Use valid CSS. Classes can be inspected on the public page.</p>
          </SplitSection>

          {/* Danger Zone */}
          <SplitSection
            title="Danger Zone"
            description="Irreversible actions regarding this status page."
          >
            <Card className="border-danger-200 bg-danger-50 dark:bg-danger-900/10">
              <CardBody className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-danger-700 dark:text-danger-400 font-medium">Delete Status Page</h4>
                  <p className="text-danger-500/80 dark:text-danger-400/80 text-small">
                    Permanently delete this status page and all its associations. This cannot be undone.
                  </p>
                </div>
                <Button
                  color="danger"
                  variant="flat"
                  startContent={<Trash2 size={16} />}
                  onPress={() => {
                    if (confirm('Are you sure you want to delete this status page?')) {
                      // existing delete functionality or placeholder
                      alert('Delete functionality to be implemented');
                    }
                  }}
                >
                  Delete Page
                </Button>
              </CardBody>
            </Card>
          </SplitSection>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-default-200">
            <Button
              variant="flat"
              color="default"
              onPress={() => navigate('/admin/status-pages')}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              type="submit"
              isLoading={updateMutation.isPending}
              startContent={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
