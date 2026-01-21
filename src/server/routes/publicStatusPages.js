import express from 'express';
import {
  getStatusPageBySlug,
  getDefaultStatusPage,
  getServicesForStatusPage
} from '../services/statusPageService.js';
import { getSectionsWithServices } from '../services/statusPageSectionsService.js';
import { db } from '../db.js';

const router = express.Router();

// Get status page by slug (public)
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    let page;

    if (slug === 'default') {
      page = getDefaultStatusPage();
    } else {
      page = getStatusPageBySlug(slug);
    }

    if (!page) {
      return res.status(404).json({ error: 'Status page not found' });
    }

    console.log(`[Public Page Access] Slug: ${slug}, ID: ${page.id}, is_public: ${page.is_public}`);

    if (page.is_public !== 1 && page.is_public !== true && page.is_public !== '1') {
      console.log(`[Public Page Access] Access DENIED for ${slug}`);
      return res.status(403).json({ error: 'This status page is not public' });
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

// Get sections with services for public status page
router.get('/:slug/sections', (req, res) => {
  try {
    const { slug } = req.params;
    let page;

    if (slug === 'default') {
      page = getDefaultStatusPage();
    } else {
      page = getStatusPageBySlug(slug);
    }

    if (!page) {
      return res.status(404).json({ error: 'Status page not found' });
    }

    console.log(`[Public Sections Access] Slug: ${slug}, ID: ${page.id}, is_public: ${page.is_public}`);

    if (page.is_public !== 1 && page.is_public !== true && page.is_public !== '1') {
      console.log(`[Public Sections Access] Access DENIED for ${slug}`);
      return res.status(403).json({ error: 'This status page is not public' });
    }

    const sections = getSectionsWithServices(page.id);
    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// Get services for public status page
router.get('/:slug/services', (req, res) => {
  try {
    const { slug } = req.params;
    let page;

    if (slug === 'default') {
      page = getDefaultStatusPage();
    } else {
      page = getStatusPageBySlug(slug);
    }

    if (!page) {
      return res.status(404).json({ error: 'Status page not found' });
    }

    console.log(`[Public Services Access] Slug: ${slug}, ID: ${page.id}, is_public: ${page.is_public}`);

    if (page.is_public !== 1 && page.is_public !== true && page.is_public !== '1') {
      console.log(`[Public Services Access] Access DENIED for ${slug}`);
      return res.status(403).json({ error: 'This status page is not public' });
    }

    // Get services assigned to this status page via junction table
    // If it's the default page and no services are assigned, show all services
    const assignedServices = db.prepare(`
        SELECT s.*, c.name as category_name, sps.sort_order,
            (SELECT status FROM pings WHERE service_id = s.id ORDER BY created_at DESC LIMIT 1) as current_status,
            (SELECT response_time FROM pings WHERE service_id = s.id ORDER BY created_at DESC LIMIT 1) as latest_response_time,
            (SELECT ROUND((COUNT(CASE WHEN status = 'up' THEN 1 END) * 100.0) / COUNT(*), 2) FROM pings WHERE service_id = s.id AND created_at >= datetime('now', '-30 days')) as uptime_percent
        FROM services s
        LEFT JOIN categories c ON s.category_id = c.id
        INNER JOIN status_page_services sps ON s.id = sps.service_id
        WHERE sps.status_page_id = ?
        ORDER BY sps.sort_order ASC, c.sort_order, s.name
    `).all(page.id);

    // If no services are explicitly assigned and it's the default page, show all services
    if (assignedServices.length === 0 && page.is_default) {
      const allServices = db.prepare(`
          SELECT s.*, c.name as category_name,
              (SELECT status FROM pings WHERE service_id = s.id ORDER BY created_at DESC LIMIT 1) as current_status,
              (SELECT response_time FROM pings WHERE service_id = s.id ORDER BY created_at DESC LIMIT 1) as latest_response_time,
              (SELECT ROUND((COUNT(CASE WHEN status = 'up' THEN 1 END) * 100.0) / COUNT(*), 2) FROM pings WHERE service_id = s.id AND created_at >= datetime('now', '-30 days')) as uptime_percent
          FROM services s
          LEFT JOIN categories c ON s.category_id = c.id
          ORDER BY c.sort_order, s.name
      `).all();
      return res.json(allServices);
    }

    res.json(assignedServices);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

export default router;
