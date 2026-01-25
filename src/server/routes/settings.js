import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Get all settings
router.get('/', async (req, res) => {
    try {
        const settings = await db.setting.findMany();
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
router.put('/', async (req, res) => {
    try {
        const updates = req.body;

        // Transaction for bulk upsert
        await db.$transaction(async (tx) => {
            for (const [key, value] of Object.entries(updates)) {
                // Skip updating smtp_pass if it's the masked value
                if (key === 'smtp_pass' && value === '********') {
                    continue;
                }

                await tx.setting.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value) }
                });
            }
        });

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get public settings (for status page)
router.get('/public', async (req, res) => {
    try {
        const publicKeys = ['page_title', 'refresh_interval'];
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

// Test SMTP connection
router.post('/test-smtp', async (req, res) => {
    try {
        const { sendTestEmail } = await import('../services/emailService.js');
        const { email, config } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        await sendTestEmail(email, config);
        res.json({ message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Test SMTP error:', error);
        res.status(500).json({ error: error.message || 'Failed to send test email' });
    }
});

export default router;
