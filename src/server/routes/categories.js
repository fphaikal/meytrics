import express from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all categories (public)
router.get('/public', (req, res) => {
    try {
        const categories = db.prepare(`
            SELECT c.*, COUNT(s.id) as service_count
            FROM categories c
            LEFT JOIN services s ON s.category_id = c.id
            GROUP BY c.id
            ORDER BY c.sort_order ASC, c.name ASC
        `).all();
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get all categories (admin)
router.get('/', authMiddleware, (req, res) => {
    try {
        const categories = db.prepare(`
            SELECT c.*, COUNT(s.id) as service_count
            FROM categories c
            LEFT JOIN services s ON s.category_id = c.id
            GROUP BY c.id
            ORDER BY c.sort_order ASC, c.name ASC
        `).all();
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create category
router.post('/', authMiddleware, (req, res) => {
    try {
        const { name, description, sort_order } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = db.prepare(`
            INSERT INTO categories (name, description, sort_order)
            VALUES (?, ?, ?)
        `).run(name, description || '', sort_order || 0);

        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(category);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// Update category
router.put('/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, sort_order } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        db.prepare(`
            UPDATE categories 
            SET name = ?, description = ?, sort_order = ?
            WHERE id = ?
        `).run(name, description || '', sort_order || 0, id);

        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        res.json(category);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// Delete category
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM categories WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

export default router;
