# MEYTRICS

A self-hosted uptime monitoring web application with a design similar to UptimeRobot. Monitor your services and get notified via email when they go down.

## Features

- 📊 **Status Page** - Public status page showing all monitored services
- 📈 **Uptime Bars** - Visual 90-day uptime history for each service  
- ⚡ **Real-time Updates** - Auto-refresh with configurable interval
- 🔍 **Advanced Monitoring** - Custom headers, method selection, and timeout settings
- 🏷️ **Tags Management** - Organize services with custom colored tags
- 🔔 **Email Notifications** - Get alerted when services go down/recover
- 🔐 **Admin Dashboard** - Protected dashboard to manage services and settings
- 🐳 **Docker Ready** - Easy deployment with Docker and docker-compose

## Quick Start

### Development Mode

```bash
# Install dependencies
npm install

# Start backend server (port 3000)
npm run dev:server

# Start frontend dev server (port 5173) in another terminal
npm run dev
```

### Docker Deployment

```bash
# Build and run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Access the application at `http://localhost:3000`

## Default Admin Credentials

- **Username:** admin
- **Password:** admin123

⚠️ **Change the default password after first login!**

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `DATA_DIR` | SQLite database directory | ./data |
| `JWT_SECRET` | JWT signing secret | (default, change in production!) |

### SMTP Settings (for email notifications)

Configure in Admin Dashboard → Settings:

1. **SMTP Host** - e.g., `smtp.gmail.com`
2. **SMTP Port** - e.g., `587`
3. **SMTP Username** - Your email address
4. **SMTP Password** - App password (for Gmail)
5. **Notification Emails** - Comma-separated list of recipients

## Tech Stack

- **Frontend:** React, TailwindCSS, React Router
- **Backend:** Node.js, Express
- **Database:** SQLite (better-sqlite3)
- **Auth:** JWT
- **Email:** Nodemailer

## License

MIT
