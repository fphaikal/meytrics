import { db } from '../db.js';

// Get all sections for a status page
export function getSections(statusPageId) {
  return db.prepare(`
    SELECT * FROM status_page_sections 
    WHERE status_page_id = ? 
    ORDER BY display_order ASC
  `).all(statusPageId);
}

// Get a single section by ID
export function getSectionById(id) {
  return db.prepare('SELECT * FROM status_page_sections WHERE id = ?').get(id);
}

// Create a new section
export function createSection(statusPageId, name, displayOrder = 0) {
  const result = db.prepare(`
    INSERT INTO status_page_sections (status_page_id, name, display_order)
    VALUES (?, ?, ?)
  `).run(statusPageId, name, displayOrder);

  return { id: result.lastInsertRowid, status_page_id: statusPageId, name, display_order: displayOrder };
}

// Update a section
export function updateSection(id, data) {
  const { name, display_order } = data;
  db.prepare(`
    UPDATE status_page_sections 
    SET name = COALESCE(?, name), 
        display_order = COALESCE(?, display_order)
    WHERE id = ?
  `).run(name, display_order, id);

  return getSectionById(id);
}

// Delete a section
export function deleteSection(id) {
  // First, unassign all services from this section
  db.prepare('UPDATE status_page_services SET section_id = NULL WHERE section_id = ?').run(id);
  // Then delete the section
  return db.prepare('DELETE FROM status_page_sections WHERE id = ?').run(id);
}

// Update section order (bulk)
export function updateSectionOrder(statusPageId, sectionIds) {
  const updateStmt = db.prepare('UPDATE status_page_sections SET display_order = ? WHERE id = ? AND status_page_id = ?');

  sectionIds.forEach((id, index) => {
    updateStmt.run(index, id, statusPageId);
  });
}

// Assign service to a section
export function assignServiceToSection(statusPageId, serviceId, sectionId, displayOptions = null) {
  const optionsStr = displayOptions ? JSON.stringify(displayOptions) : '{"showHistory":true,"showChart":true}';

  // First check if the service is already in the status page
  const existing = db.prepare('SELECT * FROM status_page_services WHERE status_page_id = ? AND service_id = ?').get(statusPageId, serviceId);

  if (existing) {
    // Update existing
    db.prepare(`
      UPDATE status_page_services 
      SET section_id = ?, display_options = ?
      WHERE status_page_id = ? AND service_id = ?
    `).run(sectionId, optionsStr, statusPageId, serviceId);
  } else {
    // Insert new (this shouldn't normally happen if service was added properly)
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM status_page_services WHERE status_page_id = ?').get(statusPageId);
    db.prepare(`
      INSERT INTO status_page_services (status_page_id, service_id, section_id, display_options, sort_order) 
      VALUES (?, ?, ?, ?, ?)
    `).run(statusPageId, serviceId, sectionId, optionsStr, maxOrder.next_order);
  }
}

// Get services for a section
export function getServicesInSection(statusPageId, sectionId) {
  return db.prepare(`
    SELECT sps.*, s.name as service_name, s.url
    FROM status_page_services sps
    JOIN services s ON sps.service_id = s.id
    WHERE sps.status_page_id = ? AND sps.section_id = ?
    ORDER BY sps.sort_order ASC
  `).all(statusPageId, sectionId);
}

// Get services without a section (uncategorized)
export function getServicesWithoutSection(statusPageId) {
  return db.prepare(`
    SELECT sps.*, s.name as service_name, s.url
    FROM status_page_services sps
    JOIN services s ON sps.service_id = s.id
    WHERE sps.status_page_id = ? AND sps.section_id IS NULL
    ORDER BY sps.sort_order ASC
  `).all(statusPageId);
}

// Get all sections with their services for a status page
export function getSectionsWithServices(statusPageId) {
  const sections = getSections(statusPageId);
  const uncategorizedServices = getServicesWithoutSection(statusPageId);

  const result = sections.map(section => ({
    ...section,
    services: getServicesInSection(statusPageId, section.id)
  }));

  // Add uncategorized services as a virtual section
  if (uncategorizedServices.length > 0) {
    result.push({
      id: null,
      name: 'Uncategorized',
      display_order: 9999,
      services: uncategorizedServices
    });
  }

  return result;
}
