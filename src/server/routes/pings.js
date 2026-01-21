import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Helper to format date for SQLite (YYYY-MM-DD HH:MM:SS)
const formatDateForDb = (date) => date.toISOString().replace('T', ' ').substring(0, 19);

// Get pings for a service (with pagination and date range)
router.get('/:serviceId', (req, res) => {
    try {
        const { serviceId } = req.params;
        const { days = 30, limit = 5000 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const pings = db.prepare(`
      SELECT * FROM pings 
      WHERE service_id = ? AND created_at >= ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(serviceId, formatDateForDb(startDate), parseInt(limit));

        res.json(pings);
    } catch (error) {
        console.error('Get pings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get aggregated pings for response time chart (optimized for large time ranges)
router.get('/:serviceId/aggregated', (req, res) => {
    try {
        const { serviceId } = req.params;
        const { hours, days } = req.query;

        // Determine time range and aggregation interval
        let startDate = new Date();
        let groupBy;

        if (hours) {
            const hoursInt = parseInt(hours);
            startDate.setHours(startDate.getHours() - hoursInt);

            if (hoursInt <= 1) {
                // Last hour: no aggregation, return raw data
                const pings = db.prepare(`
                    SELECT * FROM pings 
                    WHERE service_id = ? AND created_at >= ? AND status = 'up' AND response_time IS NOT NULL
                    ORDER BY created_at ASC
                `).all(serviceId, formatDateForDb(startDate));
                return res.json(pings);
            } else if (hoursInt <= 24) {
                // Last 24h: aggregate per hour (24 data points)
                groupBy = "strftime('%Y-%m-%d %H:00:00', created_at)";
            }
        } else if (days) {
            const daysInt = parseInt(days);
            startDate.setDate(startDate.getDate() - daysInt);

            if (daysInt <= 7) {
                // Last 7 days: aggregate per hour (168 data points)
                groupBy = "strftime('%Y-%m-%d %H:00:00', created_at)";
            } else {
                // Last 30+ days: aggregate per 4 hours (180 data points)
                groupBy = "strftime('%Y-%m-%d', created_at) || ' ' || printf('%02d', (cast(strftime('%H', created_at) as integer) / 4) * 4) || ':00:00'";
            }
        } else {
            // Default: last 24 hours, aggregate per hour
            startDate.setHours(startDate.getHours() - 24);
            groupBy = "strftime('%Y-%m-%d %H:00:00', created_at)";
        }

        const aggregatedPings = db.prepare(`
            SELECT 
                ${groupBy} as created_at,
                AVG(response_time) as response_time,
                MIN(response_time) as min_response_time,
                MAX(response_time) as max_response_time,
                'up' as status,
                COUNT(*) as ping_count
            FROM pings 
            WHERE service_id = ? AND created_at >= ? AND status = 'up' AND response_time IS NOT NULL
            GROUP BY ${groupBy}
            ORDER BY created_at ASC
        `).all(serviceId, formatDateForDb(startDate));

        res.json(aggregatedPings);
    } catch (error) {
        console.error('Get aggregated pings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get ping statistics summary (min, max, avg, uptime) for a specific time range
router.get('/:serviceId/summary', (req, res) => {
    try {
        const { serviceId } = req.params;
        const { hours, days } = req.query;

        let startDate = new Date();
        if (hours) {
            startDate.setHours(startDate.getHours() - parseInt(hours));
        } else if (days) {
            startDate.setDate(startDate.getDate() - parseInt(days));
        } else {
            startDate.setHours(startDate.getHours() - 24);
        }

        const stats = db.prepare(`
            SELECT 
                ROUND(AVG(response_time)) as avg,
                MIN(response_time) as min,
                MAX(response_time) as max,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_count
            FROM pings 
            WHERE service_id = ? AND created_at >= ? AND response_time IS NOT NULL
        `).get(serviceId, formatDateForDb(startDate));

        // Get total count including down (which might have null response_time) for uptime
        const uptimeStats = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_count
            FROM pings 
            WHERE service_id = ? AND created_at >= ?
        `).get(serviceId, formatDateForDb(startDate));

        const response = {
            avg: stats.avg || 0,
            min: stats.min || 0,
            max: stats.max || 0,
            uptime: uptimeStats.total > 0 ? ((uptimeStats.up_count / uptimeStats.total) * 100).toFixed(3) : 0
        };

        res.json(response);
    } catch (error) {
        console.error('Get ping summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get daily aggregated uptime data for service (for uptime bars)
router.get('/:serviceId/daily', (req, res) => {
    try {
        const { serviceId } = req.params;
        const { days = 90 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Get service interval to calculate downtime
        const service = db.prepare('SELECT interval FROM services WHERE id = ?').get(serviceId);
        const checkIntervalMinutes = service ? Math.ceil(service.interval / 60) : 5; // Default 5 min

        // Get daily aggregated data
        const dailyData = db.prepare(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as total_checks,
        SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_count,
        SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) as down_count,
        AVG(response_time) as avg_response_time
      FROM pings 
      WHERE service_id = ? AND created_at >= ?
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(serviceId, startDate.toISOString());

        // Fill in missing days with null data
        const result = [];
        const endDate = new Date();
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayData = dailyData.find(d => d.date === dateStr);

            if (dayData) {
                // Calculate downtime in minutes
                const downtimeMinutes = dayData.down_count * checkIntervalMinutes;

                // Determine status: down if all checks failed, partial if some failed, up if all passed
                let status = 'up';
                if (dayData.down_count > 0 && dayData.up_count === 0) {
                    status = 'down';
                } else if (dayData.down_count > 0) {
                    status = 'partial';
                }

                result.push({
                    date: dateStr,
                    status: status,
                    uptime_percent: ((dayData.up_count / dayData.total_checks) * 100).toFixed(2),
                    total_checks: dayData.total_checks,
                    avg_response_time: Math.round(dayData.avg_response_time || 0),
                    downtime_minutes: downtimeMinutes
                });
            } else {
                result.push({
                    date: dateStr,
                    status: 'no_data',
                    uptime_percent: null,
                    total_checks: 0,
                    avg_response_time: null,
                    downtime_minutes: 0
                });
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.json(result);
    } catch (error) {
        console.error('Get daily pings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get overall stats
router.get('/stats/overview', (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - parseInt(hours));

        const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT service_id) as services_checked,
        COUNT(*) as total_checks,
        SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_count,
        SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) as down_count,
        AVG(response_time) as avg_response_time
      FROM pings 
      WHERE created_at >= ?
    `).get(startDate.toISOString());

        res.json(stats);
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
