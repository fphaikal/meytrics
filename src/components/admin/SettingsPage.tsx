import { useState, useEffect, type FormEvent } from 'react';
import { getSettings, updateSettings, testSmtp } from '../../lib/api';
import type { Settings } from '../../lib/types';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Card,
  CardBody
} from "@heroui/react";
import { toast } from 'sonner';
import { SplitSection } from '../ui/SplitSection';
import { Shield, Database, Settings2, Mail } from 'lucide-react';


export function SettingsPage() {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(settings as Record<string, string>);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }
    setTestingSmtp(true);
    try {
      await testSmtp(testEmail);
      toast.success('Test email sent successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send test email');
    } finally {
      setTestingSmtp(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-default-500">Loading...</div>;
  }

  return (
    <div className="mx-auto pb-10">
      <h2 className="text-2xl font-bold text-foreground mb-6">Settings</h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General Settings */}
        <SplitSection
          title="General Settings"
          description="Configure the basic site information and behavior."
          icon={<Settings2 className="w-5 h-5 text-primary" />}
        >
          <Card>
            <CardBody className="gap-4 p-5">
              <Select
                label="Auto-refresh Interval"
                labelPlacement="outside"
                selectedKeys={settings.refresh_interval ? [settings.refresh_interval] : ['30']}
                onChange={(e) => setSettings({ ...settings, refresh_interval: e.target.value })}
              >
                <SelectItem key="15">15 seconds</SelectItem>
                <SelectItem key="30">30 seconds</SelectItem>
                <SelectItem key="60">1 minute</SelectItem>
                <SelectItem key="120">2 minutes</SelectItem>
                <SelectItem key="300">5 minutes</SelectItem>
              </Select>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Timezone"
                  labelPlacement="outside"
                  selectedKeys={settings.timezone ? [settings.timezone] : ['Asia/Jakarta']}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                >
                  <SelectItem key="Asia/Jakarta">Asia/Jakarta (WIB, GMT+7)</SelectItem>
                  <SelectItem key="Asia/Makassar">Asia/Makassar (WITA, GMT+8)</SelectItem>
                  <SelectItem key="Asia/Jayapura">Asia/Jayapura (WIT, GMT+9)</SelectItem>
                  <SelectItem key="Asia/Singapore">Asia/Singapore (GMT+8)</SelectItem>
                  <SelectItem key="Asia/Tokyo">Asia/Tokyo (GMT+9)</SelectItem>
                  <SelectItem key="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem key="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                  <SelectItem key="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem key="Europe/Paris">Europe/Paris (CET)</SelectItem>
                  <SelectItem key="Australia/Sydney">Australia/Sydney (AEST)</SelectItem>
                  <SelectItem key="UTC">UTC</SelectItem>
                </Select>
                <Select
                  label="Time Format"
                  labelPlacement="outside"
                  selectedKeys={settings.time_format ? [settings.time_format] : ['24h']}
                  onChange={(e) => setSettings({ ...settings, time_format: e.target.value as '12h' | '24h' })}
                >
                  <SelectItem key="24h">24-hour (14:30)</SelectItem>
                  <SelectItem key="12h">12-hour (2:30 PM)</SelectItem>
                </Select>
              </div>
            </CardBody>
          </Card>
        </SplitSection>

        {/* Security Settings */}
        <SplitSection
          title="Security"
          description="Configure session and authentication settings."
          icon={<Shield className="w-5 h-5 text-primary" />}
        >
          <Card>
            <CardBody className="p-5">
              <Select
                label="Session Timeout"
                labelPlacement="outside"

                selectedKeys={settings.session_timeout ? [settings.session_timeout] : ['60']}
                onChange={(e) => setSettings({ ...settings, session_timeout: e.target.value })}
              >
                <SelectItem key="30">30 minutes</SelectItem>
                <SelectItem key="60">1 hour</SelectItem>
                <SelectItem key="120">2 hours</SelectItem>
                <SelectItem key="480">8 hours</SelectItem>
                <SelectItem key="1440">24 hours</SelectItem>
                <SelectItem key="0">Never</SelectItem>
              </Select>
            </CardBody>
          </Card>
        </SplitSection>

        {/* Data Retention Settings */}
        <SplitSection
          title="Data Retention"
          description="Configure how long to keep historical data."
          icon={<Database className="w-5 h-5 text-primary" />}
        >
          <Card>
            <CardBody className="gap-4 p-5">
              <Select
                label="Ping History Retention"
                labelPlacement="outside"
                selectedKeys={settings.ping_retention_days ? [settings.ping_retention_days] : ['30']}
                onChange={(e) => setSettings({ ...settings, ping_retention_days: e.target.value })}
              >
                <SelectItem key="7">7 days</SelectItem>
                <SelectItem key="14">14 days</SelectItem>
                <SelectItem key="30">30 days</SelectItem>
                <SelectItem key="60">60 days</SelectItem>
                <SelectItem key="90">90 days</SelectItem>
              </Select>
              <Select
                label="Incident History Retention"
                labelPlacement="outside"
                selectedKeys={settings.incident_retention_days ? [settings.incident_retention_days] : ['90']}
                onChange={(e) => setSettings({ ...settings, incident_retention_days: e.target.value })}
              >
                <SelectItem key="30">30 days</SelectItem>
                <SelectItem key="60">60 days</SelectItem>
                <SelectItem key="90">90 days</SelectItem>
                <SelectItem key="180">180 days</SelectItem>
                <SelectItem key="365">1 year</SelectItem>
              </Select>
              <Select
                label="Alert Log Retention"
                labelPlacement="outside"
                selectedKeys={settings.alert_retention_days ? [settings.alert_retention_days] : ['30']}
                onChange={(e) => setSettings({ ...settings, alert_retention_days: e.target.value })}
              >
                <SelectItem key="7">7 days</SelectItem>
                <SelectItem key="14">14 days</SelectItem>
                <SelectItem key="30">30 days</SelectItem>
                <SelectItem key="60">60 days</SelectItem>
              </Select>
            </CardBody>
          </Card>
        </SplitSection>

        {/* SMTP Settings */}
        <SplitSection
          title="Email Notifications (SMTP)"
          description="Configure SMTP settings to enable email alerts."
          icon={<Mail className="w-5 h-5 text-primary" />}
        >
          <Card>
            <CardBody className="gap-4 p-5">
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
            </CardBody>
          </Card>
        </SplitSection>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            isLoading={saving}
            color="primary"
            size="lg"
          >
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
