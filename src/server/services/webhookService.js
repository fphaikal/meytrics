import { db } from '../db.js';

async function getSettings() {
  // settings table has key, value columns
  const settings = await db.setting.findMany();
  const settingsObj = {};
  settings.forEach(s => {
    settingsObj[s.key] = s.value;
  });
  return settingsObj;
}

async function getEnabledWebhooks() {
  return db.webhook.findMany({
    where: { enabled: 1 }
  });
}

function logAlert(serviceId, type, message) {
  // Alert logging can be async/fire-and-forget
  db.alertHistory.create({
    data: {
      service_id: serviceId,
      type,
      message
    }
  }).catch(err => console.error('Failed to log alert:', err));
}

// Format payload for different webhook types
async function formatPayload(webhook, service, eventType, details) {
  const settings = await getSettings();
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
              value: String(details),
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

    case 'telegram':
      const config = JSON.parse(webhook.config || '{}');
      return {
        chat_id: config.telegram_chat_id,
        text: isDown
          ? `🔴 *${service.name} is DOWN*\nURL: ${service.url}\nError: ${details}\n\n${pageTitle} • ${timestamp}`
          : `🟢 *${service.name} is UP*\nURL: ${service.url}\nResponse Time: ${details}\n\n${pageTitle} • ${timestamp}`,
        parse_mode: 'Markdown'
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
        details: String(details),
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
      // Try to read error body for better debugging
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`Webhook ${webhook.name} failed: ${response.status} ${errorText}`);
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
  const webhooks = await getEnabledWebhooks();

  for (const webhook of webhooks) {
    const events = JSON.parse(webhook.events || '["down","recovery"]');

    if (!events.includes(eventType)) {
      continue;
    }

    const payload = await formatPayload(webhook, service, eventType, details);
    await sendWebhook(webhook, payload);
  }

  // Log to alert history
  const message = eventType === 'down'
    ? `Service went down: ${details}`
    : `Service recovered: ${details}`;
  logAlert(service.id, eventType, message);
}

// CRUD operations for webhooks
export async function getAllWebhooks() {
  return db.webhook.findMany({
    orderBy: { created_at: 'desc' }
  });
}

export async function getWebhookById(id) {
  return db.webhook.findUnique({
    where: { id: parseInt(id) }
  });
}

export async function createWebhook(data) {
  return db.webhook.create({
    data: {
      name: data.name,
      url: data.url,
      type: data.type || 'custom',
      events: JSON.stringify(data.events || ['down', 'recovery']),
      headers: JSON.stringify(data.headers || {}),
      config: JSON.stringify(data.config || {}),
      enabled: data.enabled !== false ? 1 : 0
    }
  });
}

export async function updateWebhook(id, data) {
  try {
    return await db.webhook.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name,
        url: data.url,
        type: data.type,
        events: data.events ? JSON.stringify(data.events) : undefined,
        headers: data.headers ? JSON.stringify(data.headers) : undefined,
        config: data.config ? JSON.stringify(data.config) : undefined,
        enabled: data.enabled !== undefined ? (data.enabled ? 1 : 0) : undefined
      }
    });
  } catch (error) {
    // Return null if record not found
    return null;
  }
}

export async function deleteWebhook(id) {
  return db.webhook.delete({
    where: { id: parseInt(id) }
  });
}

export async function testWebhook(id) {
  const webhook = await getWebhookById(id);
  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const testService = {
    id: 0,
    name: 'Test Service',
    url: 'https://example.com',
    type: 'http'
  };

  const payload = await formatPayload(webhook, testService, 'down', 'This is a test notification');
  const success = await sendWebhook(webhook, payload);

  if (!success) {
    throw new Error('Webhook test failed');
  }

  return { success: true, message: 'Test notification sent' };
}

// Get alert history
export async function getAlertHistory(limit = 100) {
  const history = await db.alertHistory.findMany({
    orderBy: { created_at: 'desc' },
    take: parseInt(limit),
    include: {
      service: {
        select: {
          name: true,
          url: true
        }
      }
    }
  });

  return history.map(h => ({
    ...h,
    service_name: h.service?.name || null,
    service_url: h.service?.url || null
  }));
}
