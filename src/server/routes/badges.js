import express from 'express';
import { db } from '../db.js';

const router = express.Router();

function generateBadge(label, value, color) {
    const fontFamily = "Verdana, Geneva, 'DejaVu Sans', sans-serif";
    const charWidth = 7;
    const padding = 10;
    const labelWidth = Math.max(Math.ceil(label.length * charWidth) + padding, 40);
    const valueWidth = Math.max(Math.ceil(value.length * charWidth) + padding, 40);
    const totalWidth = labelWidth + valueWidth;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" aria-label="${escapeXml(label)}: ${escapeXml(value)}">
    <g shape-rendering="crispEdges">
        <rect width="${labelWidth}" height="20" fill="#2d2d2d"/>
        <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="${fontFamily}" font-size="11" text-rendering="geometricPrecision">
        <text x="${labelWidth / 2}" y="14" fill="#fff">${escapeXml(label)}</text>
        <text x="${labelWidth + (valueWidth / 2)}" y="14" fill="#fff">${escapeXml(value)}</text>
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

// Generate status badge SVG
router.get('/:serviceId/status.svg', async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { label, color } = req.query;
        const id = parseInt(serviceId);

        const service = await db.service.findUnique({
            where: { id }
        });

        if (!service) {
            return res.status(404).send('Service not found');
        }

        const lastPing = await db.ping.findFirst({
            where: { service_id: id },
            orderBy: { created_at: 'desc' },
            select: { status: true }
        });

        const status = lastPing?.status || 'unknown';
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
router.get('/:serviceId/uptime.svg', async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { label, days } = req.query;
        const id = parseInt(serviceId);

        const service = await db.service.findUnique({
            where: { id }
        });

        if (!service) {
            return res.status(404).send('Service not found');
        }

        const daysCount = parseInt(days) || 30;
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - daysCount);

        const total = await db.ping.count({
            where: {
                service_id: id,
                created_at: { gte: dateLimit }
            }
        });

        const upCount = await db.ping.count({
            where: {
                service_id: id,
                created_at: { gte: dateLimit },
                status: 'up'
            }
        });

        const uptimePercent = total > 0
            ? ((upCount / total) * 100).toFixed(2)
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

export default router;
