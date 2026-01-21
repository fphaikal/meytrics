import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get upcoming/active maintenances (public)
router.get('/public', (req, res) => {
    try {
        const maintenances = db.prepare(`
            SELECT m.*, 
                GROUP_CONCAT(s.name) as affected_services
            FROM maintenances m
            LEFT JOIN maintenance_services ms ON ms.maintenance_id = m.id
            LEFT JOIN services s ON s.id = ms.service_id
            WHERE m.end_time > datetime('now')
            GROUP BY m.id
            ORDER BY m.start_time ASC
        `).all();

        for (const maintenance of maintenances) {
            maintenance.affected_services = maintenance.affected_services ? maintenance.affected_services.split(',') : [];
        }

        res.json(maintenances);
    } catch (error) {
        console.error('Error fetching maintenances:', error);
        res.status(500).json({ error: 'Failed to fetch maintenances' });
    }
});

// Get all maintenances (admin)
router.get('/', authMiddleware, (req, res) => {
    try {
        const maintenances = db.prepare(`
            SELECT m.*, 
                GROUP_CONCAT(ms.service_id) as service_ids,
                GROUP_CONCAT(s.name) as affected_services
            FROM maintenances m
            LEFT JOIN maintenance_services ms ON ms.maintenance_id = m.id
            LEFT JOIN services s ON s.id = ms.service_id
            GROUP BY m.id
            ORDER BY m.start_time DESC
        `).all();

        for (const maintenance of maintenances) {
            maintenance.service_ids = maintenance.service_ids ? maintenance.service_ids.split(',').map(Number) : [];
            maintenance.affected_services = maintenance.affected_services ? maintenance.affected_services.split(',') : [];
        }

        res.json(maintenances);
    } catch (error) {
        console.error('Error fetching maintenances:', error);
        res.status(500).json({ error: 'Failed to fetch maintenances' });
    }
});

// Create maintenance
router.post('/', authMiddleware, (req, res) => {
    try {
        const { title, description, start_time, end_time, service_ids } = req.body;

        if (!title || !start_time || !end_time) {
            return res.status(400).json({ error: 'Title, start_time, and end_time are required' });
        }

        const result = db.prepare(`
            INSERT INTO maintenances (title, description, start_time, end_time)
            VALUES (?, ?, ?, ?)
        `).run(title, description || '', start_time, end_time);

        const maintenanceId = result.lastInsertRowid;

        // Link services
        if (service_ids && service_ids.length > 0) {
            const insertService = db.prepare('INSERT INTO maintenance_services (maintenance_id, service_id) VALUES (?, ?)');
            for (const serviceId of service_ids) {
                insertService.run(maintenanceId, serviceId);
            }
        }

        const maintenance = db.prepare('SELECT * FROM maintenances WHERE id = ?').get(maintenanceId);
        res.status(201).json(maintenance);
    } catch (error) {
        console.error('Error creating maintenance:', error);
        res.status(500).json({ error: 'Failed to create maintenance' });
    }
});

// Update maintenance
router.put('/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, start_time, end_time, service_ids } = req.body;

        db.prepare(`
            UPDATE maintenances 
            SET title = ?, description = ?, start_time = ?, end_time = ?
            WHERE id = ?
        `).run(title, description, start_time, end_time, id);

        // Update service links
        if (service_ids !== undefined) {
            db.prepare('DELETE FROM maintenance_services WHERE maintenance_id = ?').run(id);
            if (service_ids.length > 0) {
                const insertService = db.prepare('INSERT INTO maintenance_services (maintenance_id, service_id) VALUES (?, ?)');
                for (const serviceId of service_ids) {
                    insertService.run(id, serviceId);
                }
            }
        }

        const maintenance = db.prepare('SELECT * FROM maintenances WHERE id = ?').get(id);
        res.json(maintenance);
    } catch (error) {
        console.error('Error updating maintenance:', error);
        res.status(500).json({ error: 'Failed to update maintenance' });
    }
});

// Delete maintenance
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM maintenances WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting maintenance:', error);
        res.status(500).json({ error: 'Failed to delete maintenance' });
    }
});

export default router;
