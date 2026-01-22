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
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    let page;

    if (slug === 'default') {
      page = await getDefaultStatusPage();
    } else {
      page = await getStatusPageBySlug(slug);
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
router.get('/:slug/sections', async (req, res) => {
  try {
    const { slug } = req.params;
    let page;

    if (slug === 'default') {
      page = await getDefaultStatusPage();
    } else {
      page = await getStatusPageBySlug(slug);
    }

    if (!page) {
      return res.status(404).json({ error: 'Status page not found' });
    }

    console.log(`[Public Sections Access] Slug: ${slug}, ID: ${page.id}, is_public: ${page.is_public}`);

    if (page.is_public !== 1 && page.is_public !== true && page.is_public !== '1') {
      console.log(`[Public Sections Access] Access DENIED for ${slug}`);
      return res.status(403).json({ error: 'This status page is not public' });
    }

    const sections = await getSectionsWithServices(page.id);
    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// Get services for public status page
router.get('/:slug/services', async (req, res) => {
  try {
    const { slug } = req.params;
    let page;

    if (slug === 'default') {
      page = await getDefaultStatusPage();
    } else {
      page = await getStatusPageBySlug(slug);
    }

    if (!page) {
      return res.status(404).json({ error: 'Status page not found' });
    }

    if (page.is_public !== 1 && page.is_public !== true && page.is_public !== '1') {
      return res.status(403).json({ error: 'This status page is not public' });
    }

    // Use raw query for complex stats or Prisma relations with aggregation
    // The query calculates current_status, latest_response_time, uptime_percent
    // We can use $queryRaw.
    // Note: SQLite syntax `datetime('now', '-30 days')`.
    // If we want cross-db support, we might need a stored procedure or standard SQL or simple logic.
    // `datetime('now'...)` is SQLite specific.
    // Postgres uses `NOW() - INTERVAL '30 days'`.
    // If we want true multi-db, we should build the query dynamically or use standard SQL if possible.
    // Or let Prisma handle simple things and do aggregation in JS, OR stick to raw with provider check.
    // For now, allow SQLite logic in Raw for speed, as migration is primarily to Prisma Client.
    // But `datetime` is definitely SQLite.

    // Attempt standard SQL or JS aggregation?
    // JS Aggregation:
    // 1. Fetch services with their latest ping.
    // 2. Fetch uptime counts for 30 days.

    // Let's rely on `db.service` but with `include`?
    // Uptime is hard with includes efficiently.

    // Fallback: Using $queryRaw but with a check or standard syntax?
    // Or just port the SQL as is for now, assuming SQLite is still the backing DB for this step (User is on Windows, likely SQLite dev).
    // If the goal is "Multi-Database Support", hardcoded SQLite SQL is bad.

    // Better Approach: Prisma Aggregations.
    // Fetch all services for the page.
    // For each service, `db.ping.findFirst(...)` for status.
    // For each service, `db.ping.count(...)` for uptime.

    // This N+1 is bad if many services.
    // But page view is low frequency usually.

    // Let's try raw query but simpler?
    // Or just use the Safe SQL if possible.

    // I will write a Prisma-based JS assembly for now to be safe and portable.

    let services = [];
    const pageId = page.id;

    // 1. Get services
    if (page.is_default) {
      // Check if assigns exist
      const count = await db.statusPageService.count({ where: { status_page_id: pageId } });
      if (count === 0) {
        // Fetch all
        services = await db.service.findMany({
          include: { category: true },
          orderBy: [
            { category: { sort_order: 'asc' } },
            { name: 'asc' }
          ]
        });
      } else {
        // Fetch assigned
        const result = await db.statusPageService.findMany({
          where: { status_page_id: pageId },
          include: { service: { include: { category: true } } },
          orderBy: [
            { sort_order: 'asc' },
            { service: { category: { sort_order: 'asc' } } },
            { service: { name: 'asc' } }
          ]
        });
        services = result.map(r => r.service);
      }
    } else {
      const result = await db.statusPageService.findMany({
        where: { status_page_id: pageId },
        include: { service: { include: { category: true } } },
        orderBy: [
          { sort_order: 'asc' },
          { service: { category: { sort_order: 'asc' } } },
          { service: { name: 'asc' } }
        ]
      });
      services = result.map(r => r.service);
    }

    // 2. Fetch stats for these services
    // Optimization: Run pings fetch in parallel Promise.all
    const enriched = await Promise.all(services.map(async (s) => {
      // Last ping
      const lastPing = await db.ping.findFirst({
        where: { service_id: s.id },
        orderBy: { created_at: 'desc' },
        select: { status: true, response_time: true }
      });

      // 30 day uptime
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Count total pings
      const totalPings = await db.ping.count({
        where: {
          service_id: s.id,
          created_at: { gte: thirtyDaysAgo }
        }
      });

      // Count up pings
      const upPings = await db.ping.count({
        where: {
          service_id: s.id,
          created_at: { gte: thirtyDaysAgo },
          status: 'up'
        }
      });

      const uptimePercent = totalPings > 0
        ? ((upPings / totalPings) * 100).toFixed(2)
        : '100.00';

      return {
        ...s,
        category_name: s.category?.name,
        current_status: lastPing?.status,
        latest_response_time: lastPing?.response_time,
        uptime_percent: uptimePercent
      };
    }));

    res.json(enriched);

  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

export default router;
