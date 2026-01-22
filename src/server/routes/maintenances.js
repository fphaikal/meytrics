import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get upcoming/active maintenances (public)
router.get('/public', async (req, res) => {
    try {
        const maintenances = await db.maintenance.findMany({
            where: {
                end_time: { gt: new Date() }
            },
            orderBy: { start_time: 'asc' },
            include: {
                services: {
                    include: {
                        service: { select: { name: true } }
                    }
                }
            }
        });

        const formatted = maintenances.map(m => ({
            ...m,
            affected_services: m.services.map(s => s.service.name)
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching maintenances:', error);
        res.status(500).json({ error: 'Failed to fetch maintenances' });
    }
});

// Get all maintenances (admin)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const maintenances = await db.maintenance.findMany({
            orderBy: { start_time: 'desc' },
            include: {
                services: {
                    include: {
                        service: { select: { name: true } }
                    }
                }
            }
        });

        const formatted = maintenances.map(m => ({
            ...m,
            service_ids: m.services.map(s => s.service_id),
            affected_services: m.services.map(s => s.service.name)
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching maintenances:', error);
        res.status(500).json({ error: 'Failed to fetch maintenances' });
    }
});

// Create maintenance
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, description, start_time, end_time, service_ids } = req.body;

        if (!title || !start_time || !end_time) {
            return res.status(400).json({ error: 'Title, start_time, and end_time are required' });
        }

        const maintenance = await db.maintenance.create({
            data: {
                title,
                description: description || '',
                start_time: new Date(start_time),
                end_time: new Date(end_time),
                services: service_ids && service_ids.length > 0 ? {
                    create: service_ids.map(id => ({ service_id: id }))
                } : undefined
            },
            include: { services: true }
        });

        res.status(201).json(maintenance);
    } catch (error) {
        console.error('Error creating maintenance:', error);
        res.status(500).json({ error: 'Failed to create maintenance' });
    }
});

// Update maintenance
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const maintenanceId = parseInt(id);
        const { title, description, start_time, end_time, service_ids } = req.body;

        const updatedMaintenance = await db.$transaction(async (tx) => {
            const updated = await tx.maintenance.update({
                where: { id: maintenanceId },
                data: {
                    title,
                    description,
                    start_time: start_time ? new Date(start_time) : undefined,
                    end_time: end_time ? new Date(end_time) : undefined
                }
            });

            if (service_ids !== undefined) {
                await tx.maintenanceService.deleteMany({ where: { maintenance_id: maintenanceId } });
                if (service_ids.length > 0) {
                    await tx.maintenanceService.createMany({
                        data: service_ids.map(sid => ({
                            maintenance_id: maintenanceId,
                            service_id: sid
                        }))
                    });
                }
            }
            return updated;
        });

        const finalMaintenance = await db.maintenance.findUnique({
            where: { id: maintenanceId },
            include: { services: true }
        });

        res.json(finalMaintenance);
    } catch (error) {
        console.error('Error updating maintenance:', error);
        res.status(500).json({ error: 'Failed to update maintenance' });
    }
});

// Delete maintenance
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await db.maintenance.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting maintenance:', error);
        res.status(500).json({ error: 'Failed to delete maintenance' });
    }
});

export default router;
