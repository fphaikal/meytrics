import { useState, useEffect, type FormEvent } from 'react';
import { getTags, createTag, updateTag, deleteTag } from '../../lib/api';
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
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/react";
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import { ConfirmationModal } from '../ui/ConfirmationModal';

interface Tag {
  id: number;
  name: string;
  color: string;
}

// Predefined color palette
const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#78716c', '#64748b', '#6b7280'
];

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', color: '#6366f1' });

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTags = async () => {
    try {
      const data = await getTags();
      setTags(data);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', color: '#6366f1' });
    setEditingTag(null);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || '#6366f1'
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTag) {
        await updateTag(editingTag.id, formData);
      } else {
        await createTag(formData);
      }
      setShowForm(false);
      resetForm();
      fetchTags();
      toast.success(editingTag ? 'Tag updated successfully' : 'Tag created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save tag');
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
      await deleteTag(deleteId);
      fetchTags();
      toast.success('Tag deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete tag');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-default-500">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Tags.</h1>
        <Button
          color="primary"
          onPress={() => { resetForm(); setShowForm(true); }}
        >
          + Add Tag
        </Button>
      </div>

      <Modal isOpen={showForm} onOpenChange={setShowForm}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editingTag ? 'Edit Tag' : 'Add Tag'}
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleSubmit} id="tag-form" className="flex flex-col gap-4">
                  <Input
                    label="Name"
                    labelPlacement="outside"
                    placeholder="Tag Name"
                    value={formData.name}
                    onValueChange={(value) => setFormData({ ...formData, name: value })}
                    isRequired
                  />
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTE.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color
                            ? 'border-foreground scale-110'
                            : 'border-transparent hover:scale-105'
                            }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border border-divider"
                        style={{ backgroundColor: formData.color }}
                      />
                      <Input
                        size="sm"
                        className="max-w-32"
                        value={formData.color}
                        onValueChange={(value) => setFormData({ ...formData, color: value })}
                        placeholder="#6366f1"
                      />
                    </div>
                  </div>
                </form>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" color="danger" onPress={onClose}>Cancel</Button>
                <Button color="primary" type="submit" form="tag-form" isLoading={saving}>Save</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Tag"
        description="Are you sure you want to delete this tag? This will remove it from all assigned services."
        loading={deleting}
      />

      {tags.length === 0 ? (
        <div className="bg-content1 rounded-xl p-8 text-center">
          <p className="text-default-500">No tags yet. Create one to organize your services.</p>
        </div>
      ) : (
        <Table
          aria-label="Tags table"
          classNames={{
            wrapper: "bg-background rounded-xl border border-divider",
            th: "bg-default-100 text-default-600 font-semibold",
            td: "py-3",
            tr: "hover:bg-content1 transition-colors"
          }}
        >
          <TableHeader>
            <TableColumn>COLOR</TableColumn>
            <TableColumn>NAME</TableColumn>
            <TableColumn align="center">ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell>
                  <div
                    className="w-6 h-6 rounded-full border border-divider"
                    style={{ backgroundColor: tag.color }}
                  />
                </TableCell>
                <TableCell className="font-medium">{tag.name}</TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly size="sm" variant="light">
                          <MoreHorizontal className="w-4 h-4 text-default-500" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Tag actions">
                        <DropdownItem key="edit" startContent={<Pencil className="w-4 h-4" />} onPress={() => handleEdit(tag)}>Edit</DropdownItem>
                        <DropdownItem key="delete" startContent={<Trash2 className="w-4 h-4" />} className="text-danger" color="danger" onPress={() => confirmDelete(tag.id)}>Delete</DropdownItem>
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
