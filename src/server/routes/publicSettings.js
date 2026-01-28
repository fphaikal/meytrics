import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Get public settings (for status page)
router.get('/', async (req, res) => {
  try {
    const publicKeys = ['page_title', 'refresh_interval', 'monitor_style', 'custom_css'];
    const settings = await db.setting.findMany({
      where: {
        key: { in: publicKeys }
      }
    });

    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });

    res.json(settingsObj);
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
