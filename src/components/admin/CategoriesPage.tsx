import { useState, useEffect, type FormEvent } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../lib/api';
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
import type { Category } from '../../lib/types';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', sort_order: 0 });

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', description: '', sort_order: 0 });
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      sort_order: category.sort_order || 0
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await createCategory(formData);
      }
      setShowForm(false);
      resetForm();
      fetchCategories();
      toast.success(editingCategory ? 'Category updated successfully' : 'Category created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save category');
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
      await deleteCategory(deleteId);
      fetchCategories();
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
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
        <h1 className="text-2xl font-bold text-foreground">Categories.</h1>
        <Button
          color="primary"
          onPress={() => { resetForm(); setShowForm(true); }}
        >
          + Add Category
        </Button>
      </div>

      <Modal isOpen={showForm} onOpenChange={setShowForm}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleSubmit} id="category-form" className="flex flex-col gap-4">
                  <Input
                    label="Name"
                    labelPlacement="outside"
                    placeholder="Category Name"
                    value={formData.name}
                    onValueChange={(value) => setFormData({ ...formData, name: value })}
                    isRequired
                  />
                  <Input
                    label="Description"
                    labelPlacement="outside"
                    placeholder="Optional description"
                    value={formData.description}
                    onValueChange={(value) => setFormData({ ...formData, description: value })}
                  />
                  <Input
                    label="Sort Order"
                    labelPlacement="outside"
                    placeholder="0"
                    type="number"
                    value={formData.sort_order.toString()}
                    onValueChange={(value) => setFormData({ ...formData, sort_order: parseInt(value) || 0 })}
                  />
                </form>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" color="danger" onPress={onClose}>Cancel</Button>
                <Button color="primary" type="submit" form="category-form" isLoading={saving}>Save</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone."
        loading={deleting}
      />

      {categories.length === 0 ? (
        <div className="bg-content1 rounded-xl p-8 text-center">
          <p className="text-default-500">No categories yet. Create one to organize your services.</p>
        </div>
      ) : (
        <Table
          aria-label="Categories table"
          classNames={{
            wrapper: "bg-background rounded-xl border border-divider",
            th: "bg-default-100 text-default-600 font-semibold",
            td: "py-3",
            tr: "hover:bg-content1 transition-colors"
          }}
        >
          <TableHeader>
            <TableColumn>NAME</TableColumn>
            <TableColumn>DESCRIPTION</TableColumn>
            <TableColumn>ORDER</TableColumn>
            <TableColumn align="center">ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="text-default-500">{cat.description || '-'}</TableCell>
                <TableCell className="text-default-500">{cat.sort_order}</TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Dropdown>
                      <DropdownTrigger>
                        <Button isIconOnly size="sm" variant="light">
                          <MoreHorizontal className="w-4 h-4 text-default-500" />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu aria-label="Category actions">
                        <DropdownItem key="edit" startContent={<Pencil className="w-4 h-4" />} onPress={() => handleEdit(cat)}>Edit</DropdownItem>
                        <DropdownItem key="delete" startContent={<Trash2 className="w-4 h-4" />} className="text-danger" color="danger" onPress={() => confirmDelete(cat.id)}>Delete</DropdownItem>
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
