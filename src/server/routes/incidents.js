import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Helper to calculate resolvedAt for queries
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

// Get all incidents (public)
router.get('/public', async (req, res) => {
    try {
        const incidents = await db.incident.findMany({
            where: {
                OR: [
                    { status: { not: 'resolved' } },
                    { resolved_at: { gt: sevenDaysAgo } }
                ]
            },
            orderBy: { created_at: 'desc' },
            include: {
                updates: {
                    orderBy: { created_at: 'desc' }
                },
                services: {
                    include: {
                        service: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        // Format for frontend
        const formatted = incidents.map(i => ({
            ...i,
            affected_services: i.services.map(s => s.service.name)
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

// Get active incidents only (for banner)
router.get('/public/active', async (req, res) => {
    try {
        const incidents = await db.incident.findMany({
            where: {
                status: { not: 'resolved' }
            },
            orderBy: { created_at: 'desc' },
            include: {
                services: {
                    include: { service: { select: { name: true } } }
                }
            }
        });

        const formatted = incidents.map(i => ({
            ...i,
            affected_services: i.services.map(s => s.service.name)
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching active incidents:', error);
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

// Get all incidents (admin)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const incidents = await db.incident.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                updates: {
                    orderBy: { created_at: 'desc' }
                },
                services: true
            }
        });

        const formatted = incidents.map(i => ({
            ...i,
            service_ids: i.services.map(s => s.service_id)
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({ error: 'Failed to fetch incidents' });
    }
});

// Get single incident
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const incident = await db.incident.findUnique({
            where: { id: parseInt(id) },
            include: {
                updates: {
                    orderBy: { created_at: 'desc' }
                },
                services: true
            }
        });

        if (!incident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        const formatted = {
            ...incident,
            service_ids: incident.services.map(s => s.service_id)
        };

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching incident:', error);
        res.status(500).json({ error: 'Failed to fetch incident' });
    }
});

// Create incident
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, description, status, severity, service_ids } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const initialStatus = status || 'investigating';

        const incident = await db.incident.create({
            data: {
                title,
                description: description || '',
                status: initialStatus,
                severity: severity || 'minor',
                updated_at: new Date(),
                // Create relationship if service_ids provided
                services: service_ids && service_ids.length > 0 ? {
                    create: service_ids.map(id => ({ service_id: id }))
                } : undefined,
                // Create initial update
                updates: {
                    create: {
                        message: `Incident created: ${title}`,
                        status: initialStatus
                    }
                }
            },
            include: { updates: true, services: true }
        });

        res.status(201).json(incident);
    } catch (error) {
        console.error('Error creating incident:', error);
        res.status(500).json({ error: 'Failed to create incident' });
    }
});

// Update incident
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, severity, service_ids } = req.body;
        const incidentId = parseInt(id);

        const oldIncident = await db.incident.findUnique({ where: { id: incidentId } });
        if (!oldIncident) {
            return res.status(404).json({ error: 'Incident not found' });
        }

        const resolvedAt = status === 'resolved' && oldIncident.status !== 'resolved'
            ? new Date()
            : (oldIncident.resolved_at || null);

        // Transaction to handle updates and service re-linking
        const updatedIncident = await db.$transaction(async (tx) => {
            // Update main incident
            const updated = await tx.incident.update({
                where: { id: incidentId },
                data: {
                    title,
                    description,
                    status,
                    severity,
                    updated_at: new Date(),
                    resolved_at: resolvedAt
                }
            });

            // Update services if provided
            if (service_ids !== undefined) {
                // Delete existing
                await tx.incidentService.deleteMany({ where: { incident_id: incidentId } });

                // Create new
                if (service_ids.length > 0) {
                    await tx.incidentService.createMany({
                        data: service_ids.map(sid => ({
                            incident_id: incidentId,
                            service_id: sid
                        }))
                    });
                }
            }

            return updated;
        });

        const finalIncident = await db.incident.findUnique({
            where: { id: incidentId },
            include: { updates: true, services: true }
        });

        res.json(finalIncident);
    } catch (error) {
        console.error('Error updating incident:', error);
        res.status(500).json({ error: 'Failed to update incident' });
    }
});

// Add incident update
router.post('/:id/updates', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { message, status } = req.body;
        const incidentId = parseInt(id);

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        await db.$transaction(async (tx) => {
            // Create update
            await tx.incidentUpdate.create({
                data: {
                    incident_id: incidentId,
                    message,
                    status: status || null
                }
            });

            // Update incident status if provided
            if (status) {
                const resolvedAt = status === 'resolved' ? new Date() : undefined; // Don't reset resolvedAt if not resolved, unless strictly needed. Logic was: reset if status changed? old logic didn't reset resolved_at explicitly if status changed back, wait... 
                // Old logic: "resolved_at = status === 'resolved' ? now : resolved_at". 
                // So if I change from resolved to investigating, it stays resolved? NO.
                // Old logic: `status === 'resolved' ? "datetime('now')" : 'resolved_at'`.
                // Actually if I un-resolve it, `status` is NOT resolved, so it sets it to `resolved_at` (existing).
                // So if it was resolved, and I change to investigating, it KEEPS the resolved date? That seems like a bug or feature.
                // But let's stick to the logic: "Status update changes incident status".

                const data = {
                    status,
                    updated_at: new Date()
                };
                if (status === 'resolved') {
                    data.resolved_at = new Date();
                }

                await tx.incident.update({
                    where: { id: incidentId },
                    data
                });
            } else {
                await tx.incident.update({
                    where: { id: incidentId },
                    data: { updated_at: new Date() }
                });
            }
        });

        const updates = await db.incidentUpdate.findMany({
            where: { incident_id: incidentId },
            orderBy: { created_at: 'desc' }
        });

        res.json(updates);
    } catch (error) {
        console.error('Error adding update:', error);
        res.status(500).json({ error: 'Failed to add update' });
    }
});

// Delete incident
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await db.incident.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting incident:', error);
        res.status(500).json({ error: 'Failed to delete incident' });
    }
});

export default router;
