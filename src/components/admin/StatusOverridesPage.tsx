import { useState, useEffect, type FormEvent } from 'react';
import { getStatusOverrides, createStatusOverride, deleteStatusOverride, getServices } from '../../lib/api';
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
  Select,
  SelectItem,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/react";
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import type { StatusOverride, Service } from '../../lib/types';

export function StatusOverridesPage() {
  const [overrides, setOverrides] = useState<StatusOverride[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    service_id: 0,
    status: 'up',
    reason: '',
    start_time: '',
    end_time: ''
  });

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [overridesData, servicesData] = await Promise.all([
        getStatusOverrides(),
        getServices()
      ]);
      setOverrides(overridesData);
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
    setFormData({ service_id: 0, status: 'up', reason: '', start_time: '', end_time: '' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createStatusOverride({
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString()
      });
      setShowForm(false);
      resetForm();
      fetchData();
      toast.success('Status override created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create override');
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
      await deleteStatusOverride(deleteId);
      fetchData();
      toast.success('Override deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete override');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "success" | "warning" | "danger" => {
    switch (status) {
      case 'up': return 'success';
      case 'down': return 'danger';
      case 'degraded': return 'warning';
      case 'maintenance': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-default-500">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Status Overrides.</h1>
        <Button
          color="primary"
          onPress={() => { resetForm(); setShowForm(true); }}
        >
          + Create Override
        </Button>
      </div>

      <Modal isOpen={showForm} onOpenChange={setShowForm} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                Create Status Override
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleSubmit} id="override-form" className="flex flex-col gap-4">
                  <Select
                    label="Service"
                    labelPlacement="outside"
                    selectedKeys={formData.service_id ? [formData.service_id.toString()] : []}
                    onChange={(e) => setFormData({ ...formData, service_id: parseInt(e.target.value) })}
                    placeholder="Select a service..."
                    isRequired
                  >
                    {services.map(s => (
                      <SelectItem key={s.id}>{s.name}</SelectItem>
                    ))}
                  </Select>
                  <Select
                    label="Status"
                    labelPlacement="outside"
                    selectedKeys={[formData.status]}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    isRequired
                  >
                    <SelectItem key="up">Up</SelectItem>
                    <SelectItem key="down">Down</SelectItem>
                    <SelectItem key="degraded">Degraded</SelectItem>
                    <SelectItem key="maintenance">Maintenance</SelectItem>
                  </Select>
                  <Input
                    label="Reason"
                    labelPlacement="outside"
                    value={formData.reason}
                    onValueChange={(value) => setFormData({ ...formData, reason: value })}
                    placeholder="Scheduled maintenance..."
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-small font-medium text-foreground">Start Time</label>
                      <input
                        type="datetime-local"
                        className="px-3 py-2 bg-default-100 hover:bg-default-200 rounded-medium text-small outline-none focus:ring-2 focus:ring-primary transition-colors text-foreground"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-small font-medium text-foreground">End Time</label>
                      <input
                        type="datetime-local"
                        className="px-3 py-2 bg-default-100 hover:bg-default-200 rounded-medium text-small outline-none focus:ring-2 focus:ring-primary transition-colors text-foreground"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </form>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" color="danger" onPress={onClose}>Cancel</Button>
                <Button color="primary" type="submit" form="override-form" isLoading={saving}>Create</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Override"
        description="Are you sure you want to delete this status override? This action cannot be undone."
        loading={deleting}
      />

      {overrides.length === 0 ? (
        <div className="bg-content1 rounded-xl p-8 text-center">
          <p className="text-default-500">No status overrides.</p>
        </div>
      ) : (
        <Table
          aria-label="Status overrides table"
          classNames={{
            wrapper: "bg-background rounded-xl border border-divider",
            th: "bg-default-100 text-default-600 font-semibold",
            td: "py-3",
            tr: "hover:bg-content1 transition-colors"
          }}
        >
          <TableHeader>
            <TableColumn>SERVICE</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>PERIOD</TableColumn>
            <TableColumn>REASON</TableColumn>
            <TableColumn align="center">ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {overrides.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.service_name || `Service ${o.service_id}`}</TableCell>
                <TableCell>
                  <Chip size="sm" color={getStatusColor(o.status)} variant="flat" className="capitalize">
                    {o.status}
                  </Chip>
                </TableCell>
                <TableCell className="text-default-500 text-sm">
                  <div className="whitespace-nowrap">{new Date(o.start_time).toLocaleString()}</div>
                  <div className="text-xs text-default-400">to</div>
                  <div className="whitespace-nowrap">{new Date(o.end_time).toLocaleString()}</div>
                </TableCell>
                <TableCell className="text-default-500 max-w-xs truncate">{o.reason || '-'}</TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly size="sm" variant="light">
                          <MoreHorizontal className="w-4 h-4 text-default-500" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Override actions">
                        <DropdownItem key="delete" startContent={<Trash2 className="w-4 h-4" />} className="text-danger" color="danger" onPress={() => confirmDelete(o.id)}>Delete</DropdownItem>
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
