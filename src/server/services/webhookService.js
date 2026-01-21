import { db } from '../db.js';

function getSettings() {
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = {};
  settings.forEach(s => {
    settingsObj[s.key] = s.value;
  });
  return settingsObj;
}

function getEnabledWebhooks() {
  return db.prepare('SELECT * FROM webhooks WHERE enabled = 1').all();
}

function logAlert(serviceId, type, message) {
  db.prepare('INSERT INTO alert_history (service_id, type, message) VALUES (?, ?, ?)')
    .run(serviceId, type, message);
}

// Format payload for different webhook types
function formatPayload(webhook, service, eventType, details) {
  const settings = getSettings();
  const pageTitle = settings.page_title || 'MEYTRICS';
  const siteUrl = settings.site_url || '';

  const timestamp = new Date().toISOString();
  const isDown = eventType === 'down';

  switch (webhook.type) {
    case 'discord':
      return {
        embeds: [{
          title: isDown ? `🔴 ${service.name} is DOWN` : `🟢 ${service.name} is UP`,
          description: isDown
            ? `Service **${service.name}** is currently unreachable.`
            : `Service **${service.name}** has recovered and is operational.`,
          color: isDown ? 0xe74c3c : 0x27ae60,
          fields: [
            {
              name: 'URL',
              value: service.url,
              inline: true
            },
            {
              name: eventType === 'down' ? 'Error' : 'Response Time',
              value: details,
              inline: true
            }
          ],
          footer: {
            text: pageTitle
          },
          timestamp: timestamp
        }]
      };

    case 'slack':
      return {
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: isDown ? `🔴 ${service.name} is DOWN` : `🟢 ${service.name} is UP`,
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Service:*\n${service.name}`
              },
              {
                type: 'mrkdwn',
                text: `*Status:*\n${isDown ? 'Down' : 'Operational'}`
              },
              {
                type: 'mrkdwn',
                text: `*URL:*\n${service.url}`
              },
              {
                type: 'mrkdwn',
                text: `*${isDown ? 'Error' : 'Response Time'}:*\n${details}`
              }
            ]
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `${pageTitle} • ${timestamp}`
              }
            ]
          }
        ]
      };

    default: // custom
      return {
        event: eventType,
        service: {
          id: service.id,
          name: service.name,
          url: service.url,
          type: service.type
        },
        details: details,
        timestamp: timestamp,
        source: pageTitle,
        status_page_url: siteUrl
      };
  }
}

async function sendWebhook(webhook, payload) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...JSON.parse(webhook.headers || '{}')
    };

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`Webhook ${webhook.name} failed: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log(`🔔 Webhook sent: ${webhook.name}`);
    return true;
  } catch (error) {
    console.error(`Webhook ${webhook.name} error:`, error.message);
    return false;
  }
}

export async function triggerWebhooks(eventType, service, details) {
  const webhooks = getEnabledWebhooks();

  for (const webhook of webhooks) {
    const events = JSON.parse(webhook.events || '["down","recovery"]');

    if (!events.includes(eventType)) {
      continue;
    }

    const payload = formatPayload(webhook, service, eventType, details);
    await sendWebhook(webhook, payload);
  }

  // Log to alert history
  const message = eventType === 'down'
    ? `Service went down: ${details}`
    : `Service recovered: ${details}`;
  logAlert(service.id, eventType, message);
}

// CRUD operations for webhooks
export function getAllWebhooks() {
  return db.prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all();
}

export function getWebhookById(id) {
  return db.prepare('SELECT * FROM webhooks WHERE id = ?').get(id);
}

export function createWebhook(data) {
  const result = db.prepare(`
        INSERT INTO webhooks (name, url, type, events, headers, enabled)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
    data.name,
    data.url,
    data.type || 'custom',
    JSON.stringify(data.events || ['down', 'recovery']),
    JSON.stringify(data.headers || {}),
    data.enabled !== false ? 1 : 0
  );
  return getWebhookById(result.lastInsertRowid);
}

export function updateWebhook(id, data) {
  const existing = getWebhookById(id);
  if (!existing) return null;

  db.prepare(`
        UPDATE webhooks SET 
            name = COALESCE(?, name),
            url = COALESCE(?, url),
            type = COALESCE(?, type),
            events = COALESCE(?, events),
            headers = COALESCE(?, headers),
            enabled = COALESCE(?, enabled)
        WHERE id = ?
    `).run(
    data.name,
    data.url,
    data.type,
    data.events ? JSON.stringify(data.events) : null,
    data.headers ? JSON.stringify(data.headers) : null,
    data.enabled !== undefined ? (data.enabled ? 1 : 0) : null,
    id
  );

  return getWebhookById(id);
}

export function deleteWebhook(id) {
  return db.prepare('DELETE FROM webhooks WHERE id = ?').run(id);
}

export async function testWebhook(id) {
  const webhook = getWebhookById(id);
  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const testService = {
    id: 0,
    name: 'Test Service',
    url: 'https://example.com',
    type: 'http'
  };

  const payload = formatPayload(webhook, testService, 'down', 'This is a test notification');
  const success = await sendWebhook(webhook, payload);

  if (!success) {
    throw new Error('Webhook test failed');
  }

  return { success: true, message: 'Test notification sent' };
}

// Get alert history
export function getAlertHistory(limit = 100) {
  return db.prepare(`
        SELECT ah.*, s.name as service_name, s.url as service_url
        FROM alert_history ah
        LEFT JOIN services s ON ah.service_id = s.id
        ORDER BY ah.created_at DESC
        LIMIT ?
    `).all(limit);
}
