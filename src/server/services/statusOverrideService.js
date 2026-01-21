import { db } from '../db.js';

// Get all status overrides
export function getAllStatusOverrides() {
  return db.prepare(`
        SELECT so.*, s.name as service_name 
        FROM status_overrides so
        LEFT JOIN services s ON so.service_id = s.id
        ORDER BY so.created_at DESC
    `).all();
}

// Get active overrides for a service
export function getActiveOverridesForService(serviceId) {
  const now = new Date().toISOString();
  return db.prepare(`
        SELECT * FROM status_overrides 
        WHERE service_id = ? AND start_time <= ? AND end_time >= ?
        ORDER BY created_at DESC
        LIMIT 1
    `).get(serviceId, now, now);
}

// Get all active overrides
export function getAllActiveOverrides() {
  const now = new Date().toISOString();
  return db.prepare(`
        SELECT so.*, s.name as service_name 
        FROM status_overrides so
        LEFT JOIN services s ON so.service_id = s.id
        WHERE so.start_time <= ? AND so.end_time >= ?
        ORDER BY so.created_at DESC
    `).all(now, now);
}

export function getStatusOverrideById(id) {
  return db.prepare('SELECT * FROM status_overrides WHERE id = ?').get(id);
}

export function createStatusOverride(data) {
  const result = db.prepare(`
        INSERT INTO status_overrides (service_id, status, reason, start_time, end_time)
        VALUES (?, ?, ?, ?, ?)
    `).run(
    data.service_id,
    data.status,
    data.reason || null,
    data.start_time,
    data.end_time
  );
  return getStatusOverrideById(result.lastInsertRowid);
}

export function updateStatusOverride(id, data) {
  const existing = getStatusOverrideById(id);
  if (!existing) return null;

  db.prepare(`
        UPDATE status_overrides SET 
            service_id = COALESCE(?, service_id),
            status = COALESCE(?, status),
            reason = COALESCE(?, reason),
            start_time = COALESCE(?, start_time),
            end_time = COALESCE(?, end_time)
        WHERE id = ?
    `).run(
    data.service_id,
    data.status,
    data.reason,
    data.start_time,
    data.end_time,
    id
  );

  return getStatusOverrideById(id);
}

export function deleteStatusOverride(id) {
  return db.prepare('DELETE FROM status_overrides WHERE id = ?').run(id);
}

// Get effective status for a service (check for override first)
export function getEffectiveStatus(serviceId, actualStatus) {
  const override = getActiveOverridesForService(serviceId);
  if (override) {
    return { status: override.status, isOverride: true, reason: override.reason };
  }
  return { status: actualStatus, isOverride: false };
}
