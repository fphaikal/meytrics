import { db } from '../db.js';
import { sendDownAlert, sendRecoveryAlert } from '../services/emailService.js';
import { triggerWebhooks } from '../services/webhookService.js';
import { checkSSL } from '../utils/ssl.js';
import { checkDomainExpiry } from '../utils/whois.js';
import { checkServerLocation } from '../utils/geoip.js';

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
  let responseTime = 0;

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
        let text = await response.text();
        const expectedKeyword = service.keyword;
        const condition = service.keyword_condition || 'exists';
        const isCaseSensitive = !!service.keyword_case_sensitive;

        let content = text;
        let keyword = expectedKeyword;

        if (!isCaseSensitive) {
          content = content.toLowerCase();
          keyword = keyword.toLowerCase();
        }

        const keywordFound = content.includes(keyword);

        if (condition === 'exists') {
          // Condition: Keyword MUST exist
          if (!keywordFound) {
            status = 'down';
            error = `Keyword "${expectedKeyword}" not found in response`;
          }
        } else if (condition === 'not_exists') {
          // Condition: Keyword MUST NOT exist
          if (keywordFound) {
            status = 'down';
            error = `Keyword "${expectedKeyword}" found in response (expected absence)`;
          }
        }
      }
    } else if (service.type === 'tcp') {
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
      const hostname = service.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

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

      if (service.dns_expected_value) {
        const expected = service.dns_expected_value;
        let found = false;

        if (Array.isArray(records)) {
          if (recordType === 'MX') {
            found = records.some(r => r.exchange.includes(expected));
          } else if (recordType === 'TXT') {
            found = records.some(r => r.flat().join('').includes(expected));
          } else {
            found = records.some(r => r.includes(expected));
          }
        }

        if (!found) {
          status = 'down';
          error = `DNS ${recordType} record does not match expected value: ${expected}`;
        }
      }
    } else if (['postgres', 'mysql', 'mongodb', 'redis'].includes(service.type)) {
      const connectionString = service.db_connection_string;
      const query = service.db_query;

      if (!connectionString) {
        throw new Error('Connection string is required');
      }

      if (service.type === 'postgres') {
        const { Client } = await import('pg');
        const client = new Client({
          connectionString,
          connectionTimeoutMillis: (service.timeout || 10) * 1000,
        });
        await client.connect();
        await client.query(query || 'SELECT 1');
        responseTime = Date.now() - startTime;
        await client.end();
      } else if (service.type === 'mysql') {
        const mysql = await import('mysql2/promise');
        const connection = await mysql.createConnection({
          uri: connectionString,
          connectTimeout: (service.timeout || 10) * 1000
        });
        await connection.query(query || 'SELECT 1');
        responseTime = Date.now() - startTime;
        await connection.end();
      } else if (service.type === 'mongodb') {
        const { MongoClient } = await import('mongodb');
        const client = new MongoClient(connectionString, {
          serverSelectionTimeoutMS: (service.timeout || 10) * 1000
        });
        await client.connect();
        await client.db().command({ ping: 1 });
        responseTime = Date.now() - startTime;
        await client.close();
      } else if (service.type === 'redis') {
        const { createClient } = await import('redis');
        const client = createClient({
          url: connectionString,
          socket: {
            connectTimeout: (service.timeout || 10) * 1000
          }
        });
        await client.connect();
        await client.ping();
        responseTime = Date.now() - startTime;
        await client.disconnect();
      }
    }
  } catch (err) {
    status = 'down';
    error = err.name === 'AbortError' ? 'Request timeout' : err.message;
    responseTime = Date.now() - startTime;
  }

  // Save ping result
  // Prisma async
  await db.ping.create({
    data: {
      service_id: service.id,
      status,
      response_time: typeof responseTime === 'number' ? responseTime : 0,
      status_code: statusCode,
      error: error ? String(error) : null
    }
  });

  // Check for status change and send notifications
  const prevStatus = lastStatus.get(service.id);

  // 1. Handle DOWN state
  if (status === 'down') {
    // Check open incident
    let openIncident = await db.serviceIncident.findFirst({
      where: {
        service_id: service.id,
        status: 'down',
        ended_at: null
      }
    });

    // If no open incident, create one
    if (!openIncident) {
      openIncident = await db.serviceIncident.create({
        data: {
          service_id: service.id,
          status: 'down',
          started_at: new Date(),
          error_message: error
        }
      });
      console.log(`📝 Incident recorded for ${service.name}`);
    }

    // Handle Notifications
    if (service.notify_down) {
      // 1. Check Notification Delay
      const startedAt = new Date(openIncident.started_at).getTime();
      const now = Date.now();
      const delayMs = (service.notification_delay || 0) * 1000;

      if (now - startedAt < delayMs) {
        // Delaying
      } else {
        // 2. Check Last Alert for Repeat Logic
        const lastAlert = await db.alertHistory.findFirst({
          where: {
            service_id: service.id,
            type: { in: ['down', 'down-repeat'] }
          },
          orderBy: { created_at: 'desc' }
        });

        let shouldSendAlert = false;
        let alertType = 'down';

        if (!lastAlert) {
          shouldSendAlert = true;
        } else {
          const lastAlertTime = new Date(lastAlert.created_at).getTime();
          // If last alert was BEFORE this incident started, it's a new incident
          if (lastAlertTime < (startedAt - 5000)) {
            shouldSendAlert = true;
          }
          // Repeat logic
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

          // Record alert
          await db.alertHistory.create({
            data: {
              service_id: service.id,
              type: alertType,
              message: `Service is down: ${error}`
            }
          });
        }
      }
    }
  }

  // 2. Handle UP state (Recovery)
  else if (status === 'up') {
    // Check active incident
    const openIncident = await db.serviceIncident.findFirst({
      where: {
        service_id: service.id,
        status: 'down',
        ended_at: null
      },
      orderBy: { started_at: 'desc' }
    });

    if (openIncident) {
      const startTime = new Date(openIncident.started_at).getTime();
      const endTime = Date.now();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);

      await db.serviceIncident.update({
        where: { id: openIncident.id },
        data: {
          ended_at: new Date(),
          duration_seconds: durationSeconds,
          status: 'resolved'
        }
      });

      console.log(`✅ Incident resolved for ${service.name} (duration: ${durationSeconds}s)`);

      if (service.notify_down || prevStatus === 'down') {
        console.log(`🟢 Service ${service.name} RECOVERED`);
        sendRecoveryAlert(service, responseTime);
        triggerWebhooks('recovery', service, `${responseTime}ms`);
      }
    }
  }

  lastStatus.set(service.id, status);

  // 3. Handle Slow Response
  if (status === 'up' && service.slow_threshold && responseTime > service.slow_threshold) {
    console.log(`⚠️ Service ${service.name} is SLOW (${responseTime}ms > ${service.slow_threshold}ms threshold)`);
    triggerWebhooks('slow', service, `Response time: ${responseTime}ms (threshold: ${service.slow_threshold}ms)`);
  }

  const statusIcon = status === 'up' ? '✅' : '❌';
  console.log(`${statusIcon} [${new Date().toISOString()}] ${service.name}: ${status} (${responseTime}ms)`);
}

function scheduleService(service) {
  if (activeIntervals.has(service.id)) {
    clearInterval(activeIntervals.get(service.id));
  }
  const intervalMs = (service.interval || 60) * 1000;
  const intervalId = setInterval(() => checkService(service), intervalMs);
  activeIntervals.set(service.id, intervalId);
  console.log(`📅 Scheduled ${service.name} every ${intervalMs / 1000}s`);
}

export async function startPingJobs() {
  console.log('🚀 Starting ping jobs...');

  // Get all active services
  const services = await db.service.findMany({
    where: { paused: 0 }
  });

  if (services.length === 0) {
    console.log('ℹ️ No active services configured yet');
  }

  services.forEach(service => {
    checkService(service);
    scheduleService(service);
  });

  // Watch for service changes every 30s
  setInterval(async () => {
    try {
      const currentServices = await db.service.findMany(); // All services

      // Find new/updated
      currentServices.forEach(service => {
        const existingInterval = activeIntervals.get(service.id);

        // Paused
        if (service.paused && existingInterval) {
          console.log(`⏸️ Service paused: ${service.name}`);
          clearInterval(existingInterval);
          activeIntervals.delete(service.id);
          return;
        }

        // New or Resumed
        if (!service.paused && !existingInterval) {
          console.log(`➕ New/resumed service detected: ${service.name}`);
          checkService(service);
          scheduleService(service);
        }
      });

      // Removed
      const currentIds = new Set(currentServices.map(s => s.id));
      for (const [serviceId, intervalId] of activeIntervals) {
        if (!currentIds.has(serviceId)) {
          console.log(`➖ Service removed: ${serviceId}`);
          clearInterval(intervalId);
          activeIntervals.delete(serviceId);
          lastStatus.delete(serviceId);
        }
      }
    } catch (err) {
      console.error('Error refreshing services:', err);
    }
  }, 30000);

  console.log(`✅ Ping jobs started for ${services.length} services`);
}

async function runSslChecks() {
  console.log('🔒 Starting SSL/Domain/GeoIP checks...');
  const services = await db.service.findMany({
    where: {
      paused: 0,
      type: { in: ['http', 'https'] }
    }
  });

  for (const service of services) {
    // 1. SSL Check
    if (service.url.startsWith('https') || service.type === 'https') {
      try {
        const sslResult = await checkSSL(service.url);
        if (sslResult) {
          await db.service.update({
            where: { id: service.id },
            data: { ssl_expiry: sslResult.validTo }
          });
          console.log(`🔒 SSL updated for ${service.name}: ${sslResult.daysRemaining} days remaining`);
        }
      } catch (err) {
        console.error(`SSL check failed for ${service.name}:`, err.message);
      }
    }

    // 2. Domain Check
    try {
      const domainResult = await checkDomainExpiry(service.url);
      if (domainResult) {
        await db.service.update({
          where: { id: service.id },
          data: { domain_expiry: domainResult.expiryDate }
        });
        console.log(`globe Domain updated for ${service.name}: ${domainResult.daysRemaining} days remaining`);
      }
    } catch (err) {
      console.error(`Domain check failed for ${service.name}:`, err.message);
    }

    // 3. GeoIP Check
    try {
      await new Promise(r => setTimeout(r, 1500));
      const geoResult = await checkServerLocation(service.url);
      if (geoResult) {
        await db.service.update({
          where: { id: service.id },
          data: {
            server_country: geoResult.country,
            server_city: geoResult.city,
            server_lat: geoResult.lat,
            server_lon: geoResult.lon,
            region: `${geoResult.city}, ${geoResult.country}`
          }
        });
        console.log(`📍 Location updated for ${service.name}: ${geoResult.city}, ${geoResult.country}`);
      }
    } catch (err) {
      console.error(`GeoIP check failed for ${service.name}:`, err.message);
    }
  }
}

// Schedule SSL/Domain checks (every 12 hours)
setTimeout(() => {
  runSslChecks();
  setInterval(runSslChecks, 12 * 60 * 60 * 1000);
}, 10000); // Start after 10 seconds
