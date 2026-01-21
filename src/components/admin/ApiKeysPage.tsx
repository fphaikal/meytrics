import { useState, useEffect, type FormEvent } from 'react';
import { getApiKeys, createApiKey, updateApiKey, deleteApiKey } from '../../lib/api';
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
  Chip
} from "@heroui/react";
import { toast } from 'sonner';
import type { ApiKey } from '../../lib/types';

export function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState<{ id: number; key: string } | null>(null);

  const fetchApiKeys = async () => {
    try {
      const data = await getApiKeys();
      setApiKeys(data);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await createApiKey({ name: newKeyName, permissions: ['read'] });
      setNewKey(result);
      setNewKeyName('');
      fetchApiKeys();
      toast.success('API key created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create API key');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (key: ApiKey) => {
    try {
      await updateApiKey(key.id, { enabled: !key.enabled });
      fetchApiKeys();
      toast.success(key.enabled ? 'API key disabled' : 'API key enabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update API key');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    try {
      await deleteApiKey(id);
      fetchApiKeys();
      toast.success('API key deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (loading) {
    return <div className="text-center py-8 text-default-500">Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">API Keys.</h1>
        <Button
          color="primary"
          onPress={() => setShowForm(true)}
        >
          + Create API Key
        </Button>
      </div>

      <Modal isOpen={showForm} onOpenChange={setShowForm}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                Create API Key
              </ModalHeader>
              <ModalBody>
                {!newKey ? (
                  <form id="apikey-form" onSubmit={handleCreate} className="space-y-4">
                    <Input
                      label="Name"
                      labelPlacement="outside"
                      value={newKeyName}
                      onValueChange={setNewKeyName}
                      isRequired
                      placeholder="My API Key"
                    />
                  </form>
                ) : (
                  <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
                    <p className="text-sm text-success-700 dark:text-success-400 font-medium mb-2">
                      Your new API key (copy it now, it won't be shown again):
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-default-100 px-3 py-2 rounded font-mono text-sm break-all">
                        {newKey.key}
                      </div>
                      <Button size="sm" onPress={() => copyToClipboard(newKey.key)}>Copy</Button>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                {!newKey ? (
                  <>
                    <Button variant="light" color="danger" onPress={onClose}>Cancel</Button>
                    <Button color="primary" type="submit" form="apikey-form" isLoading={saving}>Create</Button>
                  </>
                ) : (
                  <Button color="primary" onPress={onClose}>Done</Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {apiKeys.length === 0 ? (
        <div className="bg-content1 rounded-xl p-8 text-center">
          <p className="text-default-500">No API keys yet.</p>
        </div>
      ) : (
        <div className="border border-default-200 rounded-xl overflow-hidden shadow-sm">
          <Table removeWrapper aria-label="API Keys table">
            <TableHeader>
              <TableColumn>Name</TableColumn>
              <TableColumn>Key</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Last Used</TableColumn>
              <TableColumn align="end">Actions</TableColumn>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="font-mono text-sm text-default-500">{key.key}</TableCell>
                  <TableCell>
                    <Chip size="sm" color={key.enabled ? "success" : "default"} variant="flat">
                      {key.enabled ? 'Active' : 'Disabled'}
                    </Chip>
                  </TableCell>
                  <TableCell className="text-default-500 text-sm">
                    {key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="light" color="primary" onPress={() => handleToggle(key)}>
                        {key.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="sm" variant="light" color="danger" onPress={() => handleDelete(key.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
