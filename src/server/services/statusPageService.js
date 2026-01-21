import { db } from '../db.js';

// Get all status pages
export function getAllStatusPages() {
  return db.prepare('SELECT * FROM status_pages ORDER BY is_default DESC, name ASC').all();
}

export function getStatusPageById(id) {
  return db.prepare('SELECT * FROM status_pages WHERE id = ?').get(id);
}

export function getStatusPageBySlug(slug) {
  return db.prepare('SELECT * FROM status_pages WHERE slug = ?').get(slug);
}

export function getDefaultStatusPage() {
  return db.prepare('SELECT * FROM status_pages WHERE is_default = 1').get();
}

export function createStatusPage(data) {
  // If this is the first status page or marked as default, set it as default
  const count = db.prepare('SELECT COUNT(*) as count FROM status_pages').get();
  const isDefault = count.count === 0 || data.is_default ? 1 : 0;

  // If setting as default, unset other defaults
  if (isDefault) {
    db.prepare('UPDATE status_pages SET is_default = 0').run();
  }

  const result = db.prepare(`
        INSERT INTO status_pages (slug, name, title, subtitle, navbar_title, logo_url, favicon_url, hero_bg_color, theme_mode, bg_pattern, monitor_style, meta_description, og_image_url, custom_css, is_default, is_public)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
    data.slug,
    data.name,
    data.title || data.name,
    data.subtitle || 'Real-time system status',
    data.navbar_title || null,
    data.logo_url || null,
    data.favicon_url || null,
    data.hero_bg_color || '#1e2a38',
    data.theme_mode || 'system',
    data.bg_pattern || 'none',
    data.monitor_style || 'bars',
    data.meta_description || null,
    data.og_image_url || null,
    data.custom_css || null,
    isDefault,
    data.is_public !== false ? 1 : 0
  );

  return getStatusPageById(result.lastInsertRowid);
}

export function updateStatusPage(id, data) {
  const existing = getStatusPageById(id);
  if (!existing) return null;

  // If setting as default, unset other defaults
  if (data.is_default) {
    db.prepare('UPDATE status_pages SET is_default = 0').run();
  }

  db.prepare(`
        UPDATE status_pages SET
            slug = COALESCE(?, slug),
            name = COALESCE(?, name),
            title = COALESCE(?, title),
            subtitle = COALESCE(?, subtitle),
            navbar_title = ?,
            logo_url = ?,
            favicon_url = ?,
            hero_bg_color = COALESCE(?, hero_bg_color),
            theme_mode = COALESCE(?, theme_mode),
            bg_pattern = COALESCE(?, bg_pattern),
            monitor_style = COALESCE(?, monitor_style),
            meta_description = ?,
            og_image_url = ?,
            custom_css = ?,
            is_default = COALESCE(?, is_default),
            is_public = COALESCE(?, is_public)
        WHERE id = ?
    `).run(
    data.slug,
    data.name,
    data.title,
    data.subtitle,
    data.navbar_title !== undefined ? data.navbar_title : existing.navbar_title,
    data.logo_url !== undefined ? data.logo_url : existing.logo_url,
    data.favicon_url !== undefined ? data.favicon_url : existing.favicon_url,
    data.hero_bg_color,
    data.theme_mode,
    data.bg_pattern,
    data.monitor_style,
    data.meta_description !== undefined ? data.meta_description : existing.meta_description,
    data.og_image_url !== undefined ? data.og_image_url : existing.og_image_url,
    data.custom_css !== undefined ? data.custom_css : existing.custom_css,
    data.is_default !== undefined ? (data.is_default ? 1 : 0) : null,
    data.is_public !== undefined ? (data.is_public ? 1 : 0) : null,
    id
  );

  return getStatusPageById(id);
}

export function deleteStatusPage(id) {
  const page = getStatusPageById(id);
  if (!page) return null;

  // Don't allow deleting the default page if it's the only one
  const count = db.prepare('SELECT COUNT(*) as count FROM status_pages').get();
  if (page.is_default && count.count > 1) {
    // Set another page as default
    db.prepare('UPDATE status_pages SET is_default = 1 WHERE id != ? LIMIT 1').run(id);
  }

  // Unassign services from this status page
  db.prepare('UPDATE services SET status_page_id = NULL WHERE status_page_id = ?').run(id);

  return db.prepare('DELETE FROM status_pages WHERE id = ?').run(id);
}

// Get services assigned to a status page (using junction table)
export function getServicesForStatusPage(statusPageId) {
  if (statusPageId) {
    return db.prepare(`
      SELECT s.*, sps.sort_order
      FROM services s
      INNER JOIN status_page_services sps ON s.id = sps.service_id
      WHERE sps.status_page_id = ?
      ORDER BY sps.sort_order ASC, s.name ASC
    `).all(statusPageId);
  }
  // For default/no specific page, get all services
  return db.prepare('SELECT * FROM services ORDER BY name ASC').all();
}

// Get service IDs for a status page
export function getServiceIdsForStatusPage(statusPageId) {
  const rows = db.prepare('SELECT service_id FROM status_page_services WHERE status_page_id = ?').all(statusPageId);
  return rows.map(r => r.service_id);
}

// Assign service to a status page (junction table)
export function assignServiceToStatusPage(serviceId, statusPageId) {
  try {
    return db.prepare('INSERT OR REPLACE INTO status_page_services (status_page_id, service_id) VALUES (?, ?)').run(statusPageId, serviceId);
  } catch (e) {
    // Ignore duplicate
  }
}

// Remove service from a status page
export function removeServiceFromStatusPage(serviceId, statusPageId) {
  return db.prepare('DELETE FROM status_page_services WHERE status_page_id = ? AND service_id = ?').run(statusPageId, serviceId);
}

// Update all services for a status page (replace all, but preserve section assignments)
export function updateStatusPageServices(statusPageId, serviceIds) {
  // Get existing services with their section assignments
  const existing = db.prepare('SELECT service_id, section_id FROM status_page_services WHERE status_page_id = ?').all(statusPageId);
  const existingMap = new Map(existing.map(e => [e.service_id, e.section_id]));

  // Remove services that are no longer in the list
  db.prepare('DELETE FROM status_page_services WHERE status_page_id = ? AND service_id NOT IN (' + serviceIds.map(() => '?').join(',') + ')').run(statusPageId, ...serviceIds);

  // Add new services or update sort order for existing ones
  const upsert = db.prepare(`
    INSERT INTO status_page_services (status_page_id, service_id, sort_order, section_id) 
    VALUES (?, ?, ?, ?)
    ON CONFLICT(status_page_id, service_id) DO UPDATE SET sort_order = excluded.sort_order
  `);

  serviceIds.forEach((serviceId, index) => {
    const existingSectionId = existingMap.get(serviceId) || null;
    upsert.run(statusPageId, serviceId, index, existingSectionId);
  });

  return getServiceIdsForStatusPage(statusPageId);
}
