import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all incidents (public)
router.get('/public', (req, res) => {
    try {
        const incidents = db.prepare(`
            SELECT i.*, 
                GROUP_CONCAT(s.name) as affected_services
            FROM incidents i
            LEFT JOIN incident_services ise ON ise.incident_id = i.id
            LEFT JOIN services s ON s.id = ise.service_id
            WHERE i.status != 'resolved' OR i.resolved_at > datetime('now', '-7 days')
            GROUP BY i.id
            ORDER BY i.created_at DESC
        `).all();

        // Get updates for each incident
        for (const incident of incidents) {
            incident.updates = db.prepare(`
                SELECT * FROM incident_updates
                WHERE incident_id = ?
                ORDER BY created_at DESC
            `).all(incident.id);
            incident.affected_services = incident.affected_services ? incident.affected_services.split(',') : [];
        }

        res.json(incidents);
    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

// Get active incidents only (for banner)
router.get('/public/active', (req, res) => {
    try {
        const incidents = db.prepare(`
            SELECT i.*, 
                GROUP_CONCAT(s.name) as affected_services
            FROM incidents i
            LEFT JOIN incident_services ise ON ise.incident_id = i.id
            LEFT JOIN services s ON s.id = ise.service_id
            WHERE i.status != 'resolved'
            GROUP BY i.id
            ORDER BY i.created_at DESC
        `).all();

        for (const incident of incidents) {
            incident.affected_services = incident.affected_services ? incident.affected_services.split(',') : [];
        }

        res.json(incidents);
    } catch (error) {
        console.error('Error fetching active incidents:', error);
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

// Get all incidents (admin)
router.get('/', authMiddleware, (req, res) => {
    try {
        const incidents = db.prepare(`
            SELECT i.*, 
                GROUP_CONCAT(ise.service_id) as service_ids
            FROM incidents i
            LEFT JOIN incident_services ise ON ise.incident_id = i.id
            GROUP BY i.id
            ORDER BY i.created_at DESC
        `).all();

        for (const incident of incidents) {
            incident.updates = db.prepare(`
                SELECT * FROM incident_updates
                WHERE incident_id = ?
                ORDER BY created_at DESC
            `).all(incident.id);
            incident.service_ids = incident.service_ids ? incident.service_ids.split(',').map(Number) : [];
        }

        res.json(incidents);
    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

// Get single incident
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const incident = db.prepare(`
            SELECT i.*, 
                GROUP_CONCAT(ise.service_id) as service_ids
            FROM incidents i
            LEFT JOIN incident_services ise ON ise.incident_id = i.id
            WHERE i.id = ?
            GROUP BY i.id
        `).get(id);

        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        incident.updates = db.prepare(`
            SELECT * FROM incident_updates
            WHERE incident_id = ?
            ORDER BY created_at DESC
        `).all(id);
        incident.service_ids = incident.service_ids ? incident.service_ids.split(',').map(Number) : [];

        res.json(incident);
    } catch (error) {
        console.error('Error fetching incident:', error);
        res.status(500).json({ error: 'Failed to fetch incident' });
    }
});

// Create incident
router.post('/', authMiddleware, (req, res) => {
    try {
        const { title, description, status, severity, service_ids } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const result = db.prepare(`
            INSERT INTO incidents (title, description, status, severity, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `).run(
            title,
            description || '',
            status || 'investigating',
            severity || 'minor'
        );

        const incidentId = result.lastInsertRowid;

        // Link services
        if (service_ids && service_ids.length > 0) {
            const insertService = db.prepare('INSERT INTO incident_services (incident_id, service_id) VALUES (?, ?)');
            for (const serviceId of service_ids) {
                insertService.run(incidentId, serviceId);
            }
        }

        // Create initial update
        db.prepare(`
            INSERT INTO incident_updates (incident_id, message, status)
            VALUES (?, ?, ?)
        `).run(incidentId, `Incident created: ${title}`, status || 'investigating');

        const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId);
        res.status(201).json(incident);
    } catch (error) {
        console.error('Error creating incident:', error);
        res.status(500).json({ error: 'Failed to create incident' });
    }
});

// Update incident
router.put('/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, severity, service_ids } = req.body;

        const oldIncident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
        if (!oldIncident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        const resolvedAt = status === 'resolved' && oldIncident.status !== 'resolved'
            ? "datetime('now')"
            : oldIncident.resolved_at ? `'${oldIncident.resolved_at}'` : 'NULL';

        db.prepare(`
            UPDATE incidents 
            SET title = ?, description = ?, status = ?, severity = ?, 
                updated_at = datetime('now'),
                resolved_at = ${resolvedAt}
            WHERE id = ?
        `).run(title, description, status, severity, id);

        // Update service links
        if (service_ids !== undefined) {
            db.prepare('DELETE FROM incident_services WHERE incident_id = ?').run(id);
            if (service_ids.length > 0) {
                const insertService = db.prepare('INSERT INTO incident_services (incident_id, service_id) VALUES (?, ?)');
                for (const serviceId of service_ids) {
                    insertService.run(id, serviceId);
                }
            }
        }

        const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
        res.json(incident);
    } catch (error) {
        console.error('Error updating incident:', error);
        res.status(500).json({ error: 'Failed to update incident' });
    }
});

// Add incident update
router.post('/:id/updates', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        const { message, status } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        db.prepare(`
            INSERT INTO incident_updates (incident_id, message, status)
            VALUES (?, ?, ?)
        `).run(id, message, status || null);

        // Update incident status if provided
        if (status) {
            const resolvedAt = status === 'resolved' ? "datetime('now')" : 'resolved_at';
            db.prepare(`
                UPDATE incidents 
                SET status = ?, updated_at = datetime('now'),
                    resolved_at = ${status === 'resolved' ? "datetime('now')" : 'resolved_at'}
                WHERE id = ?
            `).run(status, id);
        } else {
            db.prepare(`UPDATE incidents SET updated_at = datetime('now') WHERE id = ?`).run(id);
        }

        const updates = db.prepare('SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at DESC').all(id);
        res.json(updates);
    } catch (error) {
        console.error('Error adding update:', error);
        res.status(500).json({ error: 'Failed to add update' });
    }
});

// Delete incident
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM incidents WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting incident:', error);
        res.status(500).json({ error: 'Failed to delete incident' });
    }
});

export default router;
