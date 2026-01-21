import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStatusPages, createStatusPage, updateStatusPage, deleteStatusPage, getServices, updateStatusPageServiceIds } from '../../lib/api';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Checkbox,
  Textarea,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/react";

import { MoreHorizontal, ExternalLink, Globe } from 'lucide-react';
import { toast } from 'sonner';
import type { StatusPage, Service } from '../../lib/types';

export function StatusPagesPage() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<StatusPage[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPage, setEditingPage] = useState<StatusPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    title: '',
    subtitle: '',
    logo_url: '',
    favicon_url: '',
    hero_bg_color: '#1e2a38',
    theme_mode: 'system',
    bg_pattern: 'none',
    monitor_style: 'bars',
    meta_description: '',
    is_default: false,
    is_public: true
  });

  const fetchPages = async () => {
    try {
      const [pagesData, servicesData] = await Promise.all([
        getStatusPages(),
        getServices()
      ]);
      setPages(pagesData);
      setServices(servicesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const resetForm = () => {
    setFormData({
      slug: '', name: '', title: '', subtitle: '', logo_url: '', favicon_url: '',
      hero_bg_color: '#1e2a38', theme_mode: 'system', bg_pattern: 'none',
      monitor_style: 'bars', meta_description: '', is_default: false, is_public: true
    });
    setSelectedServiceIds([]);
    setEditingPage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let pageId: number;

      if (editingPage) {
        await updateStatusPage(editingPage.id, formData);
        pageId = editingPage.id;
      } else {
        const newPage = await createStatusPage(formData);
        pageId = newPage.id;
      }

      // Save service assignments
      await updateStatusPageServiceIds(pageId, selectedServiceIds);

      setShowForm(false);
      resetForm();
      fetchPages();
      toast.success(editingPage ? 'Status page updated successfully' : 'Status page created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save status page');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this status page?')) return;
    try {
      await deleteStatusPage(id);
      fetchPages();
      toast.success('Status page deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete status page');
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-default-500">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Status Pages.</h1>
        <Button color="primary" onPress={() => { resetForm(); setShowForm(true); }}>
          + Create Status Page
        </Button>
      </div>

      <Modal isOpen={showForm} onOpenChange={setShowForm} size="4xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editingPage ? 'Edit Status Page' : 'Create Status Page'}
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleSubmit} id="page-form" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Slug"
                        labelPlacement="outside"
                        value={formData.slug}
                        onValueChange={(value) => setFormData({ ...formData, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                        isRequired
                        placeholder="e.g., main, api, internal"
                        description={`URL: /status/${formData.slug || 'slug'}`}
                      />
                    </div>
                    <div>
                      <Input
                        label="Name"
                        labelPlacement="outside"
                        value={formData.name}
                        onValueChange={(value) => setFormData({ ...formData, name: value })}
                        isRequired
                        placeholder="Main Status Page"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Page Title"
                        labelPlacement="outside"
                        value={formData.title}
                        onValueChange={(value) => setFormData({ ...formData, title: value })}
                        placeholder="Status Page"
                      />
                    </div>
                    <div>
                      <Input
                        label="Subtitle"
                        labelPlacement="outside"
                        value={formData.subtitle}
                        onValueChange={(value) => setFormData({ ...formData, subtitle: value })}
                        placeholder="Real-time system status"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Logo URL"
                        value={formData.logo_url}
                        onValueChange={(value) => setFormData({ ...formData, logo_url: value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          label="Hero Background"
                          value={formData.hero_bg_color}
                          onValueChange={(value) => setFormData({ ...formData, hero_bg_color: value })}
                          className="w-24"
                        />
                        <Input
                          label="Color Code"
                          value={formData.hero_bg_color}
                          onValueChange={(value) => setFormData({ ...formData, hero_bg_color: value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
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
                    </div>
                    <div>
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
                    </div>
                    <div>
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
                  </div>

                  <div>
                    <Textarea
                      label="Meta Description"
                      labelPlacement="outside"
                      value={formData.meta_description}
                      onValueChange={(value) => setFormData({ ...formData, meta_description: value })}
                      minRows={2}
                      placeholder="Monitor the status of all our services in real-time"
                    />
                  </div>

                  {/* Services Selection */}
                  <div>
                    <label className="block text-small font-medium text-foreground pb-2">Services to Display</label>
                    <div className="border border-default-200 rounded-lg max-h-48 overflow-y-auto p-2">
                      {services.length === 0 ? (
                        <p className="text-sm text-default-500">No services available. Create services first.</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {services.map((service) => (
                            <div key={service.id} className="flex items-center gap-3 p-2 hover:bg-default-100 rounded-lg cursor-pointer transition-colors">
                              <Checkbox
                                isSelected={selectedServiceIds.includes(service.id)}
                                onValueChange={(checked) => {
                                  if (checked) {
                                    setSelectedServiceIds([...selectedServiceIds, service.id]);
                                  } else {
                                    setSelectedServiceIds(selectedServiceIds.filter(id => id !== service.id));
                                  }
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{service.name}</span>
                                  <span className="text-xs text-default-500">{service.url}</span>
                                </div>
                              </Checkbox>
                              <Chip
                                size="sm"
                                variant="flat"
                                color={service.current_status === 'up' ? 'success' : service.current_status === 'down' ? 'danger' : 'default'}
                                className="ml-auto"
                              >
                                {service.current_status === 'up' ? 'Up' : service.current_status === 'down' ? 'Down' : 'Unknown'}
                              </Chip>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-default-400 mt-1">{selectedServiceIds.length} service(s) selected</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <Checkbox
                      isSelected={formData.is_default}
                      onValueChange={(checked) => setFormData({ ...formData, is_default: checked })}
                    >
                      Default page (shown at /)
                    </Checkbox>
                    <Checkbox
                      isSelected={formData.is_public}
                      onValueChange={(checked) => setFormData({ ...formData, is_public: checked })}
                    >
                      Publicly Accessbile
                    </Checkbox>
                  </div>
                </form>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" color="danger" onPress={onClose}>Cancel</Button>
                <Button color="primary" type="submit" form="page-form" isLoading={saving}>
                  {editingPage ? 'Update' : 'Create'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Pages List */}
      <div className="space-y-2">
        {pages.length === 0 ? (
          <div className="bg-content1 rounded-xl p-8 text-center">
            <div className="text-4xl mb-2">📄</div>
            <p className="text-default-500">No status pages yet.</p>
            <p className="text-sm text-default-400">Create your first status page to get started.</p>
          </div>
        ) : (
          pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center gap-4 p-4 bg-background rounded-lg border border-divider hover:border-primary/50 transition-colors"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>

              {/* Page Info */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/admin/status-pages/${page.id}/edit`)}>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground hover:text-primary">{page.name}</span>
                  {page.is_default && (
                    <Chip size="sm" color="primary" variant="flat">Default</Chip>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-default-500">{page.title || page.name}</span>
                </div>
              </div>

              {/* URL */}
              <a
                href={`/status/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1 text-sm text-primary hover:underline font-mono"
              >
                /status/{page.slug}
                <ExternalLink className="w-3 h-3" />
              </a>

              {/* Status Chip */}
              <Chip
                size="sm"
                color={page.is_public ? "success" : "default"}
                variant="flat"
              >
                {page.is_public ? 'Public' : 'Private'}
              </Chip>

              {/* Actions */}
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly size="sm" variant="light">
                    <MoreHorizontal className="w-4 h-4 text-default-500" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Status page actions">
                  <DropdownItem key="edit" onPress={() => navigate(`/admin/status-pages/${page.id}/edit`)}>Edit</DropdownItem>
                  <DropdownItem key="view" onPress={() => window.open(`/status/${page.slug}`, '_blank')}>View Page</DropdownItem>
                  <DropdownItem key="copy" onPress={() => navigator.clipboard.writeText(`${window.location.origin}/status/${page.slug}`)}>Copy URL</DropdownItem>
                  <DropdownItem key="delete" className="text-danger" color="danger" onPress={() => handleDelete(page.id)}>Delete</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          ))
        )}
      </div>
    </div >
  );
}
