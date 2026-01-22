import { db } from '../db.js';
import crypto from 'crypto';

// Generate API key
function generateApiKey() {
  return 'lm_' + crypto.randomBytes(24).toString('hex');
}

// Get all API keys
export async function getAllApiKeys() {
  // Prisma doesn't always select all fields by default if not specified, 
  // but findMany() does returns all scalar fields.
  return db.apiKey.findMany({
    orderBy: { created_at: 'desc' }
  });
}

export async function getApiKeyById(id) {
  return db.apiKey.findUnique({
    where: { id: parseInt(id) }
  });
}

export async function getApiKeyByKey(key) {
  return db.apiKey.findUnique({
    where: { key }
  });
}

export async function createApiKey(data) {
  const key = generateApiKey();
  const apiKey = await db.apiKey.create({
    data: {
      name: data.name,
      key,
      permissions: JSON.stringify(data.permissions || ['read']),
      enabled: data.enabled !== false ? 1 : 0
    }
  });
  return { ...apiKey, permissions: data.permissions || ['read'] };
}

export async function updateApiKey(id, data) {
  try {
    const updated = await db.apiKey.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name,
        permissions: data.permissions ? JSON.stringify(data.permissions) : undefined,
        enabled: data.enabled !== undefined ? (data.enabled ? 1 : 0) : undefined
      }
    });
    return updated;
  } catch (error) {
    return null;
  }
}

export async function deleteApiKey(id) {
  return db.apiKey.delete({
    where: { id: parseInt(id) }
  });
}

export async function updateLastUsed(id) {
  // Fire and forget, or await?
  // Prisma requires 'data'
  try {
    await db.apiKey.update({
      where: { id: parseInt(id) },
      data: { last_used: new Date() }
    });
  } catch (err) {
    // ignore
  }
}

// Validate API key and check permissions
export async function validateApiKey(key, requiredPermission = 'read') {
  const apiKey = await getApiKeyByKey(key);

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
