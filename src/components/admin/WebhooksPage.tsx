import { useState, useEffect, type FormEvent } from 'react';
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook } from '../../lib/api';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Checkbox,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/react";
import { MoreHorizontal, Pencil, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import type { Webhook } from '../../lib/types';

export function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: ['status_change'] as string[],
    enabled: true
  });

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchWebhooks = async () => {
    try {
      const data = await getWebhooks();
      setWebhooks(data);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', url: '', events: ['status_change'], enabled: true });
    setEditingWebhook(null);
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events || ['status_change'],
      enabled: webhook.enabled
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingWebhook) {
        await updateWebhook(editingWebhook.id, formData);
      } else {
        await createWebhook(formData);
      }
      setShowForm(false);
      resetForm();
      fetchWebhooks();
      toast.success(editingWebhook ? 'Webhook updated successfully' : 'Webhook created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save webhook');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteWebhook(deleteId);
      fetchWebhooks();
      toast.success('Webhook deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete webhook');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleTest = async (id: number) => {
    try {
      await testWebhook(id);
      toast.success('Test webhook sent successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to test webhook');
    }
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  if (loading) {
    return <div className="text-center py-8 text-default-500">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Webhooks.</h1>
        <Button
          color="primary"
          onPress={() => { resetForm(); setShowForm(true); }}
        >
          + Add Webhook
        </Button>
      </div>

      <Modal isOpen={showForm} onOpenChange={setShowForm}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editingWebhook ? 'Edit Webhook' : 'Add Webhook'}
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleSubmit} id="webhook-form" className="flex flex-col gap-4">
                  <Input
                    label="Name"
                    labelPlacement="outside"
                    placeholder="Enter name webhook"
                    value={formData.name}
                    onValueChange={(value) => setFormData({ ...formData, name: value })}
                    isRequired
                  />
                  <Input
                    label="URL"
                    labelPlacement="outside"
                    type="url"
                    value={formData.url}
                    onValueChange={(value) => setFormData({ ...formData, url: value })}
                    isRequired
                    placeholder="https://..."
                    description="Endpoint must accept HTTP POST requests"
                  />
                  <div>
                    <label className="block text-small font-medium text-foreground pb-2">Events</label>
                    <div className="flex flex-wrap gap-2">
                      {['status_change', 'incident_created', 'incident_resolved', 'maintenance_scheduled'].map(event => (
                        <Button
                          key={event}
                          size="sm"
                          variant={formData.events.includes(event) ? "solid" : "bordered"}
                          color={formData.events.includes(event) ? "primary" : "default"}
                          onPress={() => toggleEvent(event)}
                        >
                          {event.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      isSelected={formData.enabled}
                      onValueChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    >
                      Enabled
                    </Checkbox>
                  </div>
                </form>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" color="danger" onPress={onClose}>Cancel</Button>
                <Button color="primary" type="submit" form="webhook-form" isLoading={saving}>Save</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Webhook"
        description="Are you sure you want to delete this webhook? This action cannot be undone."
        loading={deleting}
      />

      {webhooks.length === 0 ? (
        <div className="bg-content1 rounded-xl p-8 text-center">
          <p className="text-default-500">No webhooks configured yet.</p>
        </div>
      ) : (
        <Table
          aria-label="Webhooks table"
          classNames={{
            wrapper: "bg-background rounded-xl border border-divider",
            th: "bg-default-100 text-default-600 font-semibold",
            td: "py-3",
            tr: "hover:bg-content1 transition-colors"
          }}
        >
          <TableHeader>
            <TableColumn>NAME</TableColumn>
            <TableColumn>URL</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn align="center">ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {webhooks.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.name}</TableCell>
                <TableCell className="text-default-500 text-sm font-mono truncate max-w-xs">{w.url}</TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    color={w.enabled ? "success" : "default"}
                    variant="flat"
                  >
                    {w.enabled ? 'Enabled' : 'Disabled'}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly size="sm" variant="light">
                          <MoreHorizontal className="w-4 h-4 text-default-500" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Webhook actions">
                        <DropdownItem key="test" startContent={<Zap className="w-4 h-4" />} onPress={() => handleTest(w.id)}>Test</DropdownItem>
                        <DropdownItem key="edit" startContent={<Pencil className="w-4 h-4" />} onPress={() => handleEdit(w)}>Edit</DropdownItem>
                        <DropdownItem key="delete" startContent={<Trash2 className="w-4 h-4" />} className="text-danger" color="danger" onPress={() => confirmDelete(w.id)}>Delete</DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
