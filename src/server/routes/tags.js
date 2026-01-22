import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Get all tags
router.get('/', async (req, res) => {
  try {
    const tags = await db.tag.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create tag
router.post('/', async (req, res) => {
  try {
    const { name, color = '#6366f1' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const newTag = await db.tag.create({
      data: {
        name,
        color
      }
    });

    res.status(201).json(newTag);
  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint
      return res.status(400).json({ error: 'Tag already exists' });
    }
    console.error('Create tag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update tag
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    // Check if exists first? Or just update and catch

    const updatedTag = await db.tag.update({
      where: { id: parseInt(id) },
      data: {
        name, // undefined won't update
        color
      }
    });

    res.json(updatedTag);
  } catch (error) {
    if (error.code === 'P2025') { // Record not found
      return res.status(404).json({ error: 'Tag not found' });
    }
    console.error('Update tag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete tag
router.delete('/:id', async (req, res) => {
  try {
    await db.tag.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tag not found' });
    }
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tags for a service
router.get('/service/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    // Join service_tags (implicit or explicit?)
    // Schema likely: Service has tags (m-n).
    // If explicit `service_tags` table:
    const tags = await db.tag.findMany({
      where: {
        services: {
          some: {
            service_id: parseInt(serviceId)
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    // Wait, if services is implicit? Or explicit?
    // In `schema.prisma` from before (Step 1836), it was:
    // model ServiceTag { service_id, tag_id, service Service, tag Tag, @@id([service_id, tag_id]) }
    // model Tag { ..., services ServiceTag[] }
    // So we query ServiceTag

    // Actually simpler: Query Tag where ServiceTags has service_id
    // But `tags` variable implies Tag objects.
    // Let's refine the query.

    const serviceTags = await db.serviceTag.findMany({
      where: { service_id: parseInt(serviceId) },
      include: { tag: true },
      orderBy: { tag: { name: 'asc' } }
    });

    const result = serviceTags.map(st => st.tag);
    res.json(result);
  } catch (error) {
    console.error('Get service tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk add/remove tags for services
router.post('/services/bulk', async (req, res) => {
  try {
    const { service_ids, tag_ids, action = 'add' } = req.body;

    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: 'service_ids array is required' });
    }
    if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
      return res.status(400).json({ error: 'tag_ids array is required' });
    }

    await db.$transaction(async (tx) => {
      if (action === 'add') {
        for (const serviceId of service_ids) {
          for (const tagId of tag_ids) {
            // upsert (or ignore)
            try {
              await tx.serviceTag.create({
                data: {
                  service_id: parseInt(serviceId),
                  tag_id: parseInt(tagId)
                }
              });
            } catch (e) {
              // ignore duplicate
            }
          }
        }
      } else if (action === 'remove') {
        await tx.serviceTag.deleteMany({
          where: {
            service_id: { in: service_ids.map(Number) },
            tag_id: { in: tag_ids.map(Number) }
          }
        });
      }
    });

    res.json({ message: `${action === 'add' ? 'Added' : 'Removed'} tags` });
  } catch (error) {
    console.error('Bulk tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
