import express from 'express';
import cors from 'cors';
// Handle BigInt serialization
BigInt.prototype.toJSON = function () { return this.toString() }
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './src/server/db.js';
import { startPingJobs } from './src/server/jobs/pingService.js';
import servicesRouter from './src/server/routes/services.js';
import pingsRouter from './src/server/routes/pings.js';
import authRouter from './src/server/routes/auth.js';
import settingsRouter from './src/server/routes/settings.js';
import categoriesRouter from './src/server/routes/categories.js';
import incidentsRouter from './src/server/routes/incidents.js';
import maintenancesRouter from './src/server/routes/maintenances.js';
import badgesRouter from './src/server/routes/badges.js';
import webhooksRouter from './src/server/routes/webhooks.js';
import subscribersRouter from './src/server/routes/subscribers.js';
import apiKeysRouter from './src/server/routes/apiKeys.js';
import statusOverridesRouter from './src/server/routes/statusOverrides.js';
import statusPagesRouter from './src/server/routes/statusPages.js';
import publicStatusPagesRouter from './src/server/routes/publicStatusPages.js';
import publicSettingsRouter from './src/server/routes/publicSettings.js';
import tagsRouter from './src/server/routes/tags.js';
import ogImageRouter from './src/server/routes/ogImage.js';
import { db } from './src/server/db.js';
import { authMiddleware } from './src/server/middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow resource loading
  contentSecurityPolicy: false, // Disable CSP for now as it can break simple dashboards if not carefully tuned
}));
app.disable('x-powered-by'); // Hide Express
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'MEY Agent');
  next();
});
app.set('trust proxy', 1); // Trust first proxy (Cloudflare/Nginx)

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit login attempts
  message: { error: 'Too many login attempts, please try again later.' }
});

import compression from 'compression';

// Apply Middleware
app.use(limiter); // Global rate limit
app.use(cors());
app.use(compression()); // Compress all responses
app.use(express.json());

// Initialize database
initDatabase();

// Public API routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/public/services', servicesRouter);
app.use('/api/public/pings', pingsRouter);
app.use('/api/public/categories', categoriesRouter);
app.use('/api/public/incidents', incidentsRouter);
app.use('/api/public/maintenances', maintenancesRouter);
app.use('/api/public/status-overrides', statusOverridesRouter);
app.use('/api/public/settings', publicSettingsRouter);

app.use('/api/public/status-pages', publicStatusPagesRouter);
app.use('/api/og-image', ogImageRouter);

// File upload configuration imports
import multer from 'multer';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

console.log(`📂 Uploads directory: ${uploadDir}`);

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  // 5MB default limit if not specified
  limits: { fileSize: (parseInt(process.env.UPLOAD_LIMIT_MB) || 5) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Upload route
// Upload route with debug logging
app.post('/api/upload', (req, res, next) => {
  console.log('📥 Upload request received');
  console.log('Headers:', req.headers);
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      console.error('❌ No file in request');
      console.log('Body:', req.body);
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`✅ File uploaded: ${req.file.filename} (${req.file.size} bytes)`);
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });
});

// Badges (public, no auth)
app.use('/api/badges', badgesRouter);

// Public subscriber routes
app.use('/api/subscribers', subscribersRouter);

// Protected API routes (admin)
app.use('/api/services', authMiddleware, servicesRouter);
app.use('/api/pings', authMiddleware, pingsRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/maintenances', maintenancesRouter);
app.use('/api/webhooks', authMiddleware, webhooksRouter);
app.use('/api/admin/subscribers', authMiddleware, subscribersRouter);
app.use('/api/admin/api-keys', authMiddleware, apiKeysRouter);
app.use('/api/admin/status-overrides', authMiddleware, statusOverridesRouter);
app.use('/api/admin/status-pages', authMiddleware, statusPagesRouter);
app.use('/api/tags', authMiddleware, tagsRouter);

// Serve static files in production
// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  console.log(`📂 Static file serving enabled. Path: ${distPath}`);

  if (fs.existsSync(distPath)) {
    console.log('✅ Dist directory exists');
  } else {
    console.error('❌ Dist directory MISSING!');
  }

  // SEO Injection for Status Pages
  app.get('/status/:slug', async (req, res, next) => {
    const { slug } = req.params;
    if (slug.includes('.')) return next();

    try {
      const page = await db.statusPage.findUnique({ where: { slug } });
      if (!page) return next();

      const indexHtmlPath = path.join(distPath, 'index.html');
      if (!fs.existsSync(indexHtmlPath)) return next();

      let html = fs.readFileSync(indexHtmlPath, 'utf8');

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const fullUrl = `${protocol}://${host}/status/${slug}`;
      const domain = host;

      const pageTitle = page.title || page.name || 'Status Page';
      const title = `${pageTitle} by Meytrics`;
      const description = page.meta_description || page.subtitle || 'Service Status';

      // Determine OG Image URL
      let ogImage = page.og_image_url;
      if (!ogImage) {
        ogImage = `${protocol}://${host}/api/og-image/${page.slug}`;
      } else if (!ogImage.startsWith('http')) {
        ogImage = `${protocol}://${host}${ogImage}`;
      }

      // Inject Metadata
      // 1. Replace Title
      html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);

      // 2. Inject Meta Tags (Prepend to head for priority)
      const metaTags = `
        <meta name="description" content="${description}">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="${fullUrl}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${ogImage}">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:domain" content="${domain}">
        <meta property="twitter:url" content="${fullUrl}">
        <meta property="twitter:title" content="${title}">
        <meta property="twitter:description" content="${description}">
        <meta property="twitter:image" content="${ogImage}">
      `;

      html = html.replace('<head>', `<head>${metaTags}`);

      res.send(html);
    } catch (error) {
      console.error('SEO Injection Error:', error);
      next();
    }
  });

  app.use(express.static(distPath));

  // Handle SPA routing
  // Using regex because '*' is 404 in Express 5 path-to-regexp
  app.get(/(.*)/, (req, res) => {
    console.log(`🔄 Catch-all serving index.html for: ${req.url}`);
    const indexHtml = path.join(distPath, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      console.error('❌ index.html not found in dist path!');
      res.status(404).send('Application build not found');
    }
  });
} else {
  console.log('⚠️  Not in production mode, static files will not be served');
  console.log(`Current NODE_ENV: ${process.env.NODE_ENV}`);
}

// Start ping jobs
startPingJobs();

// Start data cleanup jobs
import { scheduleCleanupJobs } from './src/server/services/cleanup.js';
scheduleCleanupJobs();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MEYTRICS server running on port ${PORT}`);
  console.log(`📊 Status page: http://localhost:${PORT}`);
  console.log(`⚙️  Admin dashboard: http://localhost:${PORT}/admin`);
});
