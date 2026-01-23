import { useState, useEffect, type FormEvent } from 'react';
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, getAlertHistory } from '../../lib/api';
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
  DropdownItem,
  Select,
  SelectItem,
  Tabs,
  Tab
} from "@heroui/react";
import { MoreHorizontal, Pencil, Trash2, Zap, Webhook as WebhookIcon, Send, Hash, MessageSquare } from 'lucide-react';
import { toast } from '../../lib/toast';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import type { Webhook, AlertHistory } from '../../lib/types';

export function IntegrationsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: ['status_change'] as string[],
    enabled: true,
    type: 'custom',
    telegram_bot_token: '',
    telegram_chat_id: ''
  });

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Alert History state
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("config");

  const fetchWebhooks = async () => {
    try {
      const data = await getWebhooks();
      setWebhooks(data);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await getAlertHistory();
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch alert history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
    fetchHistory();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '', url: '', events: ['status_change'], enabled: true, type: 'custom',
      telegram_bot_token: '', telegram_chat_id: ''
    });
    setEditingWebhook(null);
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);

    let config: any = {};
    if (webhook.config) {
      try {
        config = typeof webhook.config === 'string' ? JSON.parse(webhook.config) : webhook.config;
      } catch (e) { console.error("Error parsing config", e); }
    }

    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events || ['status_change'],
      enabled: webhook.enabled,
      type: webhook.type || 'custom',
      telegram_bot_token: config.telegram_bot_token || '',
      telegram_chat_id: config.telegram_chat_id || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dataToSubmit: any = {
        name: formData.name,
        events: formData.events,
        enabled: formData.enabled,
        type: formData.type,
        config: {}
      };

      if (formData.type === 'telegram') {
        dataToSubmit.url = `https://api.telegram.org/bot${formData.telegram_bot_token}/sendMessage`;
        dataToSubmit.config = {
          telegram_bot_token: formData.telegram_bot_token,
          telegram_chat_id: formData.telegram_chat_id
        };
      } else {
        dataToSubmit.url = formData.url;
      }

      if (editingWebhook) {
        await updateWebhook(editingWebhook.id, dataToSubmit);
      } else {
        await createWebhook(dataToSubmit);
      }
      setShowForm(false);
      resetForm();
      fetchWebhooks();
      toast.success(editingWebhook ? 'Integration updated successfully' : 'Integration created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save integration');
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
      toast.success('Integration deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete integration');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleTest = async (id: number) => {
    try {
      await testWebhook(id);
      toast.success('Test integration sent successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to test integration');
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
        <h1 className="text-2xl font-bold text-foreground">Integrations.</h1>
        <Button
          color="primary"
          onPress={() => { resetForm(); setShowForm(true); }}
        >
          + Add Integration
        </Button>
      </div>

      <Modal isOpen={showForm} onOpenChange={setShowForm}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editingWebhook ? 'Edit Integration' : 'Add Integration'}
              </ModalHeader>
              <ModalBody>
                <form onSubmit={handleSubmit} id="webhook-form" className="flex flex-col gap-4">
                  <Select
                    label="Type"
                    labelPlacement="outside"
                    placeholder="Select integration type"
                    selectedKeys={formData.type ? [formData.type] : ['custom']}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    disallowEmptySelection
                  >
                    <SelectItem key="custom" startContent={<WebhookIcon className="w-4 h-4" />}>Webhook</SelectItem>
                    <SelectItem key="telegram" startContent={<Send className="w-4 h-4" />}>Telegram</SelectItem>
                    <SelectItem key="slack" startContent={<Hash className="w-4 h-4" />}>Slack</SelectItem>
                    <SelectItem key="discord" startContent={<MessageSquare className="w-4 h-4" />}>Discord</SelectItem>
                  </Select>

                  <Input
                    label="Name"
                    labelPlacement="outside"
                    placeholder="e.g. Production Alerts"
                    value={formData.name}
                    onValueChange={(value) => setFormData({ ...formData, name: value })}
                    isRequired
                  />

                  {formData.type === 'telegram' ? (
                    <>
                      <Input
                        label="Bot Token"
                        labelPlacement="outside"
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                        value={formData.telegram_bot_token || ''}
                        onValueChange={(value) => setFormData({ ...formData, telegram_bot_token: value })}
                        isRequired
                        description={
                          <span>
                            Start a chat with <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-primary hover:underline">@BotFather</a> to create a bot and get the token.
                          </span>
                        }
                      />
                      <Input
                        label="Chat ID"
                        labelPlacement="outside"
                        placeholder="-100123456789"
                        value={formData.telegram_chat_id || ''}
                        onValueChange={(value) => setFormData({ ...formData, telegram_chat_id: value })}
                        isRequired
                        description={
                          <span>
                            Use <a href="https://t.me/getmyid_bot" target="_blank" rel="noreferrer" className="text-primary hover:underline">@getmyid_bot</a> or add your bot to a group to get the Chat ID.
                          </span>
                        }
                      />
                    </>
                  ) : (
                    <Input
                      label={formData.type === 'custom' ? "Webhook URL" : "Webhook URL"}
                      labelPlacement="outside"
                      type="url"
                      value={formData.url}
                      onValueChange={(value) => setFormData({ ...formData, url: value })}
                      isRequired
                      placeholder={formData.type === 'custom' ? "https://..." : "https://hooks.slack.com/services/..."}
                      description={
                        formData.type === 'discord'
                          ? "Discord Webhook URL (Server Settings > Integrations > Webhooks)"
                          : formData.type === 'slack'
                            ? "Slack Incoming Webhook URL"
                            : "Endpoint must accept HTTP POST requests"
                      }
                    />
                  )}

                  <div>
                    <label className="block text-small font-medium text-foreground pb-2">Trigger Events</label>
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
        title="Delete Integration"
        description="Are you sure you want to delete this integration? This action cannot be undone."
        loading={deleting}
      />

      <div className="tabs-wrapper-force w-full mb-6">
        <Tabs
          aria-label="Integration options"
          variant="underlined"
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          classNames={{
            tabList: "gap-6 relative rounded-none p-0 border-b border-divider",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-12",
            tabContent: "group-data-[selected=true]:text-primary"
          }}
        >
          <Tab key="config" title="Configuration">
            {webhooks.length === 0 ? (
              <div className="bg-content1 rounded-xl p-8 text-center text-default-500">
                <p>No integrations configured yet.</p>
              </div>
            ) : (
              <Table
                aria-label="Integrations table"
                classNames={{
                  wrapper: "bg-background rounded-xl border border-divider",
                  th: "bg-default-100 text-default-600 font-semibold",
                  td: "py-3",
                  tr: "hover:bg-content1 transition-colors"
                }}
              >
                <TableHeader>
                  <TableColumn>NAME</TableColumn>
                  <TableColumn>TYPE</TableColumn>
                  <TableColumn>URL / TARGET</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn align="center">ACTIONS</TableColumn>
                </TableHeader>
                <TableBody>
                  {webhooks.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color="primary" className="capitalize">
                          {w.type || 'Custom'}
                        </Chip>
                      </TableCell>
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
                            <DropdownMenu aria-label="Integration actions">
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
          </Tab>
          <Tab key="history" title="Alert History">
            <div className="flex justify-end mb-4">
              <Button
                size="sm"
                variant="flat"
                onPress={fetchHistory}
                isLoading={historyLoading}
                startContent={<Zap className="w-3 h-3" />}
              >
                Refresh
              </Button>
            </div>

            {history.length === 0 ? (
              <div className="bg-content1 rounded-xl p-8 text-center text-default-500">
                <p>No alert history found.</p>
              </div>
            ) : (
              <Table
                aria-label="Alert history table"
                classNames={{
                  wrapper: "bg-background rounded-xl border border-divider",
                  th: "bg-default-100 text-default-600 font-semibold",
                  td: "py-3",
                  tr: "hover:bg-content1 transition-colors"
                }}
              >
                <TableHeader>
                  <TableColumn>TIME</TableColumn>
                  <TableColumn>SERVICE</TableColumn>
                  <TableColumn>TYPE</TableColumn>
                  <TableColumn>MESSAGE</TableColumn>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="whitespace-nowrap text-default-500">
                        {new Date(h.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {h.service_name || 'Unknown Service'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={h.type.includes('down') ? 'danger' : 'success'}
                          className="capitalize"
                        >
                          {h.type}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm truncate max-w-md block" title={h.message}>
                          {h.message}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
