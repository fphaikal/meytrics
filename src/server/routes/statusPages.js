import express from 'express';
import { db } from '../db.js';
import {
  getAllStatusPages,
  getStatusPageById,
  getStatusPageBySlug,
  getDefaultStatusPage,
  createStatusPage,
  updateStatusPage,
  deleteStatusPage,
  getServicesForStatusPage,
  getServiceIdsForStatusPage,
  assignServiceToStatusPage,
  removeServiceFromStatusPage,
  updateStatusPageServices
} from '../services/statusPageService.js';

const router = express.Router();

// Get all status pages (admin)
router.get('/', (req, res) => {
  try {
    const pages = getAllStatusPages();
    res.json(pages.map(p => ({
      ...p,
      is_default: !!p.is_default,
      is_public: !!p.is_public
    })));
  } catch (error) {
    console.error('Error fetching status pages:', error);
    res.status(500).json({ error: 'Failed to fetch status pages' });
  }
});

// Get status page by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const page = getStatusPageById(parseInt(id));

    if (!page) {
      return res.status(404).json({ error: 'Status page not found' });
    }

    res.json({
      ...page,
      is_default: !!page.is_default,
      is_public: !!page.is_public
    });
  } catch (error) {
    console.error('Error fetching status page:', error);
    res.status(500).json({ error: 'Failed to fetch status page' });
  }
});

// Create status page
router.post('/', (req, res) => {
  try {
    const { slug, name } = req.body;

    if (!slug || !name) {
      return res.status(400).json({ error: 'Slug and name are required' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
    }

    const page = createStatusPage(req.body);
    res.status(201).json({
      ...page,
      is_default: !!page.is_default,
      is_public: !!page.is_public
    });
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'A status page with this slug already exists' });
    }
    console.error('Error creating status page:', error);
    res.status(500).json({ error: 'Failed to create status page' });
  }
});

// Update status page
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const page = updateStatusPage(parseInt(id), req.body);

    if (!page) {
      return res.status(404).json({ error: 'Status page not found' });
    }

    res.json({
      ...page,
      is_default: !!page.is_default,
      is_public: !!page.is_public
    });
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'A status page with this slug already exists' });
    }
    console.error('Error updating status page:', error);
    res.status(500).json({ error: 'Failed to update status page' });
  }
});

// Delete status page
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteStatusPage(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting status page:', error);
    res.status(500).json({ error: 'Failed to delete status page' });
  }
});

// Get services for a status page
router.get('/:id/services', (req, res) => {
  try {
    const { id } = req.params;
    const services = getServicesForStatusPage(parseInt(id));
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get service IDs for a status page
router.get('/:id/service-ids', (req, res) => {
  try {
    const { id } = req.params;
    const serviceIds = getServiceIdsForStatusPage(parseInt(id));
    res.json(serviceIds);
  } catch (error) {
    console.error('Error fetching service IDs:', error);
    res.status(500).json({ error: 'Failed to fetch service IDs' });
  }
});

// Update services for a status page (bulk update)
router.put('/:id/services', (req, res) => {
  try {
    const { id } = req.params;
    const { service_ids } = req.body;

    if (!Array.isArray(service_ids)) {
      return res.status(400).json({ error: 'service_ids must be an array' });
    }

    const result = updateStatusPageServices(parseInt(id), service_ids);
    res.json({ success: true, service_ids: result });
  } catch (error) {
    console.error('Error updating services:', error);
    res.status(500).json({ error: 'Failed to update services' });
  }
});

// Assign service to status page
router.post('/:id/services/:serviceId', (req, res) => {
  try {
    const { id, serviceId } = req.params;
    assignServiceToStatusPage(parseInt(serviceId), parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error assigning service:', error);
    res.status(500).json({ error: 'Failed to assign service' });
  }
});

// Remove service from status page
router.delete('/:id/services/:serviceId', (req, res) => {
  try {
    const { id, serviceId } = req.params;
    removeServiceFromStatusPage(parseInt(serviceId), parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing service:', error);
    res.status(500).json({ error: 'Failed to remove service' });
  }
});

// ==================== SECTIONS ROUTES ====================
import {
  getSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  updateSectionOrder,
  assignServiceToSection,
  getSectionsWithServices
} from '../services/statusPageSectionsService.js';

// Get all sections for a status page (with services)
router.get('/:id/sections', (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Getting sections for status page ${id}`);
    const sections = getSectionsWithServices(parseInt(id));
    console.log(`Found ${sections.length} sections`);
    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch sections', details: error.message });
  }
});

// Create a new section
router.post('/:id/sections', (req, res) => {
  try {
    const { id } = req.params;
    const { name, display_order } = req.body;

    const section = createSection(parseInt(id), name || '', display_order || 0);
    res.status(201).json(section);
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// Update section
router.put('/:id/sections/:sectionId', (req, res) => {
  try {
    const { sectionId } = req.params;
    const section = updateSection(parseInt(sectionId), req.body);

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json(section);
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// Delete section
router.delete('/:id/sections/:sectionId', (req, res) => {
  try {
    const { sectionId } = req.params;
    deleteSection(parseInt(sectionId));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// Update section order (bulk)
router.put('/:id/sections/order', (req, res) => {
  try {
    const { id } = req.params;
    const { section_ids } = req.body;

    if (!Array.isArray(section_ids)) {
      return res.status(400).json({ error: 'section_ids must be an array' });
    }

    updateSectionOrder(parseInt(id), section_ids);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating section order:', error);
    res.status(500).json({ error: 'Failed to update section order' });
  }
});

// Assign service to section
router.put('/:id/services/:serviceId/section', (req, res) => {
  try {
    const { id, serviceId } = req.params;
    const { section_id, display_options } = req.body;

    assignServiceToSection(parseInt(id), parseInt(serviceId), section_id, display_options);
    res.json({ success: true });
  } catch (error) {
    console.error('Error assigning service to section:', error);
    res.status(500).json({ error: 'Failed to assign service to section' });
  }
});

// Update service sort order within a section
router.put('/:id/services/:serviceId/order', (req, res) => {
  try {
    const { id, serviceId } = req.params;
    const { sort_order } = req.body;

    db.prepare('UPDATE status_page_services SET sort_order = ? WHERE status_page_id = ? AND service_id = ?')
      .run(sort_order, parseInt(id), parseInt(serviceId));
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating service order:', error);
    res.status(500).json({ error: 'Failed to update service order' });
  }
});

export default router;

