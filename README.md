# Navarro Shipping — Deployment & Operations Guide

## App Overview

Full-stack shipment tracking application built with:

- **Backend**: Express.js + TypeScript
- **Frontend**: React 18 + Vite + TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Auth**: Passport.js (email + password)
- **Real-time**: WebSocket (`/ws`)
- **Email**: Nodemailer (optional)

---

## Production Server Info

| Item | Value |
|---|---|
| VPS OS | Ubuntu 24.04 LTS |
| Web Server | Nginx (reverse proxy) |
| Process Manager | PM2 |
| App Folder | `/var/www/navarro` |
| App Port | `3010` (internal, not public) |
| Subdomain | `access.navarroshipping.live` |
| GitHub Repo | https://github.com/macwuche/navarroshipping |
| SSL | Let's Encrypt (Certbot) — auto-renew via cron |

---

## Environment Variables

Create a `.env` file at `/var/www/navarro/.env` with the following:

```env
NODE_ENV=production
PORT=3010

# PostgreSQL — replace with your actual credentials
DATABASE_URL=postgresql://navarro_user:YOUR_PASSWORD@localhost:5432/navarro_db

# Session — generate with: openssl rand -base64 32
SESSION_SECRET=YOUR_LONG_RANDOM_SECRET_HERE

# Email (optional — only needed for shipment notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@email.com
# SMTP_PASS=your_email_password
# SMTP_SECURE=false
# SMTP_FROM=no-reply@navarroshipping.live
```

---

## Initial Deployment Steps

Follow these steps in order. Each section is labeled with what it does.

---

### STEP 1 — Audit the VPS (Pre-flight Check)

Before doing anything, check what's already running so we don't break it.

```bash
# Check which web server is installed and running
nginx -v
systemctl status nginx

# Check which apps PM2 is managing
pm2 list

# See which ports are currently in use
ss -tlnp | grep LISTEN

# See all Nginx site configs
ls /etc/nginx/sites-enabled/

# See existing app folders
ls /var/www/
```

---

### STEP 2 — Point DNS in Hostinger

1. Log in to [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Go to **Domains** → `navarroshipping.live` → **DNS / Nameservers**
3. Add a new **A record**:
   - **Type**: A
   - **Name**: `access`
   - **Points to**: `YOUR_VPS_IP_ADDRESS`
   - **TTL**: 3600 (or Auto)
4. Save. DNS propagation takes 5–30 minutes (sometimes up to 24h).

To find your VPS IP:
```bash
curl -4 ifconfig.me
```

To verify DNS has propagated (run from your local machine):
```bash
nslookup access.navarroshipping.live
# or
dig access.navarroshipping.live +short
```

---

### STEP 3 — Install Prerequisites (if not already installed)

```bash
# Check Node.js version (need v18+)
node -v

# If Node.js not installed or outdated:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Check npm
npm -v

# Check PM2
pm2 -v

# If PM2 not installed:
npm install -g pm2

# Check PostgreSQL
psql --version

# If PostgreSQL not installed:
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

---

### STEP 4 — Create the App Folder

```bash
# Create the navarro folder inside /var/www/
sudo mkdir -p /var/www/navarro
cd /var/www/navarro
```

---

### STEP 5 — Clone the GitHub Repository

```bash
# Pull the code from GitHub
git clone https://github.com/macwuche/navarroshipping .
# The dot (.) means "clone into the current folder" — don't miss it
```

---

### STEP 6 — Set Up the Database

```bash
# Switch to the PostgreSQL system user
sudo -u postgres psql

# Inside psql, run these SQL commands:
CREATE DATABASE navarro_db;
CREATE USER navarro_user WITH ENCRYPTED PASSWORD 'CHOOSE_A_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE navarro_db TO navarro_user;
\q
```

---

### STEP 7 — Create the .env File

```bash
# Create and write the environment file
nano /var/www/navarro/.env
```

Paste the contents from the **Environment Variables** section above.
Fill in your actual `DATABASE_URL` password and a generated `SESSION_SECRET`.

To generate a SESSION_SECRET:
```bash
openssl rand -base64 32
```

---

### STEP 8 — Install Dependencies & Build

```bash
cd /var/www/navarro

# Install all Node.js dependencies
npm install

# Build the app (compiles TypeScript + bundles React)
npm run build
```

---

### STEP 9 — Run Database Migrations

```bash
cd /var/www/navarro

# Push the Drizzle schema to the database (creates all tables)
npm run db:push
```

---

### STEP 10 — Start the App with PM2

```bash
cd /var/www/navarro

# Start the app and name it "navarro" in PM2
pm2 start dist/server/index.js --name navarro

# Save PM2 process list so it restarts on server reboot
pm2 save

# (First time only) Set PM2 to auto-start on server boot
pm2 startup
# Copy and run the command it prints
```

---

### STEP 11 — Configure Nginx (Reverse Proxy)

Create a new Nginx config file just for this app (does NOT touch other apps):

```bash
sudo nano /etc/nginx/sites-available/navarro
```

Paste this config:

```nginx
server {
    listen 80;
    server_name access.navarroshipping.live;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then enable it and test:

```bash
# Enable the site (create a symlink)
sudo ln -s /etc/nginx/sites-available/navarro /etc/nginx/sites-enabled/navarro

# Test the Nginx config for syntax errors (IMPORTANT — catches issues before applying)
sudo nginx -t

# If test passes, reload Nginx (does NOT restart — zero downtime)
sudo systemctl reload nginx
```

---

### STEP 12 — Install SSL Certificate (HTTPS)

```bash
# Install Certbot if not already installed
sudo apt install certbot python3-certbot-nginx -y

# Obtain and install SSL certificate for the subdomain
sudo certbot --nginx -d access.navarroshipping.live

# Follow the prompts:
# - Enter your email address
# - Agree to Terms of Service
# - Choose option 2 (Redirect HTTP → HTTPS)
```

Certbot will automatically modify your Nginx config to add HTTPS.

---

### STEP 13 — Set Up SSL Auto-Renewal (Cron Job)

Let's Encrypt certificates expire every 90 days. This cron job renews them automatically:

```bash
# Open the root crontab
sudo crontab -e

# Add this line at the bottom:
0 3 * * * certbot renew --quiet && systemctl reload nginx
```

What this does: At 3:00 AM every day, Certbot checks if the certificate is close to expiry (within 30 days). If it is, it renews it. The `--quiet` flag suppresses output unless there's an error. After renewal, Nginx is reloaded to pick up the new certificate.

To verify the renewal works (dry run):
```bash
sudo certbot renew --dry-run
```

---

### STEP 14 — VPS Health Check

Run these to confirm everything is healthy:

```bash
# Check PM2 — navarro should show "online"
pm2 list

# Check PM2 logs for errors
pm2 logs navarro --lines 50

# Check Nginx is running
sudo systemctl status nginx

# Check the app responds (replace IP with your VPS IP)
curl -I http://localhost:3010

# Check HTTPS works
curl -I https://access.navarroshipping.live

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU load
uptime

# Check all listening ports
ss -tlnp | grep LISTEN
```

---

## Updating the App (Future Deployments)

When you push new code to GitHub and want to update the live app:

```bash
cd /var/www/navarro

# Pull latest code
git pull origin main

# Install any new dependencies
npm install

# Rebuild the app
npm run build

# If there are new database schema changes:
npm run db:push

# Restart the app with PM2 (zero downtime reload)
pm2 restart navarro

# Check it's running fine
pm2 logs navarro --lines 30
```

---

## Default Admin Credentials

The server auto-creates an admin account on first start (if none exists):

- **Email**: `admin@navarroshipping.com`
- **Password**: `admin123`

**Change this password immediately after first login.**

---

## Troubleshooting

| Problem | Command to diagnose |
|---|---|
| App not loading | `pm2 logs navarro` |
| Nginx errors | `sudo nginx -t` and `sudo journalctl -u nginx` |
| Database errors | `sudo -u postgres psql -c "\l"` |
| Port conflict | `ss -tlnp \| grep 3010` |
| SSL issues | `sudo certbot certificates` |
| App won't start after reboot | `pm2 resurrect` |

---

## File Locations Quick Reference

| Item | Path |
|---|---|
| App code | `/var/www/navarro/` |
| Environment variables | `/var/www/navarro/.env` |
| Nginx config (this app) | `/etc/nginx/sites-available/navarro` |
| Nginx configs (all apps) | `/etc/nginx/sites-enabled/` |
| PM2 logs | `~/.pm2/logs/navarro-out.log` |
| Let's Encrypt certs | `/etc/letsencrypt/live/access.navarroshipping.live/` |
