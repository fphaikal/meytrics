import { db } from '../db.js';
import crypto from 'crypto';

// Generate API key
function generateApiKey() {
  return 'lm_' + crypto.randomBytes(24).toString('hex');
}

// Get all API keys
export function getAllApiKeys() {
  return db.prepare('SELECT id, name, key, permissions, last_used, enabled, created_at FROM api_keys ORDER BY created_at DESC').all();
}

export function getApiKeyById(id) {
  return db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id);
}

export function getApiKeyByKey(key) {
  return db.prepare('SELECT * FROM api_keys WHERE key = ?').get(key);
}

export function createApiKey(data) {
  const key = generateApiKey();
  const result = db.prepare(`
        INSERT INTO api_keys (name, key, permissions, enabled)
        VALUES (?, ?, ?, ?)
    `).run(
    data.name,
    key,
    JSON.stringify(data.permissions || ['read']),
    data.enabled !== false ? 1 : 0
  );
  return { id: result.lastInsertRowid, name: data.name, key, permissions: data.permissions || ['read'] };
}

export function updateApiKey(id, data) {
  const existing = getApiKeyById(id);
  if (!existing) return null;

  db.prepare(`
        UPDATE api_keys SET 
            name = COALESCE(?, name),
            permissions = COALESCE(?, permissions),
            enabled = COALESCE(?, enabled)
        WHERE id = ?
    `).run(
    data.name,
    data.permissions ? JSON.stringify(data.permissions) : null,
    data.enabled !== undefined ? (data.enabled ? 1 : 0) : null,
    id
  );

  return getApiKeyById(id);
}

export function deleteApiKey(id) {
  return db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
}

export function updateLastUsed(id) {
  db.prepare('UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?').run(id);
}

// Validate API key and check permissions
export function validateApiKey(key, requiredPermission = 'read') {
  const apiKey = getApiKeyByKey(key);

  if (!apiKey) {
    return { valid: false, error: 'Invalid API key' };
  }

  if (!apiKey.enabled) {
    return { valid: false, error: 'API key is disabled' };
  }

  const permissions = JSON.parse(apiKey.permissions || '["read"]');

  if (!permissions.includes(requiredPermission) && !permissions.includes('admin')) {
    return { valid: false, error: 'Insufficient permissions' };
  }

  // Update last used
  updateLastUsed(apiKey.id);

  return { valid: true, apiKey };
}
