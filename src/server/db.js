import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'monitor.db')
  : path.join(__dirname, '../../data/monitor.db');

export const db = new Database(dbPath);

export function initDatabase() {
  console.log(`📦 Initializing database at ${dbPath}...`);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Optimize SQLite performance
  db.pragma('journal_mode = WAL'); // Write-Ahead Logging for concurrency
  db.pragma('synchronous = NORMAL'); // Faster writes with good safety

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create status_pages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS status_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      subtitle TEXT,
      navbar_title TEXT,
      logo_url TEXT,
      favicon_url TEXT,
      hero_bg_color TEXT DEFAULT '#1e2a38',
      theme_mode TEXT DEFAULT 'system',
      bg_pattern TEXT DEFAULT 'none',
      monitor_style TEXT DEFAULT 'bars',
      meta_description TEXT,
      og_image_url TEXT,
      custom_css TEXT,
      is_default INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create status_page_sections table (for grouping services into sections)
  db.exec(`
    CREATE TABLE IF NOT EXISTS status_page_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status_page_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (status_page_id) REFERENCES status_pages(id) ON DELETE CASCADE
    )
  `);

  // Create status_page_services junction table (many-to-many)
  db.exec(`
    CREATE TABLE IF NOT EXISTS status_page_services (
      status_page_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      section_id INTEGER,
      display_options TEXT DEFAULT '{"showHistory":true,"showChart":true}',
      sort_order INTEGER DEFAULT 0,
      PRIMARY KEY (status_page_id, service_id),
      FOREIGN KEY (status_page_id) REFERENCES status_pages(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES status_page_sections(id) ON DELETE SET NULL
    )
  `);


  // Create services table
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT DEFAULT 'http',
      interval INTEGER DEFAULT 300,
      notify_down INTEGER DEFAULT 1,
      paused INTEGER DEFAULT 0,
      category_id INTEGER,
      status_page_id INTEGER,
      ssl_expiry DATETIME,
      domain_expiry DATETIME,
      region TEXT DEFAULT 'North America',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (status_page_id) REFERENCES status_pages(id) ON DELETE SET NULL
    )
  `);

  // Create pings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      response_time INTEGER,
      status_code INTEGER,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    )
  `);

  // Create incidents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'investigating',
      severity TEXT DEFAULT 'minor',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      resolved_at DATETIME
    )
  `);

  // Create incident updates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS incident_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    )
  `);

  // Create incident-service mapping
  db.exec(`
    CREATE TABLE IF NOT EXISTS incident_services (
      incident_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      PRIMARY KEY (incident_id, service_id),
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    )
  `);

  // Create maintenances table
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create maintenance-service mapping
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_services (
      maintenance_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      PRIMARY KEY (maintenance_id, service_id),
      FOREIGN KEY (maintenance_id) REFERENCES maintenances(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    )
  `);

  // Create subscribers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      verified INTEGER DEFAULT 0,
      token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create webhooks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT DEFAULT 'custom',
      events TEXT DEFAULT '["down","recovery"]',
      headers TEXT DEFAULT '{}',
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create alert history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alert_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER,
      type TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
    )
  `);

  // Create API keys table
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      key TEXT UNIQUE NOT NULL,
      permissions TEXT DEFAULT '["read"]',
      last_used DATETIME,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create status overrides table
  db.exec(`
    CREATE TABLE IF NOT EXISTS status_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      reason TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    )
  `);

  // Create settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Create tags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create service_tags junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_tags (
      service_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (service_id, tag_id),
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);

  // Create service_incidents table for auto-recorded incidents
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      started_at DATETIME NOT NULL,
      ended_at DATETIME,
      duration_seconds INTEGER,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    )
  `);

  // Migration: Add paused column to existing services table if not exists
  try {
    db.exec(`ALTER TABLE services ADD COLUMN paused INTEGER DEFAULT 0`);
    console.log('📦 Migration: Added paused column to services table');
  } catch (e) {
    // Column already exists, ignore
  }

  // Migration for SSL/Domain columns
  try {
    db.prepare('ALTER TABLE services ADD COLUMN ssl_expiry DATETIME').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN domain_expiry DATETIME').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN region TEXT DEFAULT "North America"').run();
  } catch (e) { }

  // Migration for Server Location (GeoIP)
  try {
    db.prepare('ALTER TABLE services ADD COLUMN server_country TEXT').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN server_city TEXT').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN server_lat REAL').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN server_lon REAL').run();
  } catch (e) { }
  console.log('📦 Migration: Added SSL/Domain/Region and Server Location columns to services table');

  // Migration for Navbar Title
  try {
    db.prepare('ALTER TABLE status_pages ADD COLUMN navbar_title TEXT').run();
    console.log('📦 Migration: Added navbar_title column to status_pages table');
  } catch (e) { }

  // Migration for Status Page Sections
  try {
    db.prepare('ALTER TABLE status_page_services ADD COLUMN section_id INTEGER').run();
    console.log('📦 Migration: Added section_id column to status_page_services table');
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE status_page_services ADD COLUMN display_options TEXT DEFAULT \'{"showHistory":true,"showChart":true}\'').run();
    console.log('📦 Migration: Added display_options column to status_page_services table');
  } catch (e) { }

  // Migration for Advanced Monitoring Features
  try {
    db.prepare('ALTER TABLE services ADD COLUMN timeout INTEGER DEFAULT 30').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN slow_threshold INTEGER DEFAULT 1000').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN http_method TEXT DEFAULT \'GET\'').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN custom_headers TEXT DEFAULT \'{}\'').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN follow_redirects INTEGER DEFAULT 1').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN auth_type TEXT DEFAULT \'none\'').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN auth_user TEXT').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN auth_pass TEXT').run();
  } catch (e) { }

  // Migration for Keyword and DNS Monitoring
  try {
    db.prepare('ALTER TABLE services ADD COLUMN keyword TEXT').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN dns_record_type TEXT DEFAULT \'A\'').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN dns_expected_value TEXT').run();
  } catch (e) { }

  console.log('📦 Migration: Added columns for Keyword and DNS monitoring');

  // Migration for Notification Settings
  try {
    db.prepare('ALTER TABLE services ADD COLUMN notification_repeat INTEGER DEFAULT 0').run();
  } catch (e) { }
  try {
    db.prepare('ALTER TABLE services ADD COLUMN notification_delay INTEGER DEFAULT 0').run();
  } catch (e) { }
  console.log('📦 Migration: Added columns for Notification settings');

  // Migration for Webhook Configuration
  try {
    db.prepare('ALTER TABLE webhooks ADD COLUMN config TEXT DEFAULT "{}"').run();
    console.log('📦 Migration: Added config column to webhooks table');
  } catch (e) { }

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pings_service_id ON pings(service_id);
    CREATE INDEX IF NOT EXISTS idx_pings_created_at ON pings(created_at);
    CREATE INDEX IF NOT EXISTS idx_pings_service_created ON pings(service_id, created_at); -- Compound index for fast history queries
    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
    CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
  `);

  // Create default admin user if not exists
  const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin');
    console.log(`👤 Default admin user created (admin/${adminPassword === 'admin' ? 'admin' : '<hidden>'})`);
  }

  // Set default settings if not exists
  const defaultSettings = [
    // General
    { key: 'page_title', value: 'Status Page' },
    { key: 'page_subtitle', value: 'Real-time system status' },
    { key: 'site_url', value: '' },
    { key: 'refresh_interval', value: '30' },
    { key: 'timezone', value: 'Asia/Jakarta' },

    // Branding
    { key: 'logo_url', value: '' },
    { key: 'favicon_url', value: '' },
    { key: 'hero_bg_color', value: '#1e2a38' },
    { key: 'theme_mode', value: 'system' },
    { key: 'bg_pattern', value: 'none' },
    { key: 'monitor_style', value: 'bars' },

    // SEO
    { key: 'meta_description', value: 'Monitor the status of all our services in real-time' },
    { key: 'og_image_url', value: '' },

    // Custom Links
    { key: 'nav_links', value: '[]' },
    { key: 'footer_links', value: '[]' },
    { key: 'custom_css', value: '' },

    // SMTP
    { key: 'smtp_host', value: '' },
    { key: 'smtp_port', value: '587' },
    { key: 'smtp_user', value: '' },
    { key: 'smtp_pass', value: '' },
    { key: 'smtp_from', value: '' },
    { key: 'notification_emails', value: '' }
  ];

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const setting of defaultSettings) {
    insertSetting.run(setting.key, setting.value);
  }

  console.log('✅ Database initialized');
}
