import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Get all settings
router.get('/', (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM settings').all();
        const settingsObj = {};

        settings.forEach(s => {
            // Don't expose SMTP password in full
            if (s.key === 'smtp_pass' && s.value) {
                settingsObj[s.key] = '********';
            } else {
                settingsObj[s.key] = s.value;
            }
        });

        res.json(settingsObj);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update settings
router.put('/', (req, res) => {
    try {
        const updates = req.body;

        const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

        for (const [key, value] of Object.entries(updates)) {
            // Skip updating smtp_pass if it's the masked value
            if (key === 'smtp_pass' && value === '********') {
                continue;
            }
            updateStmt.run(key, value);
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get public settings (for status page)
router.get('/public', (req, res) => {
    try {
        const publicKeys = ['page_title', 'refresh_interval'];
        const settings = db.prepare(`
      SELECT * FROM settings WHERE key IN (${publicKeys.map(() => '?').join(',')})
    `).all(...publicKeys);

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

// Test SMTP connection
router.post('/test-smtp', async (req, res) => {
    try {
        const { sendTestEmail } = await import('../services/emailService.js');
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        await sendTestEmail(email);
        res.json({ message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Test SMTP error:', error);
        res.status(500).json({ error: error.message || 'Failed to send test email' });
    }
});

export default router;
