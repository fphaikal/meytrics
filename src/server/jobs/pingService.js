import { db } from '../db.js';
import { sendDownAlert, sendRecoveryAlert } from '../services/emailService.js';
import { triggerWebhooks } from '../services/webhookService.js';

// Store last status for each service to detect state changes
const lastStatus = new Map();

// Store active intervals for each service
const activeIntervals = new Map();

async function checkService(service) {
  // Skip paused services
  if (service.paused) {
    console.log(`⏸️ [${new Date().toISOString()}] ${service.name}: PAUSED (skipped)`);
    return;
  }

  const startTime = Date.now();
  let status = 'up';
  let statusCode = null;
  let error = null;
  let responseTime = null;

  try {
    if (service.type === 'http' || service.type === 'keyword') {
      const controller = new AbortController();
      const timeoutMs = (service.timeout || 30) * 1000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      // Build headers
      const headers = {
        'User-Agent': 'MEYTRICS/1.0',
        ...JSON.parse(service.custom_headers || '{}')
      };

      // Add authentication
      if (service.auth_type === 'basic' && service.auth_user && service.auth_pass) {
        const credentials = Buffer.from(`${service.auth_user}:${service.auth_pass}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      } else if (service.auth_type === 'bearer' && service.auth_pass) {
        headers['Authorization'] = `Bearer ${service.auth_pass}`;
      }

      const fetchOptions = {
        method: service.http_method || 'GET',
        signal: controller.signal,
        headers,
        redirect: service.follow_redirects !== 0 ? 'follow' : 'manual'
      };

      const response = await fetch(service.url, fetchOptions);

      clearTimeout(timeout);
      responseTime = Date.now() - startTime;
      statusCode = response.status;

      if (!response.ok) {
        status = 'down';
        error = `HTTP ${response.status} ${response.statusText}`;
      } else if (service.type === 'keyword' && service.keyword) {
        // Keyword monitoring check
        const text = await response.text();
        if (!text.includes(service.keyword)) {
          status = 'down';
          error = `Keyword "${service.keyword}" not found in response`;
        }
      }
    } else if (service.type === 'tcp') {
      // For TCP, we just check if we can connect
      const url = new URL(service.url.startsWith('tcp://') ? service.url : `tcp://${service.url}`);
      const { createConnection } = await import('net');
      const tcpTimeout = (service.timeout || 30) * 1000;

      await new Promise((resolve, reject) => {
        const socket = createConnection({
          host: url.hostname,
          port: parseInt(url.port) || 80
        }, () => {
          responseTime = Date.now() - startTime;
          socket.destroy();
          resolve();
        });

        socket.on('error', (err) => {
          reject(err);
        });

        socket.setTimeout(tcpTimeout, () => {
          socket.destroy();
          reject(new Error('Connection timeout'));
        });
      });
    } else if (service.type === 'dns') {
      const { resolve4, resolve6, resolveCname, resolveMx, resolveTxt, resolveNs } = await import('dns/promises');
      const hostname = service.url.replace(/^https?:\/\//, '').replace(/\/$/, ''); // Remove protocol/path if user added it

      const recordType = service.dns_record_type || 'A';

      let records;
      switch (recordType) {
        case 'A': records = await resolve4(hostname); break;
        case 'AAAA': records = await resolve6(hostname); break;
        case 'CNAME': records = await resolveCname(hostname); break;
        case 'MX': records = await resolveMx(hostname); break;
        case 'TXT': records = await resolveTxt(hostname); break;
        case 'NS': records = await resolveNs(hostname); break;
        default: records = await resolve4(hostname);
      }

      responseTime = Date.now() - startTime;

      // If records found, it's UP.
      // If specific value expected, check it.
      if (service.dns_expected_value) {
        const expected = service.dns_expected_value;
        let found = false;

        // Helper to check standard arrays (A, AAAA, CNAME, NS)
        if (Array.isArray(records)) {
          // MX records are objects { exchange, priority }
          // TXT records are arrays of arrays (chunks)

          if (recordType === 'MX') {
            found = records.some(r => r.exchange.includes(expected));
          } else if (recordType === 'TXT') {
            found = records.some(r => r.flat().join('').includes(expected));
          } else {
            // Simple string arrays
            found = records.some(r => r.includes(expected));
          }
        }

        if (!found) {
          status = 'down';
          error = `DNS ${recordType} record does not match expected value: ${expected}`;
        }
      }
    }
  } catch (err) {
    status = 'down';
    error = err.name === 'AbortError' ? 'Request timeout' : err.message;
    responseTime = Date.now() - startTime;
  }

  // Save ping result
  db.prepare(`
    INSERT INTO pings (service_id, status, response_time, status_code, error)
    VALUES (?, ?, ?, ?, ?)
  `).run(service.id, status, responseTime, statusCode, error);

  // Check for status change and send notifications
  const prevStatus = lastStatus.get(service.id);
  const isFirstRun = prevStatus === undefined;

  // 1. Handle DOWN state
  if (status === 'down') {
    // Check if we already have an open incident for this service
    let openIncident = db.prepare(`
      SELECT id, started_at FROM service_incidents 
      WHERE service_id = ? AND status = 'down' AND ended_at IS NULL
    `).get(service.id);

    // If no open incident, create one
    if (!openIncident) {
      db.prepare(`
        INSERT INTO service_incidents (service_id, status, started_at, error_message)
        VALUES (?, 'down', datetime('now'), ?)
      `).run(service.id, error);

      // Fetch the newly created incident
      openIncident = db.prepare(`
        SELECT id, started_at FROM service_incidents 
        WHERE service_id = ? AND status = 'down' AND ended_at IS NULL
      `).get(service.id);

      console.log(`📝 Incident recorded for ${service.name}`);
    }

    // Handle Notifications
    if (service.notify_down) {
      // 1. Check Notification Delay
      const startedAt = new Date(openIncident.started_at + (openIncident.started_at.endsWith('Z') ? '' : 'Z')).getTime();
      const now = Date.now();
      const delayMs = (service.notification_delay || 0) * 1000;

      // If we are within the delay period, do NOT alert yet
      if (now - startedAt < delayMs) {
        // console.log(`⏳ Delaying alert for ${service.name} (waiting ${service.notification_delay}s)`);
        // Commented out to reduce noise
      } else {
        // 2. Check Last Alert for Repeat Logic
        const lastAlert = db.prepare(`
          SELECT created_at FROM alert_history 
          WHERE service_id = ? AND type IN ('down', 'down-repeat') 
          ORDER BY created_at DESC LIMIT 1
        `).get(service.id);

        let shouldSendAlert = false;
        let alertType = 'down';

        if (!lastAlert) {
          // Never alerted -> Send
          shouldSendAlert = true;
        } else {
          const lastAlertTime = new Date(lastAlert.created_at + (lastAlert.created_at.endsWith('Z') ? '' : 'Z')).getTime();

          // If last alert was BEFORE this incident started, it's a new incident -> Send
          // (allowing 5s buffer for clock skew)
          if (lastAlertTime < (startedAt - 5000)) {
            shouldSendAlert = true;
          }
          // If alert is part of this incident, check repeat
          else if (service.notification_repeat > 0) {
            const repeatMs = service.notification_repeat * 1000;
            if (now - lastAlertTime >= repeatMs) {
              shouldSendAlert = true;
              alertType = 'down-repeat';
            }
          }
        }

        if (shouldSendAlert) {
          console.log(`🔴 Sending ${alertType} alert for ${service.name}`);
          sendDownAlert(service, error);
          triggerWebhooks('down', service, error);

          // Record alert to history
          db.prepare(`
             INSERT INTO alert_history (service_id, type, message)
             VALUES (?, ?, ?)
           `).run(service.id, alertType, `Service is down: ${error}`);
        }
      }
    }
  }

  // 2. Handle UP state (Recovery)
  else if (status === 'up') {
    // Check if we have an open incident to close
    const openIncident = db.prepare(`
      SELECT * FROM service_incidents 
      WHERE service_id = ? AND status = 'down' AND ended_at IS NULL
      ORDER BY started_at DESC LIMIT 1
    `).get(service.id);

    if (openIncident) {
      const startTime = new Date(openIncident.started_at + 'Z').getTime();
      const endTime = Date.now();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);

      db.prepare(`
        UPDATE service_incidents 
        SET ended_at = datetime('now'), 
            duration_seconds = ?,
            status = 'resolved'
        WHERE id = ?
      `).run(durationSeconds, openIncident.id);
      console.log(`✅ Incident resolved for ${service.name} (duration: ${durationSeconds}s)`);

      // Send recovery notification only if we are tracking state and it was previously down
      // (Or just send it whenever we close an incident? Let's stick to state transition for alerts to be safe)
      if (service.notify_down || prevStatus === 'down') {
        console.log(`🟢 Service ${service.name} RECOVERED`);
        sendRecoveryAlert(service, responseTime);
        triggerWebhooks('recovery', service, `${responseTime}ms`);
      }
    }
  }

  lastStatus.set(service.id, status);

  // 3. Handle Slow Response (only if service is up)
  if (status === 'up' && service.slow_threshold && responseTime > service.slow_threshold) {
    console.log(`⚠️ Service ${service.name} is SLOW (${responseTime}ms > ${service.slow_threshold}ms threshold)`);
    triggerWebhooks('slow', service, `Response time: ${responseTime}ms (threshold: ${service.slow_threshold}ms)`);
  }

  const statusIcon = status === 'up' ? '✅' : '❌';
  console.log(`${statusIcon} [${new Date().toISOString()}] ${service.name}: ${status} (${responseTime}ms)`);
}

function scheduleService(service) {
  // Clear existing interval if any
  if (activeIntervals.has(service.id)) {
    clearInterval(activeIntervals.get(service.id));
  }

  // Schedule regular checks based on service interval
  const intervalMs = service.interval * 1000;
  const intervalId = setInterval(() => checkService(service), intervalMs);
  activeIntervals.set(service.id, intervalId);

  console.log(`📅 Scheduled ${service.name} every ${service.interval}s`);
}

export function startPingJobs() {
  console.log('🚀 Starting ping jobs...');

  // Get all active (non-paused) services
  const services = db.prepare('SELECT * FROM services WHERE paused = 0').all();

  if (services.length === 0) {
    console.log('ℹ️ No services configured yet');
  }

  // Initial check for all services
  services.forEach(service => {
    // Run initial check
    checkService(service);
    // Schedule recurring checks
    scheduleService(service);
  });

  // Watch for service changes every 30 seconds
  setInterval(() => {
    const currentServices = db.prepare('SELECT * FROM services').all();

    // Find new or updated services
    currentServices.forEach(service => {
      const existingInterval = activeIntervals.get(service.id);

      // Handle paused services - stop their intervals
      if (service.paused && existingInterval) {
        console.log(`⏸️ Service paused: ${service.name}`);
        clearInterval(existingInterval);
        activeIntervals.delete(service.id);
        return;
      }

      // Handle unpaused/new services
      if (!service.paused && !existingInterval) {
        console.log(`➕ New/resumed service detected: ${service.name}`);
        checkService(service);
        scheduleService(service);
      }
    });

    // Find removed services
    const currentIds = new Set(currentServices.map(s => s.id));
    for (const [serviceId, intervalId] of activeIntervals) {
      if (!currentIds.has(serviceId)) {
        console.log(`➖ Service removed: ${serviceId}`);
        clearInterval(intervalId);
        activeIntervals.delete(serviceId);
        lastStatus.delete(serviceId);
      }
    }
  }, 30000);

  console.log(`✅ Ping jobs started for ${services.length} services`);
}




import { checkSSL } from '../utils/ssl.js';
import { checkDomainExpiry } from '../utils/whois.js';
import { checkServerLocation } from '../utils/geoip.js';

async function runSslChecks() {
  console.log('🔒 Starting SSL/Domain/GeoIP checks...');
  const services = db.prepare('SELECT * FROM services WHERE paused = 0 AND (type = \'http\' OR type = \'https\')').all();

  for (const service of services) {
    if (service.url.startsWith('http')) {
      // 1. SSL Check
      try {
        const sslResult = await checkSSL(service.url);
        if (sslResult) {
          db.prepare('UPDATE services SET ssl_expiry = ? WHERE id = ?').run(sslResult.validTo.toISOString(), service.id);
          console.log(`🔒 SSL updated for ${service.name}: ${sslResult.daysRemaining} days remaining`);
        }
      } catch (err) {
        console.error(`SSL check failed for ${service.name}:`, err.message);
      }

      // 2. Domain Check
      try {
        const domainResult = await checkDomainExpiry(service.url);
        if (domainResult) {
          db.prepare('UPDATE services SET domain_expiry = ? WHERE id = ?').run(domainResult.expiryDate.toISOString(), service.id);
          console.log(`globe Domain updated for ${service.name}: ${domainResult.daysRemaining} days remaining`);
        }
      } catch (err) {
        console.error(`Domain check failed for ${service.name}:`, err.message);
      }

      // 3. GeoIP Check
      // Only check if missing or periodically (for now, run every time check loop runs is fine as it's infrequent)
      // But ip-api has rate limits (45/min). With small number of services it is okay.
      try {
        // Add small delay to respect rate limits if many services
        await new Promise(r => setTimeout(r, 1500));

        const geoResult = await checkServerLocation(service.url);
        if (geoResult) {
          db.prepare(`
                  UPDATE services 
                  SET server_country = ?, server_city = ?, server_lat = ?, server_lon = ?, region = ?
                  WHERE id = ?
              `).run(
            geoResult.country,
            geoResult.city,
            geoResult.lat,
            geoResult.lon,
            `${geoResult.city}, ${geoResult.country}`, // Auto update region text too
            service.id
          );
          console.log(`📍 Location updated for ${service.name}: ${geoResult.city}, ${geoResult.country}`);
        }
      } catch (err) {
        console.error(`GeoIP check failed for ${service.name}:`, err.message);
      }
    }
  }
}



// Schedule SSL/Domain checks (every 12 hours)
setTimeout(() => {
  runSslChecks();
  setInterval(runSslChecks, 12 * 60 * 60 * 1000);
}, 10000); // Start after 10 seconds
