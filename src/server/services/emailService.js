import nodemailer from 'nodemailer';
import { db } from '../db.js';

function getSettings() {
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = {};
  settings.forEach(s => {
    settingsObj[s.key] = s.value;
  });
  return settingsObj;
}

function createTransporter() {
  const settings = getSettings();

  if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port) || 587,
    secure: parseInt(settings.smtp_port) === 465,
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass
    }
  });
}

export async function sendDownAlert(service, error) {
  const settings = getSettings();
  const transporter = createTransporter();

  if (!transporter || !settings.notification_emails) {
    console.log('⚠️ Email notification skipped (SMTP not configured)');
    return;
  }

  const recipients = settings.notification_emails.split(',').map(e => e.trim()).filter(Boolean);

  if (recipients.length === 0) {
    return;
  }

  try {
    await transporter.sendMail({
      from: settings.smtp_from_name ? `"${settings.smtp_from_name}" <${settings.smtp_from || settings.smtp_user}>` : (settings.smtp_from || settings.smtp_user),
      to: recipients.join(', '),
      subject: `🔴 Service Down: ${service.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">⚠️ Service Down Alert</h2>
          <p>The following service is currently <strong style="color: #e74c3c;">DOWN</strong>:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; width: 120px;"><strong>Service</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${service.name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><strong>URL</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;"><a href="${service.url}">${service.url}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Error</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #e74c3c;">${error}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Time</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toISOString()}</td>
            </tr>
          </table>
          <p style="color: #666; font-size: 12px;">This is an automated message from MEYTRICS.</p>
        </div>
      `
    });
    console.log(`📧 Down alert sent for ${service.name}`);
  } catch (error) {
    console.error('Failed to send down alert email:', error);
  }
}

export async function sendRecoveryAlert(service, responseTime) {
  const settings = getSettings();
  const transporter = createTransporter();

  if (!transporter || !settings.notification_emails) {
    return;
  }

  const recipients = settings.notification_emails.split(',').map(e => e.trim()).filter(Boolean);

  if (recipients.length === 0) {
    return;
  }

  try {
    await transporter.sendMail({
      from: settings.smtp_from_name ? `"${settings.smtp_from_name}" <${settings.smtp_from || settings.smtp_user}>` : (settings.smtp_from || settings.smtp_user),
      to: recipients.join(', '),
      subject: `🟢 Service Recovered: ${service.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">✅ Service Recovered</h2>
          <p>The following service is now <strong style="color: #27ae60;">OPERATIONAL</strong>:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; width: 120px;"><strong>Service</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${service.name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><strong>URL</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;"><a href="${service.url}">${service.url}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Response Time</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${responseTime}ms</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Time</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toISOString()}</td>
            </tr>
          </table>
          <p style="color: #666; font-size: 12px;">This is an automated message from MEYTRICS.</p>
        </div>
      `
    });
    console.log(`📧 Recovery alert sent for ${service.name}`);
  } catch (error) {
    console.error('Failed to send recovery alert email:', error);
  }
}

export async function sendTestEmail(email) {
  const transporter = createTransporter();

  if (!transporter) {
    throw new Error('SMTP not configured. Please configure SMTP settings first.');
  }

  const settings = getSettings();

  await transporter.sendMail({
    from: settings.smtp_from_name ? `"${settings.smtp_from_name}" <${settings.smtp_from || settings.smtp_user}>` : (settings.smtp_from || settings.smtp_user),
    to: email,
    subject: '📊 MEYTRICS - Test Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">✅ SMTP Configuration Test</h2>
        <p>If you're reading this, your SMTP configuration is working correctly!</p>
        <p style="color: #666; font-size: 12px;">This is a test message from MEYTRICS.</p>
      </div>
    `
  });
}
