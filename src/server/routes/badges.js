import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Generate status badge SVG
router.get('/:serviceId/status.svg', (req, res) => {
    try {
        const { serviceId } = req.params;
        const { label, color } = req.query;

        const service = db.prepare(`
            SELECT s.*, 
                (SELECT status FROM pings WHERE service_id = s.id ORDER BY created_at DESC LIMIT 1) as current_status
            FROM services s
            WHERE s.id = ?
        `).get(serviceId);

        if (!service) {
            return res.status(404).send('Service not found');
        }

        const status = service.current_status || 'unknown';
        const statusLabel = status === 'up' ? 'operational' : status === 'down' ? 'down' : 'unknown';
        const labelText = label || service.name;

        let statusColor = color;
        if (!statusColor) {
            statusColor = status === 'up' ? '#10b981' : status === 'down' ? '#ef4444' : '#9ca3af';
        }

        const svg = generateBadge(labelText, statusLabel, statusColor);

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(svg);
    } catch (error) {
        console.error('Error generating status badge:', error);
        res.status(500).send('Error generating badge');
    }
});

// Generate uptime badge SVG
router.get('/:serviceId/uptime.svg', (req, res) => {
    try {
        const { serviceId } = req.params;
        const { label, days } = req.query;

        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);

        if (!service) {
            return res.status(404).send('Service not found');
        }

        const daysCount = parseInt(days) || 30;
        const stats = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_count
            FROM pings 
            WHERE service_id = ? 
            AND created_at > datetime('now', '-${daysCount} days')
        `).get(serviceId);

        const uptimePercent = stats.total > 0
            ? ((stats.up_count / stats.total) * 100).toFixed(2)
            : '100.00';

        const labelText = label || `uptime ${daysCount}d`;

        let color = '#10b981'; // green
        if (parseFloat(uptimePercent) < 99) color = '#f59e0b'; // yellow
        if (parseFloat(uptimePercent) < 95) color = '#ef4444'; // red

        const svg = generateBadge(labelText, `${uptimePercent}%`, color);

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(svg);
    } catch (error) {
        console.error('Error generating uptime badge:', error);
        res.status(500).send('Error generating badge');
    }
});

function generateBadge(label, value, color) {
    const labelWidth = Math.max(label.length * 7, 40);
    const valueWidth = Math.max(value.length * 7, 40);
    const totalWidth = labelWidth + valueWidth + 20;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" viewBox="0 0 ${totalWidth} 20">
    <linearGradient id="smooth" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <clipPath id="round">
        <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
    </clipPath>
    <g clip-path="url(#round)">
        <rect width="${labelWidth + 10}" height="20" fill="#555"/>
        <rect x="${labelWidth + 10}" width="${valueWidth + 10}" height="20" fill="${color}"/>
        <rect width="${totalWidth}" height="20" fill="url(#smooth)"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
        <text x="${(labelWidth + 10) / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
        <text x="${(labelWidth + 10) / 2}" y="14" fill="#fff">${escapeXml(label)}</text>
        <text x="${labelWidth + 10 + (valueWidth + 10) / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(value)}</text>
        <text x="${labelWidth + 10 + (valueWidth + 10) / 2}" y="14" fill="#fff">${escapeXml(value)}</text>
    </g>
</svg>`;
}

function escapeXml(str) {
    return str.replace(/[<>&'"]/g, c => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;'
    }[c]));
}

export default router;
