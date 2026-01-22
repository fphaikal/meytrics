import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all categories (public)
router.get('/public', async (req, res) => {
    try {
        const categories = await db.category.findMany({
            orderBy: [
                { sort_order: 'asc' },
                { name: 'asc' }
            ],
            include: {
                _count: {
                    select: { services: true }
                }
            }
        });

        const formatted = categories.map(c => ({
            ...c,
            service_count: c._count.services
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get all categories (admin)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const categories = await db.category.findMany({
            orderBy: [
                { sort_order: 'asc' },
                { name: 'asc' }
            ],
            include: {
                _count: {
                    select: { services: true }
                }
            }
        });

        const formatted = categories.map(c => ({
            ...c,
            service_count: c._count.services
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create category
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, description, sort_order } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const category = await db.category.create({
            data: {
                name,
                description: description || '',
                sort_order: sort_order || 0
            }
        });

        res.status(201).json(category);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// Update category
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, sort_order } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const category = await db.category.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description: description || '',
                sort_order: sort_order || 0
            }
        });

        res.json(category);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// Delete category
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if has services? SQLite logic didn't seem to block or cascade explicitly in route, 
        // relying on schema constraint (SET NULL or RESTRICT).
        // Let's assume Prisma delete checks constraints.

        await db.category.delete({
            where: { id: parseInt(id) }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

export default router;
