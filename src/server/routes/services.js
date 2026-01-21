import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Get all services with latest status
router.get('/', (req, res) => {
    try {
        const services = db.prepare(`
      SELECT 
        s.*,
        (SELECT status FROM pings WHERE service_id = s.id ORDER BY created_at DESC LIMIT 1) as current_status,
        (SELECT response_time FROM pings WHERE service_id = s.id ORDER BY created_at DESC LIMIT 1) as last_response_time,
        (SELECT created_at FROM pings WHERE service_id = s.id ORDER BY created_at DESC LIMIT 1) as last_check
      FROM services s
      ORDER BY s.created_at ASC
    `).all();

        // Calculate uptime percentage for each service (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const servicesWithUptime = services.map(service => {
            const stats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_count
        FROM pings 
        WHERE service_id = ? AND created_at >= ?
      `).get(service.id, thirtyDaysAgo.toISOString());

            const uptimePercent = stats.total > 0
                ? ((stats.up_count / stats.total) * 100).toFixed(3)
                : '100.000';

            return {
                ...service,
                // Override current_status to 'paused' if service is paused
                current_status: service.paused ? 'paused' : service.current_status,
                uptime_percent: uptimePercent
            };
        });

        res.json(servicesWithUptime);
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single service
router.get('/:id', (req, res) => {
    try {
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);

        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        res.json(service);
    } catch (error) {
        console.error('Get service error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create service
router.post('/', (req, res) => {
    try {
        const {
            name, url, type = 'http', interval = 300, notify_down = true,
            timeout = 30, slow_threshold, http_method = 'GET', custom_headers = {},
            follow_redirects = true, auth_type = 'none', auth_user, auth_pass,
            notification_repeat = 0, notification_delay = 0
        } = req.body;

        if (!name || !url) {
            return res.status(400).json({ error: 'Name and URL are required' });
        }

        // Validate minimum interval (60 seconds = 1 minute)
        const validInterval = Math.max(60, parseInt(interval) || 300);
        const validTimeout = Math.min(60, Math.max(1, parseInt(timeout) || 30));

        const result = db.prepare(`
      INSERT INTO services (name, url, type, interval, notify_down, timeout, slow_threshold, http_method, custom_headers, follow_redirects, auth_type, auth_user, auth_pass, notification_repeat, notification_delay)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            name, url, type, validInterval, notify_down ? 1 : 0,
            validTimeout, slow_threshold || null, http_method,
            JSON.stringify(custom_headers), follow_redirects ? 1 : 0,
            auth_type, auth_user || null, auth_pass || null,
            parseInt(notification_repeat) || 0, parseInt(notification_delay) || 0
        );

        const newService = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newService);
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update service
router.put('/:id', (req, res) => {
    try {
        const {
            name, url, type, interval, notify_down, category_id, paused,
            timeout, slow_threshold, http_method, custom_headers,
            follow_redirects, auth_type, auth_user, auth_pass,
            notification_repeat, notification_delay
        } = req.body;
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);

        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        // Validate minimum interval (60 seconds = 1 minute)
        const validInterval = interval !== undefined
            ? Math.max(60, parseInt(interval) || 300)
            : service.interval;

        // Validate timeout (1-60 seconds)
        const validTimeout = timeout !== undefined
            ? Math.min(60, Math.max(1, parseInt(timeout) || 30))
            : service.timeout;

        db.prepare(`
      UPDATE services 
      SET name = ?, url = ?, type = ?, interval = ?, notify_down = ?, category_id = ?, paused = ?,
          timeout = ?, slow_threshold = ?, http_method = ?, custom_headers = ?,
          follow_redirects = ?, auth_type = ?, auth_user = ?, auth_pass = ?,
          notification_repeat = ?, notification_delay = ?
      WHERE id = ?
    `).run(
            name || service.name,
            url || service.url,
            type || service.type,
            validInterval,
            notify_down !== undefined ? (notify_down ? 1 : 0) : service.notify_down,
            category_id !== undefined ? category_id : service.category_id,
            paused !== undefined ? (paused ? 1 : 0) : service.paused,
            validTimeout,
            slow_threshold !== undefined ? slow_threshold : service.slow_threshold,
            http_method || service.http_method,
            custom_headers !== undefined ? JSON.stringify(custom_headers) : service.custom_headers,
            follow_redirects !== undefined ? (follow_redirects ? 1 : 0) : service.follow_redirects,
            auth_type || service.auth_type,
            auth_user !== undefined ? auth_user : service.auth_user,
            auth_pass !== undefined ? auth_pass : service.auth_pass,
            notification_repeat !== undefined ? parseInt(notification_repeat) : service.notification_repeat || 0,
            notification_delay !== undefined ? parseInt(notification_delay) : service.notification_delay || 0,
            req.params.id
        );

        const updatedService = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
        res.json(updatedService);
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete service
router.delete('/:id', (req, res) => {
    try {
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);

        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
        res.json({ message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get service incidents
router.get('/:id/incidents', (req, res) => {
    try {
        const incidents = db.prepare(`
            SELECT * FROM service_incidents 
            WHERE service_id = ? 
            ORDER BY started_at DESC 
            LIMIT 50
        `).all(req.params.id);

        res.json(incidents);
    } catch (error) {
        console.error('Get service incidents error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get ALL service incidents (global history)
router.get('/incidents/history', (req, res) => {
    try {
        const incidents = db.prepare(`
            SELECT si.*, s.name as service_name 
            FROM service_incidents si
            JOIN services s ON s.id = si.service_id
            ORDER BY si.started_at DESC 
            LIMIT 100
        `).all();

        res.json(incidents);
    } catch (error) {
        console.error('Get global incidents error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single incident by ID
router.get('/incidents/:id', (req, res) => {
    try {
        const incident = db.prepare(`
            SELECT si.*, s.name as service_name, s.url as service_url, s.type as service_type
            FROM service_incidents si
            JOIN services s ON s.id = si.service_id
            WHERE si.id = ?
        `).get(req.params.id);

        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        res.json(incident);
    } catch (error) {
        console.error('Get incident error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============ BULK ACTIONS ============

// Bulk update category
router.post('/bulk/category', (req, res) => {
    try {
        const { service_ids, category_id } = req.body;
        if (!Array.isArray(service_ids) || service_ids.length === 0) {
            return res.status(400).json({ error: 'service_ids array is required' });
        }

        const stmt = db.prepare('UPDATE services SET category_id = ? WHERE id = ?');
        const updateMany = db.transaction((ids) => {
            for (const id of ids) {
                stmt.run(category_id, id);
            }
        });
        updateMany(service_ids);

        res.json({ message: `Updated category for ${service_ids.length} services` });
    } catch (error) {
        console.error('Bulk update category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Bulk pause services
router.post('/bulk/pause', (req, res) => {
    try {
        const { service_ids } = req.body;
        if (!Array.isArray(service_ids) || service_ids.length === 0) {
            return res.status(400).json({ error: 'service_ids array is required' });
        }

        const stmt = db.prepare('UPDATE services SET paused = 1 WHERE id = ?');
        const pauseMany = db.transaction((ids) => {
            for (const id of ids) {
                stmt.run(id);
            }
        });
        pauseMany(service_ids);

        res.json({ message: `Paused ${service_ids.length} services` });
    } catch (error) {
        console.error('Bulk pause error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Bulk start services
router.post('/bulk/start', (req, res) => {
    try {
        const { service_ids } = req.body;
        if (!Array.isArray(service_ids) || service_ids.length === 0) {
            return res.status(400).json({ error: 'service_ids array is required' });
        }

        const stmt = db.prepare('UPDATE services SET paused = 0 WHERE id = ?');
        const startMany = db.transaction((ids) => {
            for (const id of ids) {
                stmt.run(id);
            }
        });
        startMany(service_ids);

        res.json({ message: `Started ${service_ids.length} services` });
    } catch (error) {
        console.error('Bulk start error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Bulk reset stats (delete pings)
router.post('/bulk/reset-stats', (req, res) => {
    try {
        const { service_ids } = req.body;
        if (!Array.isArray(service_ids) || service_ids.length === 0) {
            return res.status(400).json({ error: 'service_ids array is required' });
        }

        const stmt = db.prepare('DELETE FROM pings WHERE service_id = ?');
        const resetMany = db.transaction((ids) => {
            for (const id of ids) {
                stmt.run(id);
            }
        });
        resetMany(service_ids);

        res.json({ message: `Reset stats for ${service_ids.length} services` });
    } catch (error) {
        console.error('Bulk reset stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Bulk delete services
router.delete('/bulk', (req, res) => {
    try {
        const { service_ids } = req.body;
        if (!Array.isArray(service_ids) || service_ids.length === 0) {
            return res.status(400).json({ error: 'service_ids array is required' });
        }

        const stmt = db.prepare('DELETE FROM services WHERE id = ?');
        const deleteMany = db.transaction((ids) => {
            for (const id of ids) {
                stmt.run(id);
            }
        });
        deleteMany(service_ids);

        res.json({ message: `Deleted ${service_ids.length} services` });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

