import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Get all tags
router.get('/', (req, res) => {
  try {
    const tags = db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create tag
router.post('/', (req, res) => {
  try {
    const { name, color = '#6366f1' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color);
    const newTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newTag);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Tag already exists' });
    }
    console.error('Create tag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update tag
router.put('/:id', (req, res) => {
  try {
    const { name, color } = req.body;
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(
      name || tag.name,
      color || tag.color,
      req.params.id
    );

    const updatedTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
    res.json(updatedTag);
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete tag
router.delete('/:id', (req, res) => {
  try {
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tags for a service
router.get('/service/:serviceId', (req, res) => {
  try {
    const tags = db.prepare(`
            SELECT t.* FROM tags t
            JOIN service_tags st ON t.id = st.tag_id
            WHERE st.service_id = ?
            ORDER BY t.name ASC
        `).all(req.params.serviceId);
    res.json(tags);
  } catch (error) {
    console.error('Get service tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk add/remove tags for services
router.post('/services/bulk', (req, res) => {
  try {
    const { service_ids, tag_ids, action = 'add' } = req.body;

    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: 'service_ids array is required' });
    }
    if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
      return res.status(400).json({ error: 'tag_ids array is required' });
    }

    if (action === 'add') {
      const stmt = db.prepare('INSERT OR IGNORE INTO service_tags (service_id, tag_id) VALUES (?, ?)');
      const addMany = db.transaction(() => {
        for (const serviceId of service_ids) {
          for (const tagId of tag_ids) {
            stmt.run(serviceId, tagId);
          }
        }
      });
      addMany();
      res.json({ message: `Added tags to ${service_ids.length} services` });
    } else if (action === 'remove') {
      const stmt = db.prepare('DELETE FROM service_tags WHERE service_id = ? AND tag_id = ?');
      const removeMany = db.transaction(() => {
        for (const serviceId of service_ids) {
          for (const tagId of tag_ids) {
            stmt.run(serviceId, tagId);
          }
        }
      });
      removeMany();
      res.json({ message: `Removed tags from ${service_ids.length} services` });
    } else {
      return res.status(400).json({ error: 'action must be "add" or "remove"' });
    }
  } catch (error) {
    console.error('Bulk tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
