import express from 'express';
import { getAllWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, getAlertHistory } from '../services/webhookService.js';

const router = express.Router();

// Get all webhooks
router.get('/', (req, res) => {
  try {
    const webhooks = getAllWebhooks();
    // Parse JSON fields for response
    const parsed = webhooks.map(w => ({
      ...w,
      events: JSON.parse(w.events || '[]'),
      headers: JSON.parse(w.headers || '{}'),
      enabled: !!w.enabled
    }));
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

// Create webhook
router.post('/', (req, res) => {
  try {
    const { name, url, type, events, headers, enabled } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    const webhook = createWebhook({ name, url, type, events, headers, enabled });
    res.status(201).json({
      ...webhook,
      events: JSON.parse(webhook.events || '[]'),
      headers: JSON.parse(webhook.headers || '{}'),
      enabled: !!webhook.enabled
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// Update webhook
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const webhook = updateWebhook(parseInt(id), req.body);

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      ...webhook,
      events: JSON.parse(webhook.events || '[]'),
      headers: JSON.parse(webhook.headers || '{}'),
      enabled: !!webhook.enabled
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

// Delete webhook
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteWebhook(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// Test webhook
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await testWebhook(parseInt(id));
    res.json(result);
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ error: error.message || 'Failed to test webhook' });
  }
});

// Get alert history
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const history = getAlertHistory(limit);
    res.json(history);
  } catch (error) {
    console.error('Error fetching alert history:', error);
    res.status(500).json({ error: 'Failed to fetch alert history' });
  }
});

export default router;
