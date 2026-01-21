import { useState, useEffect, type FormEvent } from 'react';
import { getMaintenances, createMaintenance, updateMaintenance, deleteMaintenance, getServices } from '../../lib/api';
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
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/react";
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import type { Maintenance, Service } from '../../lib/types';

export function MaintenancesPage() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    service_ids: [] as number[]
  });

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [maintenancesData, servicesData] = await Promise.all([
        getMaintenances(),
        getServices()
      ]);
      setMaintenances(maintenancesData);
      setServices(servicesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '', description: '', start_time: '', end_time: '', service_ids: []
    });
    setEditingMaintenance(null);
  };

  const handleEdit = (maintenance: Maintenance) => {
    setEditingMaintenance(maintenance);
    setFormData({
      title: maintenance.title,
      description: maintenance.description || '',
      start_time: maintenance.start_time?.slice(0, 16) || '',
      end_time: maintenance.end_time?.slice(0, 16) || '',
      service_ids: maintenance.service_ids || []
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString()
      };
      if (editingMaintenance) {
        await updateMaintenance(editingMaintenance.id, data);
      } else {
        await createMaintenance(data);
      }
      setShowForm(false);
      resetForm();
      fetchData();
      toast.success(editingMaintenance ? 'Maintenance updated successfully' : 'Maintenance scheduled successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save maintenance');
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
      await deleteMaintenance(deleteId);
      fetchData();
      toast.success('Maintenance deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete maintenance');
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

  if (loading) {
    return <div className="text-center py-8 text-default-500">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Maintenance.</h1>
        <Button
          color="primary"
          onPress={() => { resetForm(); setShowForm(true); }}
        >
          + Schedule Maintenance
        </Button>
      </div>

      <Modal isOpen={showForm} onOpenChange={setShowForm} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editingMaintenance ? 'Edit Maintenance' : 'Schedule Maintenance'}
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleSubmit} id="maintenance-form" className="space-y-4">
                  <Input
                    label="Title"
                    labelPlacement="outside"
                    value={formData.title}
                    placeholder="Enter your title"
                    onValueChange={(value) => setFormData({ ...formData, title: value })}
                    isRequired
                  />
                  <Textarea
                    label="Description"
                    labelPlacement="outside"
                    value={formData.description}
                    placeholder="Enter your description"
                    onValueChange={(value) => setFormData({ ...formData, description: value })}
                    minRows={3}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="datetime-local"
                      label="Start Time"
                      placeholder="Enter your start time"
                      labelPlacement="outside"
                      value={formData.start_time}
                      onValueChange={(value) => setFormData({ ...formData, start_time: value })}
                      isRequired
                    />
                    <Input
                      type="datetime-local"
                      label="End Time"
                      placeholder="Enter your end time"
                      labelPlacement="outside"
                      value={formData.end_time}
                      onValueChange={(value) => setFormData({ ...formData, end_time: value })}
                      isRequired
                    />
                  </div>
                  <div>
                    <label className="block text-small font-medium text-foreground pb-2">Affected Services</label>
                    <div className="flex flex-wrap gap-2">
                      {services.map(service => (
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
                </form>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" color="danger" onPress={onClose}>Cancel</Button>
                <Button color="primary" type="submit" form="maintenance-form" isLoading={saving}>Save</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Maintenance"
        description="Are you sure you want to delete this maintenance schedule? This action cannot be undone."
        loading={deleting}
      />

      {maintenances.length === 0 ? (
        <div className="bg-content1 rounded-xl p-8 text-center">
          <p className="text-default-500">No scheduled maintenances.</p>
        </div>
      ) : (
        <Table
          aria-label="Maintenances table"
          classNames={{
            wrapper: "bg-background rounded-xl border border-divider",
            th: "bg-default-100 text-default-600 font-semibold",
            td: "py-3",
            tr: "hover:bg-content1 transition-colors"
          }}
        >
          <TableHeader>
            <TableColumn>TITLE</TableColumn>
            <TableColumn>DESCRIPTION</TableColumn>
            <TableColumn>AFFECTED SERVICES</TableColumn>
            <TableColumn>PERIOD</TableColumn>
            <TableColumn align="center">ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {maintenances.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.title}</TableCell>
                <TableCell className="text-default-500 max-w-xs truncate">{m.description}</TableCell>
                <TableCell>
                  {m.affected_services && m.affected_services.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {m.affected_services.map((name, i) => (
                        <Chip key={i} size="sm" variant="flat">{name}</Chip>
                      ))}
                    </div>
                  ) : (
                    <span className="text-default-400 text-xs italic">None</span>
                  )}
                </TableCell>
                <TableCell className="text-default-500 text-sm">
                  <div className="whitespace-nowrap">{new Date(m.start_time).toLocaleString()}</div>
                  <div className="text-xs text-default-400">to</div>
                  <div className="whitespace-nowrap">{new Date(m.end_time).toLocaleString()}</div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly size="sm" variant="light">
                          <MoreHorizontal className="w-4 h-4 text-default-500" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Maintenance actions">
                        <DropdownItem key="edit" startContent={<Pencil className="w-4 h-4" />} onPress={() => handleEdit(m)}>Edit</DropdownItem>
                        <DropdownItem key="delete" startContent={<Trash2 className="w-4 h-4" />} className="text-danger" color="danger" onPress={() => confirmDelete(m.id)}>Delete</DropdownItem>
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
