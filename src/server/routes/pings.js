import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Get pings for a service (with pagination and date range)
router.get('/:serviceId', async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { days = 30, limit = 5000 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const pings = await db.ping.findMany({
            where: {
                service_id: parseInt(serviceId),
                created_at: { gte: startDate }
            },
            orderBy: { created_at: 'desc' },
            take: parseInt(limit)
        });

        res.json(pings);
    } catch (error) {
        console.error('Get pings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get aggregated pings for response time chart (Optimized w/ Raw SQL)
router.get('/:serviceId/aggregated', async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { hours, days } = req.query;
        const id = parseInt(serviceId);

        let startDate = new Date();
        let groupByFormat;

        if (hours) {
            const hoursInt = parseInt(hours);
            startDate.setHours(startDate.getHours() - hoursInt);
            // Group by hour: 'YYYY-MM-DD HH:00:00'
            // SQLite strftime('%Y-%m-%d %H:00:00', created_at)
            groupByFormat = '%Y-%m-%d %H:00:00';
            if (hoursInt <= 1) {
                // If checking last 1 hour, maybe raw is better or minute grouping
                groupByFormat = '%Y-%m-%d %H:%M:00';
            }
        } else if (days) {
            const daysInt = parseInt(days);
            startDate.setDate(startDate.getDate() - daysInt);
            // Group by hour
            groupByFormat = '%Y-%m-%d %H:00:00';
        } else {
            startDate.setHours(startDate.getHours() - 24);
            groupByFormat = '%Y-%m-%d %H:00:00';
        }

        // Convert JS Date to timestamp for SQLite comparison (stored as INTEGER/REAL ms)
        const startTimestamp = startDate.getTime();

        // Use Prisma Raw Query for SQLite Aggregation
        // SQLite dates are stored as INTEGER (milliseconds) in this DB
        const result = await db.$queryRaw`
            SELECT 
                strftime(${groupByFormat}, created_at / 1000, 'unixepoch') as time_bucket,
                AVG(response_time) as avg_resp,
                MIN(response_time) as min_resp,
                MAX(response_time) as max_resp,
                COUNT(*) as count
            FROM pings 
            WHERE service_id = ${id} 
              AND created_at >= ${startTimestamp}
              AND status = 'up'
              AND response_time IS NOT NULL
            GROUP BY time_bucket
            ORDER BY time_bucket ASC
        `;

        // Format for frontend
        const formatted = result.map(r => ({
            created_at: r.time_bucket, // already formatted string
            response_time: Number(r.avg_resp),
            min_response_time: Number(r.min_resp),
            max_response_time: Number(r.max_resp),
            status: 'up',
            ping_count: Number(r.count) // BigInt support
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Get aggregated pings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get ping statistics summary
router.get('/:serviceId/summary', async (req, res) => {
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

        const id = parseInt(serviceId);

        const aggregations = await db.ping.aggregate({
            _avg: { response_time: true },
            _min: { response_time: true },
            _max: { response_time: true },
            _count: { _all: true },
            where: {
                service_id: id,
                created_at: { gte: startDate },
                response_time: { not: null }
            }
        });

        // Calculate uptime
        // We can't do conditional count in one query easily with standard aggregate
        // So fetch counts separately
        const totalPings = await db.ping.count({
            where: {
                service_id: id,
                created_at: { gte: startDate }
            }
        });

        const upPings = await db.ping.count({
            where: {
                service_id: id,
                created_at: { gte: startDate },
                status: 'up'
            }
        });

        const response = {
            avg: Math.round(aggregations._avg.response_time || 0),
            min: aggregations._min.response_time || 0,
            max: aggregations._max.response_time || 0,
            uptime: totalPings > 0 ? ((upPings / totalPings) * 100).toFixed(3) : 0
        };

        res.json(response);
    } catch (error) {
        console.error('Get ping summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get daily aggregated uptime data
router.get('/:serviceId/daily', async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { days = 90 } = req.query;
        const id = parseInt(serviceId);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const service = await db.service.findUnique({ where: { id } });
        const checkIntervalMinutes = service ? Math.ceil(service.interval / 60) : 5;

        // Fetch all pings for the period (optimized select)
        const pings = await db.ping.findMany({
            where: {
                service_id: id,
                created_at: { gte: startDate }
            },
            select: {
                created_at: true,
                status: true,
                response_time: true
            }
        });

        // Group by day in JS
        const dailyMap = new Map();

        pings.forEach(p => {
            const dateStr = new Date(p.created_at).toISOString().split('T')[0];
            if (!dailyMap.has(dateStr)) {
                dailyMap.set(dateStr, { total: 0, up: 0, down: 0, sumTime: 0, countTime: 0 });
            }
            const d = dailyMap.get(dateStr);
            d.total++;
            if (p.status === 'up') {
                d.up++;
                if (p.response_time !== null) {
                    d.sumTime += p.response_time;
                    d.countTime++;
                }
            } else if (p.status === 'down') {
                d.down++;
            }
        });

        // Fill date range
        const result = [];
        const endDate = new Date();
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const data = dailyMap.get(dateStr);

            if (data) {
                const downtimeMinutes = data.down * checkIntervalMinutes;
                let status = 'up';
                if (data.down > 0 && data.up === 0) status = 'down';
                else if (data.down > 0) status = 'partial';

                result.push({
                    date: dateStr,
                    status,
                    uptime_percent: ((data.up / data.total) * 100).toFixed(2),
                    total_checks: data.total,
                    avg_response_time: data.countTime > 0 ? Math.round(data.sumTime / data.countTime) : 0,
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
router.get('/stats/overview', async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - parseInt(hours));

        const totalChecks = await db.ping.count({
            where: { created_at: { gte: startDate } }
        });

        const upChecks = await db.ping.count({
            where: { created_at: { gte: startDate }, status: 'up' }
        });

        const downChecks = await db.ping.count({
            where: { created_at: { gte: startDate }, status: 'down' }
        });

        const avgAgg = await db.ping.aggregate({
            _avg: { response_time: true },
            where: { created_at: { gte: startDate }, response_time: { not: null } }
        });

        // Services checked count (distinct service_id)
        // Prisma distinct count support varies, can use groupBy to count
        const distinctServices = await db.ping.groupBy({
            by: ['service_id'],
            where: { created_at: { gte: startDate } }
        });

        res.json({
            services_checked: distinctServices.length,
            total_checks: totalChecks,
            up_count: upChecks,
            down_count: downChecks,
            avg_response_time: avgAgg._avg.response_time || 0
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
