import { db } from '../db.js';

// Get retention setting value, with defaults
function getRetentionDays(key, defaultValue) {
  try {
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (result && result.value) {
      const days = parseInt(result.value, 10);
      return isNaN(days) ? defaultValue : days;
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

// Cleanup old ping data
function cleanupPings() {
  const retentionDays = getRetentionDays('ping_retention_days', 30);
  try {
    const result = db.prepare(`
            DELETE FROM pings 
            WHERE created_at < datetime('now', '-' || ? || ' days')
        `).run(retentionDays);

    if (result.changes > 0) {
      console.log(`🧹 Cleanup: Deleted ${result.changes} pings older than ${retentionDays} days`);
    }
    return result.changes;
  } catch (error) {
    console.error('Ping cleanup error:', error);
    return 0;
  }
}

// Cleanup old service incidents
function cleanupIncidents() {
  const retentionDays = getRetentionDays('incident_retention_days', 90);
  try {
    const result = db.prepare(`
            DELETE FROM service_incidents 
            WHERE created_at < datetime('now', '-' || ? || ' days')
        `).run(retentionDays);

    if (result.changes > 0) {
      console.log(`🧹 Cleanup: Deleted ${result.changes} incidents older than ${retentionDays} days`);
    }
    return result.changes;
  } catch (error) {
    console.error('Incident cleanup error:', error);
    return 0;
  }
}

// Cleanup old alert history
function cleanupAlerts() {
  const retentionDays = getRetentionDays('alert_retention_days', 30);
  try {
    const result = db.prepare(`
            DELETE FROM alert_history 
            WHERE created_at < datetime('now', '-' || ? || ' days')
        `).run(retentionDays);

    if (result.changes > 0) {
      console.log(`🧹 Cleanup: Deleted ${result.changes} alerts older than ${retentionDays} days`);
    }
    return result.changes;
  } catch (error) {
    console.error('Alert cleanup error:', error);
    return 0;
  }
}

// Run all cleanup jobs
export function runCleanupJobs() {
  console.log('🔄 Running data cleanup jobs...');
  const pingsDeleted = cleanupPings();
  const incidentsDeleted = cleanupIncidents();
  const alertsDeleted = cleanupAlerts();

  const total = pingsDeleted + incidentsDeleted + alertsDeleted;
  if (total > 0) {
    console.log(`✅ Cleanup complete: ${total} total records deleted`);
  }
  return { pingsDeleted, incidentsDeleted, alertsDeleted };
}

// Schedule cleanup to run daily (every 24 hours)
export function scheduleCleanupJobs() {
  // Run immediately on startup
  runCleanupJobs();

  // Then run every 24 hours (in milliseconds)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(runCleanupJobs, TWENTY_FOUR_HOURS);

  console.log('📅 Data cleanup jobs scheduled (runs every 24 hours)');
}
