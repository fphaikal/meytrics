import { db } from '../db.js';

// Get retention setting value, with defaults
async function getRetentionDays(key, defaultValue) {
  try {
    const result = await db.setting.findUnique({
      where: { key }
    });
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
async function cleanupPings() {
  const retentionDays = await getRetentionDays('ping_retention_days', 30);
  try {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - retentionDays);

    const result = await db.ping.deleteMany({
      where: {
        created_at: { lt: dateLimit }
      }
    });

    if (result.count > 0) {
      console.log(`🧹 Cleanup: Deleted ${result.count} pings older than ${retentionDays} days`);
    }
    return result.count;
  } catch (error) {
    console.error('Ping cleanup error:', error);
    return 0;
  }
}

// Cleanup old service incidents
async function cleanupIncidents() {
  const retentionDays = await getRetentionDays('incident_retention_days', 90);
  try {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - retentionDays);

    const result = await db.serviceIncident.deleteMany({
      where: {
        created_at: { lt: dateLimit }
      }
    });

    if (result.count > 0) {
      console.log(`🧹 Cleanup: Deleted ${result.count} incidents older than ${retentionDays} days`);
    }
    return result.count;
  } catch (error) {
    console.error('Incident cleanup error:', error);
    return 0;
  }
}

// Cleanup old alert history
async function cleanupAlerts() {
  const retentionDays = await getRetentionDays('alert_retention_days', 30);
  try {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - retentionDays);

    const result = await db.alertHistory.deleteMany({
      where: {
        created_at: { lt: dateLimit }
      }
    });

    if (result.count > 0) {
      console.log(`🧹 Cleanup: Deleted ${result.count} alerts older than ${retentionDays} days`);
    }
    return result.count;
  } catch (error) {
    console.error('Alert cleanup error:', error);
    return 0;
  }
}

// Run all cleanup jobs
export async function runCleanupJobs() {
  console.log('🔄 Running data cleanup jobs...');
  const pingsDeleted = await cleanupPings();
  const incidentsDeleted = await cleanupIncidents();
  const alertsDeleted = await cleanupAlerts();

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
