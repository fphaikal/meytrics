# Changelog

All notable changes to the **MEYTRICS** project will be documented in this file.

## [1.3.41] - 2026-01-23

### 🐛 Hotfix
- **Prisma Version Pinning**: Fixed `P1012` error ("datasource property url is no longer supported") caused by Docker using the latest Prisma CLI (v7.x) instead of the local version (v5.22.0).
    - Moved `prisma` and `@prisma/client` from `devDependencies` to `dependencies` in `package.json` to ensure the correct CLI version is installed in the production container.

## [1.3.4] - 2026-01-23

### 🐛 Fixes
- **Docker Database Sync**: Fixed `P2022` (Column not found) errors in Docker by updating the startup command.
    - Added `npx prisma db push` to the Docker `CMD` to ensure the SQLite schema is automatically synchronized with `schema.prisma` on container startup.

## [1.3.3] - 2026-01-23

### 🐛 Fixes
- **Docker Compatibility**: Fixed `libssl/openssl` version mismatch error in Docker environment.
    - Updated `prisma/schema.prisma` binary targets to include `linux-musl-openssl-3.0.x` (matching `node:20-alpine`).
    - Updated `Dockerfile` to expressly install `openssl` via `apk` in both build and production stages.

## [1.3.2] - 2026-01-23

### 🐛 Fixes
- **Tabs Component**: Fixed persistent UI bug where scroll/navigation arrows would appear on `Tabs` components (Incident Detail & Integrations pages) even when content fit the screen.
    - Updated Tabs variant to `underlined`.
    - Applied specific CSS overrides to hide native scrollbars and library-generated scroll buttons.

## [1.3.1] - 2026-01-22
- Remove unused cn import from ServiceDetailPage: The 'cn' utility was imported but not used in ServiceDetailPage.tsx. This commit removes the unused import to clean up the code.

## [1.3.0] - 2026-01-22

### 🏗️ Architecture
- **Database Migration**: Complete backend refactor to **Prisma ORM** (SQLite). Replaced direct `better-sqlite3` queries in all services and routes for improved security and type safety.
- **Multiple Databases**: Architecture validated for multi-tenant/multi-DB support.
- **Indices**: Added composite indices (`[created_at, status]`) for optimized stats aggregation.

### ⚡ Optimization
- **Backend Aggregation**: Rewrote `pings.js` aggregation to use **Raw SQL**, reducing memory usage by ~85% for large datasets.
- **Frontend Build**: 
    - Implemented **Lazy Loading** for all Admin pages.
    - Added **Manual Chunking** (`react-vendor`, `ui-vendor`) to split bundles.
    - Enabled **Brotli & Gzip Compression** for production assets.

### 🐛 Fixes
- **Date Parsing**: Fixed `NaN` / "Unknown" duration issues in Services list and details page (`parseDate` utility).
- **Verification**: Passed comprehensive QA suite for all system features (Services, Pings, Incidents, Auth, etc.).

## [1.2.3] - 2026-01-21

### 🚀 Security Hardening
- **Helmet Integration**: Added secure HTTP headers.
- **Rate Limiting**: Added Global (500/15m) and Auth (10/1h) rate limits.
- **Custom Branding**: Added `X-Powered-By: MEY Agent` header.

### ⚡ Optimization
- **Database**: Enabled SQLite WAL mode and added compound indices.
- **Frontend**: Implemented Lazy Loading and Manual Chunking.

### 📦 Automation
- **Auto-Versioning**: About Page syncs with `package.json`.

### 🔧 Fixes
- **Dependency**: Resolved `react-simple-maps` peer dependency conflict.

## [1.2.2] - 2026-01-21

### 🐛 Hotfix
- **Build System**: Fixed TypeScript errors by removing unused `toast` imports in `LoginPage` and `IncidentDetailPage`.

## [1.2.1] - 2026-01-21

### ✨ Features
- **Password Reset**: Added functionality to change password in Admin Settings.
- **Integrations Page**: Rename Webhooks to Integrations for clarity.
- **Service Detail**: Added icons to statistics cards (Min/Max/Avg) and improved Paused status visibility.

### 🔧 Fixes
- **Toast System**: Migrated from `sonner` to native **HeroUI Toast** for consistency.
- **Build Errors**: Removed unused imports in `LoginPage` and `IncidentDetailPage`.

## [1.1.0] - 2026-01-20
- **Initial Release**: Basic monitoring functionality, pings, and status pages.
