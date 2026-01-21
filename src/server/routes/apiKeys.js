import express from 'express';
import { getAllApiKeys, createApiKey, updateApiKey, deleteApiKey } from '../services/apiKeyService.js';

const router = express.Router();

// Get all API keys (mask the actual key)
router.get('/', (req, res) => {
  try {
    const keys = getAllApiKeys();
    const masked = keys.map(k => ({
      ...k,
      key: k.key.substring(0, 10) + '...' + k.key.substring(k.key.length - 4),
      permissions: JSON.parse(k.permissions || '[]'),
      enabled: !!k.enabled
    }));
    res.json(masked);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// Create API key
router.post('/', (req, res) => {
  try {
    const { name, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const apiKey = createApiKey({ name, permissions });
    res.status(201).json(apiKey);
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Update API key
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = updateApiKey(parseInt(id), req.body);

    if (!result) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({
      ...result,
      key: result.key.substring(0, 10) + '...' + result.key.substring(result.key.length - 4),
      permissions: JSON.parse(result.permissions || '[]'),
      enabled: !!result.enabled
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// Delete API key
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteApiKey(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

export default router;
