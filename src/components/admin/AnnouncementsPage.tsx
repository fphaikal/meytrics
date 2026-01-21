import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getIncidents, getServices, createIncident, updateIncident, deleteIncident, addIncidentUpdate } from '../../lib/api';
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
  Textarea,
  Select,
  SelectItem,
  Chip,
  Badge,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/react";
import { toast } from 'sonner';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { MessageSquarePlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Incident, Service } from '../../lib/types';

export function AnnouncementsPage() {
  const queryClient = useQueryClient();

  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: getIncidents,
    refetchInterval: 30000
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: getServices
  });

  const incidentsList = incidents as Incident[];
  const servicesList = services as Service[];

  const [showForm, setShowForm] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);

  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'investigating',
    severity: 'minor',
    service_ids: [] as number[]
  });

  // Update form state
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');

  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingIncident) {
        await updateIncident(editingIncident.id, formData);
      } else {
        await createIncident(formData);
      }
      setShowForm(false);
      setEditingIncident(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success(editingIncident ? 'Announcement updated successfully' : 'Announcement created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save incident');
    } finally {
      setSaving(false);
    }
  };

  const openUpdateModal = (incidentId: number) => {
    setSelectedIncidentId(incidentId);
    setUpdateMessage('');
    setUpdateStatus('');
    setShowUpdateModal(true);
  };

  const handleAddUpdate = async () => {
    if (!selectedIncidentId || !updateMessage.trim()) return;
    setSaving(true);
    try {
      await addIncidentUpdate(selectedIncidentId, {
        message: updateMessage,
        status: updateStatus || undefined
      });
      setShowUpdateModal(false);
      setUpdateMessage('');
      setUpdateStatus('');
      setSelectedIncidentId(null);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Update posted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add update');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'investigating',
      severity: 'minor',
      service_ids: []
    });
  };

  const handleEdit = (incident: Incident) => {
    setEditingIncident(incident);
    setFormData({
      title: incident.title,
      description: incident.description || '',
      status: incident.status,
      severity: incident.severity,
      service_ids: incident.service_ids || []
    });
    setShowForm(true);
  };

  const confirmDelete = (id: number) => {
    setDeleteId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteIncident(deleteId);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete incident');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const toggleService = (serviceId: number) => {
    setFormData(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId]
    }));
  };

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "success" | "warning" | "danger" => {
    switch (status) {
      case 'investigating': return 'warning';
      case 'identified': return 'warning';
      case 'monitoring': return 'primary';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string): "default" | "primary" | "secondary" | "success" | "warning" | "danger" => {
    switch (severity) {
      case 'critical': return 'danger';
      case 'major': return 'warning';
      case 'minor': return 'default'; // or just default/primary
      default: return 'default';
    }
  };

  if (incidentsLoading) {
    return <div className="p-6 text-center text-default-500">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Announcements.</h1>
        <Button
          color="primary"
          onPress={() => { setShowForm(true); setEditingIncident(null); resetForm(); }}
        >
          + New Announcement
        </Button>
      </div>

      {/* Main Form Modal */}
      <Modal isOpen={showForm} onOpenChange={setShowForm} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editingIncident ? 'Edit Announcement' : 'New Announcement'}
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleSubmit} id="announcement-form" className="space-y-4">
                  <Input
                    label="Title"
                    labelPlacement="outside"
                    value={formData.title}
                    onValueChange={(value) => setFormData({ ...formData, title: value })}
                    isRequired
                    placeholder="Scheduled Maintenance"
                  />
                  <Textarea
                    label="Description"
                    labelPlacement="outside"
                    value={formData.description}
                    onValueChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Describe the announcement..."
                    minRows={3}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Status"
                      labelPlacement="outside"
                      selectedKeys={[formData.status]}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <SelectItem key="investigating">Investigating</SelectItem>
                      <SelectItem key="identified">Identified</SelectItem>
                      <SelectItem key="monitoring">Monitoring</SelectItem>
                      <SelectItem key="resolved">Resolved</SelectItem>
                    </Select>
                    <Select
                      label="Severity"
                      labelPlacement="outside"
                      selectedKeys={[formData.severity]}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    >
                      <SelectItem key="minor">Minor</SelectItem>
                      <SelectItem key="major">Major</SelectItem>
                      <SelectItem key="critical">Critical</SelectItem>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-small font-medium text-foreground pb-2">Affected Services</label>
                    <div className="flex flex-wrap gap-2">
                      {servicesList.map((service: Service) => (
                        <Button
                          key={service.id}
                          size="sm"
                          variant={formData.service_ids.includes(service.id) ? "solid" : "bordered"}
                          color={formData.service_ids.includes(service.id) ? "primary" : "default"}
                          onPress={() => toggleService(service.id)}
                        >
                          {service.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Updates Timeline */}
                  {editingIncident && editingIncident.updates && editingIncident.updates.length > 0 && (
                    <div className="border-t border-default-200 pt-4 mt-2">
                      <h4 className="text-small font-medium text-foreground mb-3">Timeline</h4>
                      <div className="space-y-3 pl-2">
                        {editingIncident.updates.map((update: any) => (
                          <div key={update.id} className="relative pl-4 border-l border-default-200 pb-2 last:pb-0 last:border-l-0">
                            <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background"></div>
                            <div>
                              <p className="text-foreground text-sm">{update.message}</p>
                              <p className="text-default-400 text-xs mt-0.5">
                                {new Date(update.created_at).toLocaleString()}
                                {update.status && ` • Status changed to ${update.status}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" form="announcement-form" isLoading={saving}>
                  {editingIncident ? 'Update' : 'Create'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Add Update Modal */}
      <Modal isOpen={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Post Update</ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Textarea
                    label="Message"
                    labelPlacement="outside"
                    value={updateMessage}
                    onValueChange={setUpdateMessage}
                    placeholder="What's the latest update?"
                    minRows={3}
                  />
                  <Select
                    label="New Status (Optional)"
                    labelPlacement="outside"
                    placeholder="Keep current status"
                    selectedKeys={updateStatus ? [updateStatus] : []}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                  >
                    <SelectItem key="investigating">Investigating</SelectItem>
                    <SelectItem key="identified">Identified</SelectItem>
                    <SelectItem key="monitoring">Monitoring</SelectItem>
                    <SelectItem key="resolved">Resolved</SelectItem>
                  </Select>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancel</Button>
                <Button color="primary" onPress={handleAddUpdate} isLoading={saving}>Post Update</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Announcement"
        description="Are you sure you want to delete this announcement? This action cannot be undone."
        loading={deleting}
      />

      {/* Announcements Table */}
      {/* Announcements Table */}
      {incidentsList.length === 0 ? (
        <div className="bg-content1 rounded-xl p-8 text-center text-default-500">
          No announcements yet.
        </div>
      ) : (
        <Table
          aria-label="Announcements table"
          classNames={{
            wrapper: "bg-background rounded-xl border border-divider",
            th: "bg-default-100 text-default-600 font-semibold",
            td: "py-3",
            tr: "hover:bg-content1 transition-colors"
          }}
        >
          <TableHeader>
            <TableColumn>TITLE</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>SEVERITY</TableColumn>
            <TableColumn>UPDATES</TableColumn>
            <TableColumn>DATE</TableColumn>
            <TableColumn align="center">ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {incidentsList.map((incident: Incident) => (
              <TableRow key={incident.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="text-foreground font-semibold">{incident.title}</div>
                    <div className="text-default-500 text-xs truncate max-w-xs">{incident.description}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Chip color={getStatusColor(incident.status)} size="sm" variant="flat" className="capitalize">
                    {incident.status}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip color={getSeverityColor(incident.severity)} size="sm" variant="flat" className="capitalize">
                    {incident.severity}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Badge content={incident.updates?.length || 0} color="primary" size="sm" shape="circle" isInvisible={!incident.updates || incident.updates.length === 0}>
                      <MessageSquarePlus className="w-5 h-5 text-default-400" />
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-default-500 text-sm">
                  {new Date(incident.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly size="sm" variant="light">
                          <MoreHorizontal className="w-4 h-4 text-default-500" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Announcement actions">
                        <DropdownItem key="update" startContent={<MessageSquarePlus className="w-4 h-4" />} onPress={() => openUpdateModal(incident.id)} className={incident.status === 'resolved' ? 'hidden' : ''}>Post Update</DropdownItem>
                        <DropdownItem key="edit" startContent={<Pencil className="w-4 h-4" />} onPress={() => handleEdit(incident)}>Edit</DropdownItem>
                        <DropdownItem key="delete" startContent={<Trash2 className="w-4 h-4" />} className="text-danger" color="danger" onPress={() => confirmDelete(incident.id)}>Delete</DropdownItem>
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
