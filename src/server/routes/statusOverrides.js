import express from 'express';
import {
  getAllStatusOverrides,
  getAllActiveOverrides,
  createStatusOverride,
  updateStatusOverride,
  deleteStatusOverride
} from '../services/statusOverrideService.js';

const router = express.Router();

// Get all status overrides
router.get('/', (req, res) => {
  try {
    const overrides = getAllStatusOverrides();
    res.json(overrides);
  } catch (error) {
    console.error('Error fetching status overrides:', error);
    res.status(500).json({ error: 'Failed to fetch status overrides' });
  }
});

// Get active overrides only
router.get('/active', (req, res) => {
  try {
    const overrides = getAllActiveOverrides();
    res.json(overrides);
  } catch (error) {
    console.error('Error fetching active overrides:', error);
    res.status(500).json({ error: 'Failed to fetch active overrides' });
  }
});

// Create status override
router.post('/', (req, res) => {
  try {
    const { service_id, status, reason, start_time, end_time } = req.body;

    if (!service_id || !status || !start_time || !end_time) {
      return res.status(400).json({ error: 'service_id, status, start_time, and end_time are required' });
    }

    const override = createStatusOverride({ service_id, status, reason, start_time, end_time });
    res.status(201).json(override);
  } catch (error) {
    console.error('Error creating status override:', error);
    res.status(500).json({ error: 'Failed to create status override' });
  }
});

// Update status override
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = updateStatusOverride(parseInt(id), req.body);

    if (!result) {
      return res.status(404).json({ error: 'Status override not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating status override:', error);
    res.status(500).json({ error: 'Failed to update status override' });
  }
});

// Delete status override
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteStatusOverride(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting status override:', error);
    res.status(500).json({ error: 'Failed to delete status override' });
  }
});

export default router;
