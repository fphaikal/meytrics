import { useState, useEffect, type FormEvent } from 'react';
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, getAlertHistory, getSettings, updateSettings, testSmtp } from '../../lib/api';
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

  Select,
  SelectItem,
  Tabs,
  Tab,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "@heroui/react";
import { Pencil, Trash2, Zap, Webhook as WebhookIcon, Send, Hash, MessageSquare, Mail, MoreHorizontal } from 'lucide-react';
import { toast } from '../../lib/toast';
import { ConfirmationModal } from '../ui/ConfirmationModal';

import type { Webhook, AlertHistory, Settings } from '../../lib/types';

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

  // SMTP State
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [testEmail, setTestEmail] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);

  // We no longer need separate tabs or complex state for SMTP, it will be integrated into the table/modal
  const [activeTab, setActiveTab] = useState("config");

  // SMTP State


  const fetchWebhooks = async () => {
    try {
      const [webhooksData, settingsData] = await Promise.all([
        getWebhooks(),
        getSettings()
      ]);
      setSettings(settingsData);

      // Only show SMTP in table if it is actually configured (has a host)
      if (settingsData.smtp_host) {
        const smtpIntegration: Webhook = {
          id: -1,
          name: 'Email Notifications (SMTP)',
          type: 'smtp' as any,
          url: settingsData.notification_emails || 'No recipients configured',
          events: ['status_change', 'incident_created', 'incident_resolved', 'maintenance_scheduled'],
          enabled: true,
          created_at: new Date().toISOString(),
          headers: {},
          config: {
            smtp_host: settingsData.smtp_host,
            smtp_port: settingsData.smtp_port,
            smtp_user: settingsData.smtp_user,
            smtp_pass: settingsData.smtp_pass,
            smtp_from: settingsData.smtp_from,
            smtp_from_name: settingsData.smtp_from_name,
            notification_emails: settingsData.notification_emails
          }
        };
        setWebhooks([...webhooksData, smtpIntegration]);
      } else {
        setWebhooks(webhooksData);
      }
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

  // Remove separate fetchSettings and handleSmtpSubmit as they are now integrated

  const handleTestSmtp = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }
    setTestingSmtp(true);
    try {
      await testSmtp(testEmail, settings as Record<string, string>);
      toast.success('Test email sent successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send test email');
    } finally {
      setTestingSmtp(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', url: '', events: ['status_change'], enabled: true, type: 'custom',
      telegram_bot_token: '', telegram_chat_id: ''
    });
    setEditingWebhook(null);
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);

    if (webhook.type === 'smtp') {
      // Load SMTP settings into settings state for the modal
      // We don't map to formData exactly because the structure is different
      // but we need to set the type in formData to switch the modal view
      setFormData({
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        enabled: webhook.enabled,
        type: 'smtp',
        telegram_bot_token: '',
        telegram_chat_id: ''
      });
      // Ensure local settings state is up to date (it should be from fetch)
    } else {
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
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (formData.type === 'smtp') {
        // Special handling for SMTP
        await updateSettings(settings as Record<string, string>);
        toast.success('SMTP settings saved successfully');
      } else {
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

        if (editingWebhook && editingWebhook.id !== -1) {
          await updateWebhook(editingWebhook.id, dataToSubmit);
        } else {
          await createWebhook(dataToSubmit);
        }
      }
      setShowForm(false);
      resetForm();
      fetchWebhooks(); // Reloads both standard webhooks and the synthetic SMTP one
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
      if (deleteId === -1) {
        // Special handling for SMTP "delete" - maybe just clear the settings?
        // For now let's just clear the notification emails and enabled-like fields?
        // Or honestly, just don't allow "delete" from the UI if it's weird, but user asked for it.
        // Let's clear the host/user/pass fields to "disable" it.
        await updateSettings({
          smtp_host: '',
          smtp_port: '',
          smtp_user: '',
          smtp_pass: '',
          smtp_from: '',
          notification_emails: ''
        });
        toast.success('SMTP settings cleared');
      } else {
        await deleteWebhook(deleteId);
        toast.success('Integration deleted successfully');
      }
      fetchWebhooks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete integration');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleTest = async (id: number) => {
    try {
      if (id === -1) {
        // Test SMTP
        // We need a target email. If settings.notification_emails is set, use the first one.
        // Or prompt user? For quick test button, maybe use notification_emails.
        const emails = settings.notification_emails?.split(',');
        const target = emails && emails.length > 0 ? emails[0].trim() : '';
        if (!target) {
          toast.error('Configure notification emails to test SMTP');
          return;
        }
        await testSmtp(target, settings as Record<string, string>);
      } else {
        await testWebhook(id);
      }
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
                    <SelectItem key="smtp" startContent={<Mail className="w-4 h-4" />}>Email (SMTP)</SelectItem>
                  </Select>

                  <Input
                    label="Name"
                    labelPlacement="outside"
                    placeholder="e.g. Production Alerts"
                    value={formData.name}
                    onValueChange={(value) => setFormData({ ...formData, name: value })}
                    isRequired
                  />

                  {formData.type === 'smtp' ? (
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="SMTP Host"
                          placeholder="smtp.gmail.com"
                          labelPlacement="outside"
                          value={settings.smtp_host || ''}
                          onValueChange={(value) => setSettings({ ...settings, smtp_host: value })}
                        />
                        <Input
                          label="SMTP Port"
                          placeholder="587"
                          labelPlacement="outside"
                          value={settings.smtp_port || ''}
                          onValueChange={(value) => setSettings({ ...settings, smtp_port: value })}
                        />
                      </div>
                      <Input
                        label="SMTP Username"
                        placeholder="your@gmail.com"
                        labelPlacement="outside"
                        value={settings.smtp_user || ''}
                        onValueChange={(value) => setSettings({ ...settings, smtp_user: value })}
                      />
                      <Input
                        label="SMTP Password"
                        placeholder="App password"
                        type="password"
                        labelPlacement="outside"
                        value={settings.smtp_pass || ''}
                        onValueChange={(value) => setSettings({ ...settings, smtp_pass: value })}
                        description="For Gmail, use an App Password"
                      />
                      <Input
                        label="From Email"
                        placeholder="noreply@yourdomain.com"
                        type="email"
                        labelPlacement="outside"
                        value={settings.smtp_from || ''}
                        onValueChange={(value) => setSettings({ ...settings, smtp_from: value })}
                      />
                      <Input
                        label="From Name"
                        placeholder="MEYTRICS Alerts"
                        labelPlacement="outside"
                        value={settings.smtp_from_name || ''}
                        onValueChange={(value) => setSettings({ ...settings, smtp_from_name: value })}
                      />
                      <Input
                        label="Notification Emails"
                        placeholder="admin@example.com, team@example.com"
                        value={settings.notification_emails || ''}
                        labelPlacement="outside"
                        onValueChange={(value) => setSettings({ ...settings, notification_emails: value })}
                        description="Comma-separated list of email addresses"
                      />
                      <div className="flex gap-2 pt-2 items-end">
                        <Input
                          label="Test Email"
                          placeholder="Test email address"
                          type="email"
                          labelPlacement="outside"
                          value={testEmail}
                          onValueChange={setTestEmail}
                          className="flex-1"
                        />
                        <Button
                          onPress={handleTestSmtp}
                          disabled={testingSmtp}
                          isLoading={testingSmtp}
                          color="secondary"
                          className="mb-0.5"
                        >
                          Test SMTP
                        </Button>
                      </div>
                    </div>
                  ) : formData.type === 'telegram' ? (
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

                  {formData.type !== 'smtp' && (
                    <>
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
                    </>
                  )}
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
