import express from 'express';
import { db } from '../db.js';
import { checkServiceDetails } from '../jobs/pingService.js';

const router = express.Router();

// Get all services with latest status
router.get('/', async (req, res) => {
  try {
    const services = await db.service.findMany({
      orderBy: { created_at: 'asc' },
      include: {
        pings: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });

    // Calculate uptime percentage for each service (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const servicesWithUptime = await Promise.all(services.map(async (service) => {
      // Get uptime stats
      const totalPings = await db.ping.count({
        where: {
          service_id: service.id,
          created_at: { gte: thirtyDaysAgo }
        }
      });

      const upPings = await db.ping.count({
        where: {
          service_id: service.id,
          created_at: { gte: thirtyDaysAgo },
          status: 'up'
        }
      });

      const safeTotalPings = Number.isFinite(totalPings) ? totalPings : 0;
      const safeUpPings = Number.isFinite(upPings) ? upPings : 0;

      const uptimePercent = safeTotalPings > 0
        ? ((safeUpPings / safeTotalPings) * 100).toFixed(3)
        : '100.000';

      const latestPing = service.pings[0];

      return {
        ...service,
        current_status: service.paused ? 'paused' : (latestPing?.status || null),
        last_response_time: latestPing?.response_time || null,
        last_check: latestPing?.created_at || null,
        uptime_percent: isNaN(parseFloat(uptimePercent)) ? '0.000' : uptimePercent
      };
    }));

    res.json(servicesWithUptime);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single service
router.get('/:id', async (req, res) => {
  try {
    const service = await db.service.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create service
router.post('/', async (req, res) => {
  try {
    const {
      name, url, type = 'http', interval = 300, notify_down = true,
      timeout = 30, slow_threshold, http_method = 'GET', custom_headers = {},
      follow_redirects = true, auth_type = 'none', auth_user, auth_pass,
      notification_repeat = 0, notification_delay = 0,
      keyword, keyword_condition = 'exists', keyword_case_sensitive = 0,
      dns_record_type, dns_expected_value
    } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    // Validate minimum interval (60 seconds = 1 minute)
    const validInterval = Math.max(60, parseInt(interval) || 300);
    const validTimeout = Math.min(60, Math.max(1, parseInt(timeout) || 30));

    const newService = await db.service.create({
      data: {
        name,
        url,
        type,
        interval: validInterval,
        notify_down: notify_down ? 1 : 0,
        timeout: validTimeout,
        slow_threshold: slow_threshold || null,
        http_method,
        custom_headers: JSON.stringify(custom_headers),
        follow_redirects: follow_redirects ? 1 : 0,
        auth_type: auth_type || 'none',
        auth_user: auth_user || null,
        auth_pass: auth_pass || null,
        notification_repeat: parseInt(notification_repeat) || 0,
        notification_delay: parseInt(notification_delay) || 0,
        keyword: keyword || null,
        keyword_condition: keyword_condition || 'exists',
        keyword_case_sensitive: keyword_case_sensitive ? 1 : 0,
        dns_record_type: dns_record_type || 'A',
        dns_expected_value: dns_expected_value || null,
        db_connection_string: req.body.db_connection_string || null,
        db_query: req.body.db_query || null
      }
    });

    // Trigger immediate background check for SSL/Domain/GeoIP
    // Fire and forget - don't await
    checkServiceDetails(newService).catch(err =>
      console.error(`Error in immediate service details check for ${newService.name}:`, err)
    );

    res.status(201).json(newService);
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update service
router.put('/:id', async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const service = await db.service.findUnique({ where: { id: serviceId } });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const {
      name, url, type, interval, notify_down, category_id, paused,
      timeout, slow_threshold, http_method, custom_headers,
      follow_redirects, auth_type, auth_user, auth_pass,
      notification_repeat, notification_delay,
      keyword, keyword_condition, keyword_case_sensitive,
      dns_record_type, dns_expected_value
    } = req.body;

    // Validate minimum interval (60 seconds = 1 minute)
    const validInterval = interval !== undefined
      ? Math.max(60, parseInt(interval) || 300)
      : service.interval;

    // Validate timeout (1-60 seconds)
    const validTimeout = timeout !== undefined
      ? Math.min(60, Math.max(1, parseInt(timeout) || 30))
      : service.timeout;

    const updatedService = await db.service.update({
      where: { id: serviceId },
      data: {
        name: name || undefined,
        url: url || undefined,
        type: type || undefined,
        interval: validInterval,
        notify_down: notify_down !== undefined ? (notify_down ? 1 : 0) : undefined,
        category_id: category_id !== undefined ? category_id : undefined,
        paused: paused !== undefined ? (paused ? 1 : 0) : undefined,
        timeout: validTimeout,
        slow_threshold: slow_threshold !== undefined ? slow_threshold : undefined,
        http_method: http_method || undefined,
        custom_headers: custom_headers !== undefined ? JSON.stringify(custom_headers) : undefined,
        follow_redirects: follow_redirects !== undefined ? (follow_redirects ? 1 : 0) : undefined,
        auth_type: auth_type || undefined,
        auth_user: auth_user !== undefined ? auth_user : undefined,
        auth_pass: auth_pass !== undefined ? auth_pass : undefined,
        notification_repeat: notification_repeat !== undefined ? parseInt(notification_repeat) : undefined,
        notification_delay: notification_delay !== undefined ? parseInt(notification_delay) : undefined,
        keyword: keyword !== undefined ? keyword : undefined,
        keyword_condition: keyword_condition !== undefined ? keyword_condition : undefined,
        keyword_case_sensitive: keyword_case_sensitive !== undefined ? (keyword_case_sensitive ? 1 : 0) : undefined,
        dns_record_type: dns_record_type || undefined,
        dns_expected_value: dns_expected_value !== undefined ? dns_expected_value : undefined,
        db_connection_string: req.body.db_connection_string !== undefined ? req.body.db_connection_string : undefined,
        db_query: req.body.db_query !== undefined ? req.body.db_query : undefined
      }
    });

    res.json(updatedService);
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete service
router.delete('/:id', async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const service = await db.service.findUnique({ where: { id: serviceId } });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    await db.service.delete({ where: { id: serviceId } });
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get service incidents
router.get('/:id/incidents', async (req, res) => {
  try {
    const incidents = await db.serviceIncident.findMany({
      where: { service_id: parseInt(req.params.id) },
      orderBy: { started_at: 'desc' },
      take: 50
    });

    res.json(incidents);
  } catch (error) {
    console.error('Get service incidents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ALL service incidents (global history)
router.get('/incidents/history', async (req, res) => {
  try {
    const incidents = await db.serviceIncident.findMany({
      orderBy: { started_at: 'desc' },
      take: 100,
      include: {
        service: {
          select: { name: true }
        }
      }
    });

    // Flatten structure for compatibility
    const flattenedIncidents = incidents.map(incident => ({
      ...incident,
      service_name: incident.service.name
    }));

    res.json(flattenedIncidents);
  } catch (error) {
    console.error('Get global incidents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single incident by ID
router.get('/incidents/:id', async (req, res) => {
  try {
    const incident = await db.serviceIncident.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        service: {
          select: { name: true, url: true, type: true }
        }
      }
    });

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Flatten structure
    const flattenedIncident = {
      ...incident,
      service_name: incident.service.name,
      service_url: incident.service.url,
      service_type: incident.service.type
    };

    res.json(flattenedIncident);
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ BULK ACTIONS ============

// Bulk update category
router.post('/bulk/category', async (req, res) => {
  try {
    const { service_ids, category_id } = req.body;
    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: 'service_ids array is required' });
    }

    await db.service.updateMany({
      where: { id: { in: service_ids } },
      data: { category_id: category_id }
    });

    res.json({ message: `Updated category for ${service_ids.length} services` });
  } catch (error) {
    console.error('Bulk update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk pause services
router.post('/bulk/pause', async (req, res) => {
  try {
    const { service_ids } = req.body;
    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: 'service_ids array is required' });
    }

    await db.service.updateMany({
      where: { id: { in: service_ids } },
      data: { paused: 1 }
    });

    res.json({ message: `Paused ${service_ids.length} services` });
  } catch (error) {
    console.error('Bulk pause error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk start services
router.post('/bulk/start', async (req, res) => {
  try {
    const { service_ids } = req.body;
    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: 'service_ids array is required' });
    }

    await db.service.updateMany({
      where: { id: { in: service_ids } },
      data: { paused: 0 }
    });

    res.json({ message: `Started ${service_ids.length} services` });
  } catch (error) {
    console.error('Bulk start error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk reset stats (delete pings)
router.post('/bulk/reset-stats', async (req, res) => {
  try {
    const { service_ids } = req.body;
    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: 'service_ids array is required' });
    }

    await db.ping.deleteMany({
      where: { service_id: { in: service_ids } }
    });

    res.json({ message: `Reset stats for ${service_ids.length} services` });
  } catch (error) {
    console.error('Bulk reset stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk delete services
router.delete('/bulk', async (req, res) => {
  try {
    const { service_ids } = req.body;
    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ error: 'service_ids array is required' });
    }

    await db.service.deleteMany({
      where: { id: { in: service_ids } }
    });

    res.json({ message: `Deleted ${service_ids.length} services` });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
