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

## Session Log

This section records every deployment session — what was done, what was found, questions asked, and decisions made.

---

### Session 1 — Initial Planning (April 2026)

**Goal:** Deploy the Navarro Shipping app on the VPS under the subdomain `access.navarroshipping.live`.

**Pre-deployment questions asked and answered:**

| Question | Answer |
|---|---|
| VPS OS? | Ubuntu 24.04 LTS |
| Web server? | Nginx (to be confirmed on VPS) |
| Process manager? | PM2 (to be confirmed on VPS) |
| Existing app ports? | To be checked on VPS |
| Existing app locations? | Skycargo at `/var/www/Skycargo/backend` confirmed. Others to be checked. |
| Is it Node.js? | Yes — confirmed from codebase (Express.js + React + TypeScript) |
| Database already set up? | No — first deployment, database needs to be created fresh |
| Environment variables needed? | Yes — see Environment Variables section above |
| DNS already pointed? | No — needs to be set up in Hostinger |
| HTTPS/SSL wanted? | Yes — Let's Encrypt via Certbot, with auto-renewal cron job |

**Decisions made:**
- App folder: `/var/www/navarro`
- App port: `3010` (chosen to avoid conflicts with other apps)
- Subdomain: `access.navarroshipping.live`
- SSL: Let's Encrypt (Certbot), auto-renew via cron at 3AM daily
- Process manager: PM2, with startup hook so app survives reboots
- User has BYOBU on VPS — default terminal path was `/var/www/Skycargo/backend` at start of session. Always confirm current directory before running commands.

---

### Session 2 — Step 1 Audit: Nginx Orphaned Process Issue (April 2026)

**What we found during Step 1 (VPS pre-flight audit):**

Running `systemctl status nginx` showed Nginx in a **failed** state with this error:
```
nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
nginx: [emerg] bind() to 0.0.0.0:443 failed (98: Address already in use)
```
Nginx had been in this failed state for 4 days (since April 9, 2026).

**Root cause (diagnosed with `ss -tlnp | grep -E ':80|:443'`):**

Nginx processes (PIDs 910782 and 911146) were already running and holding ports 80 and 443 — but they were **orphaned** (not tracked by systemd). When systemd tried to start a new Nginx instance, it couldn't bind to those ports, so it marked itself as failed. The orphaned processes were still actively serving the other apps on the VPS.

**Fix applied:**
```bash
# Reset systemd's failed state
systemctl reset-failed nginx

# Gracefully stop the orphaned nginx processes
nginx -s stop

# Start nginx cleanly under systemd
systemctl start nginx

# Confirm it's running properly
systemctl status nginx
```

**Impact on other apps:** ~5 seconds of downtime while Nginx restarted. The other apps (Node.js/PM2 processes) were never stopped — only the Nginx front door briefly closed and reopened. All existing Nginx site configs were preserved.

**User confirmed:** Comfortable with brief downtime before proceeding.

**Result:** Nginx came back up cleanly.
```
Active: active (running) since Mon 2026-04-13 15:03:46 UTC
Main PID: 2589926 (nginx: master process)
Worker: 2589927 (nginx: worker process)
```

---

### Session 2 (continued) — Full VPS Audit Results

**PM2 apps running:**

| PM2 ID | Name | Port | Mode | Location |
|---|---|---|---|---|
| 5 | bluewave | unknown (cluster mode) | cluster | unknown |
| 9 | crypto-trading | 5000 | fork | `/var/www/crypto-trading` |
| 14 | newinvest | 3001 | fork | `/var/www/newinvest` |
| 17 | skycargo-backend | 8000 | fork | `/var/www/Skycargo` |

**All listening ports on VPS:**

| Port | Process | Notes |
|---|---|---|
| 22 | sshd | SSH access |
| 53 | systemd-resolve | DNS resolver |
| 80 | Nginx | HTTP |
| 443 | Nginx | HTTPS |
| 3001 | node (newinvest) | App port |
| 3306 | MySQL | Already installed |
| 33060 | MySQL | X protocol |
| 5000 | node (crypto-trading) | App port |
| 5001 | PM2 agent | PM2 internal |
| 5432 | PostgreSQL | Already installed — no need to install for Navarro |
| 8000 | node (skycargo-backend) | App port |
| **3010** | **FREE** | **Reserved for Navarro Shipping** |

**Existing Nginx site configs:**
- `bluewave`
- `newinvest`
- `skycargo`
- `smartsp2p.site`

**Existing `/var/www/` folders:**
- `Skycargo/`
- `certbot/`
- `crypto-trading/`
- `html/`
- `newinvest/`
- `navarro/` ← will be created in Step 4

---

### Session 2 (continued) — Step 2: DNS Setup

**DNS record added in Hostinger:**

| Field | Value |
|---|---|
| Type | A |
| Name | `access` |
| Points to | `76.13.139.241` |
| TTL | 3600 |

**Verification (nslookup on VPS):**
```
Name:   access.navarroshipping.live
Address: 76.13.139.241
```
DNS propagated successfully.

---

### Session 2 (continued) — Step 3: Prerequisites Check

All tools already installed — nothing needed:

| Tool | Version |
|---|---|
| Node.js | v20.20.1 |
| npm | 10.8.2 |
| PM2 | 6.0.14 |
| PostgreSQL | already running on port 5432 |

---

### Session 2 (continued) — Steps 4–7: Folder, Repo, Database, .env

**Step 4 — App folder created:**
```bash
mkdir -p /var/www/navarro
```

**Step 5 — Repo cloned:**
```bash
git clone https://github.com/macwuche/navarroshipping /var/www/navarro
```
161 objects cloned successfully.

**Step 6 — Database created:**
```bash
sudo -u postgres psql
CREATE DATABASE navarro_db;
CREATE USER navarro_user WITH ENCRYPTED PASSWORD 'MACT@08140615640Tt';
GRANT ALL PRIVILEGES ON DATABASE navarro_db TO navarro_user;
\q
```
Note: Password was initially set to placeholder, then corrected with:
```bash
sudo -u postgres psql -c "ALTER USER navarro_user WITH ENCRYPTED PASSWORD 'MACT@08140615640Tt';"
```

**Step 7 — .env file created:**

Note: Long commands kept getting wrapped by the terminal. Fixed by running 3 short commands separately:
```bash
head -3 /var/www/navarro/.env > /tmp/e
echo 'SESSION_SECRET=tFOT/YhUdxXw/7bZBsRirOrttaxCugRbl94yIgzq2FA=' >> /tmp/e
mv /tmp/e /var/www/navarro/.env
```
Final `.env` verified clean:
```
NODE_ENV=production
PORT=3010
DATABASE_URL=postgresql://navarro_user:MACT@08140615640Tt@localhost:5432/navarro_db
SESSION_SECRET=tFOT/YhUdxXw/7bZBsRirOrttaxCugRbl94yIgzq2FA=
```

---

### Session 2 (continued) — Steps 8–14: Build, Migrate, PM2, Nginx, SSL, Health Check

**Step 8 — Dependencies installed and app built:**
```bash
cd /var/www/navarro && npm install
npm run build
```
- 366 packages installed
- React frontend bundled (495kb JS, 57kb CSS)
- TypeScript server compiled successfully

**Step 9 — Database migration:**

First attempt failed with `permission denied for schema public` — PostgreSQL 15+ no longer grants CREATE on public schema by default. Fixed with:
```bash
sudo -u postgres psql -d navarro_db -c "GRANT ALL ON SCHEMA public TO navarro_user;"
```
Then re-ran `npm run db:push` — all tables created successfully.

**Step 10 — App started with PM2:**
```bash
pm2 start dist/server/index.js --name navarro
pm2 save
```
- PM2 id: 18
- Status: online
- Default admin auto-created: admin@navarroshipping.com / admin123
- **Change this password immediately after first login**

**Step 11 — Nginx configured:**
```bash
nano /etc/nginx/sites-available/navarro
ln -s /etc/nginx/sites-available/navarro /etc/nginx/sites-enabled/navarro
nginx -t
systemctl reload nginx
```
Config test passed. App responding on HTTP with `200 OK`.

**Step 12 — SSL certificate installed:**
```bash
certbot --nginx -d access.navarroshipping.live
```
- Certificate issued successfully
- Expires: 2026-07-12
- HTTPS confirmed working: `curl -I https://access.navarroshipping.live` → `200 OK`

**Step 13 — SSL auto-renewal cron job:**
```bash
crontab -e
# Added:
0 3 * * * certbot renew --quiet && systemctl reload nginx
```
Dry run confirmed `access.navarroshipping.live` renewal simulation succeeded.

Note: `accessbluewave.site` showed a renewal failure in the dry run — this is a pre-existing issue with another app (manual plugin, not Nginx). Not related to Navarro deployment. Site was manually verified on April 13, 2026 — live and showing valid padlock (connection secure). Left untouched. Only revisit if SSL expires or stops working.

**Step 14 — Final health check (April 13, 2026):**

| Check | Result |
|---|---|
| navarro PM2 | online, 0 restarts |
| All other apps | online, untouched |
| Disk space | 8.1G / 48G (17%) |
| Memory | 1.4G / 3.8G used, 2.4G available |
| CPU load | 0.00, 0.07, 0.08 — idle |
| Server uptime | 68 days |
| HTTPS | 200 OK on access.navarroshipping.live |

**Deployment completed successfully on April 13, 2026.**

**Key findings from audit:**
- Port `3010` is confirmed free for Navarro
- PostgreSQL is already installed (port 5432) — skip installation, go straight to creating the database
- MySQL is also present (used by other apps, not needed for Navarro)
- All 4 existing apps are online and healthy

---

---

### Session 3 — Logging Protocol Established (April 13, 2026)

**What was decided:**

All future Claude Code interactions on this project will be recorded in this README under the Session Log section.

Each session entry will document:
- What was asked or requested
- What was done (commands run, files changed, decisions made)
- Any errors encountered and how they were resolved
- Outcomes and current state

This ensures a full audit trail of every change made to the Navarro Shipping app — both in code and on the VPS.

---

### Session 4 — Bug Fix: "Not Authenticated" on Create Shipment (April 13, 2026)

**Issue reported:** Admin could not create shipments — every attempt returned "failed to create shipment not authenticated".

**Root cause:** The session cookie in `server/index.ts` was missing the `sameSite` attribute. Without it, modern browsers (Chrome 80+) apply unpredictable defaults that can prevent the session cookie from being sent with certain requests (particularly POST), causing the server to reject the request as unauthenticated even though the admin appeared logged in on the UI.

**Fix applied (`server/index.ts`):**
```js
// Before
cookie: {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
}

// After
cookie: {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  sameSite: "lax",     // ← added
  maxAge: 24 * 60 * 60 * 1000,
}
```

**To deploy this fix on the VPS:**
```bash
cd /var/www/navarro
git pull origin main
npm run build
pm2 restart navarro
pm2 logs navarro --lines 20
```

**Why `sameSite: "lax"`?** Lax mode allows the cookie to be sent on all same-site requests (including POST from the same domain) while blocking cross-site cookie abuse. This is the correct setting for a single-domain app behind Nginx.

---

### Session 5 — Bug Fixes: Logout Button, Edit Page Routing, Required Coordinates (April 13, 2026)

**Three bugs reported and fixed:**

**Bug 1 — No logout button on admin panel**

Root cause: `Layout.tsx` accepted `user` and `onLogout` props from `App.tsx` but never passed them to `Sidebar`. `Sidebar` also had no logout button.

Fix:
- `Sidebar.tsx`: Added `user` and `onLogout` props. Added user name/role display and a Logout button at the bottom of the sidebar.
- `Layout.tsx`: Changed `<Sidebar />` to `<Sidebar user={user} onLogout={onLogout} />`.

**Bug 2 — Edit shipment page caused logout (route ordering)**

Root cause: In `App.tsx`, the route `/admin/shipments` was listed BEFORE `/admin/shipments/:id/edit` inside wouter's `<Switch>`. Wouter matches routes in order, so navigating to `/admin/shipments/5/edit` was hitting the more general route first, causing a mismatch that fell through to the `<Redirect to="/user/login" />` fallback — which looked like a logout.

Fix: Moved the `/:id/edit` route ABOVE the list route in `App.tsx`. Also added `type="button"` to all action buttons in `ShipmentsPage` to prevent any accidental form submission.

**Bug 3 — Shipments could be created without Destination Coordinates**

Root cause: Lat/Lng fields were marked optional. Without coordinates, the tracking map cannot display a pin.

Fix: Made both Destination Latitude and Longitude required on the Create Shipment form (HTML `required` attribute + JS validation check).

**Files changed:** `client/src/components/layout/Sidebar.tsx`, `client/src/components/layout/Layout.tsx`, `client/src/App.tsx`, `client/src/pages/CreateShipmentPage.tsx`, `client/src/pages/ShipmentsPage.tsx`

**Commit:** `789271b` — pushed to `macwuche/navarroshipping` on April 13, 2026.

**To deploy on VPS:**
```bash
cd /var/www/navarro
git pull origin main
npm run build
pm2 restart navarro
```

---

**Question answered: Will making the GitHub repo private break VPS deployments?**

No. Making the repo private does not affect `git pull` from the VPS. However, GitHub no longer accepts password authentication — you need a **Personal Access Token (PAT)**:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Generate new token
2. Give it `repo` scope
3. On the VPS, update the remote URL to include the token:
   ```bash
   git remote set-url origin https://YOUR_TOKEN@github.com/macwuche/navarroshipping.git
   ```
   Or configure it in Git credentials. After that, `git pull origin main` works exactly as before.

---

### Session 6 — Push Remaining Changes to GitHub (April 13, 2026)

Committed and pushed pre-existing changes that had been sitting unstaged:

| File | Change |
|---|---|
| `client/src/hooks/useAuth.ts` | Refactored auth into React Context (`AuthContext`/`useAuthProvider`) so all components share one session check |
| `client/src/main.tsx` | Wrapped app in `AuthProvider` and `WsProvider` context providers |
| `client/src/pages/LoginPage.tsx` | Removed imperative `setLocation` after login — now relies on App.tsx route redirect |
| `client/src/pages/UserSignupPage.tsx` | Uses `register()` from auth context instead of raw fetch; same redirect approach |
| `client/src/pages/UserDashboardPage.tsx` | Subscribes to WebSocket for real-time shipment updates on the user dashboard |

**Commit:** `bd42e01` — pushed to `macwuche/navarroshipping` on April 13, 2026.

**To deploy on VPS:**
```bash
cd /var/www/navarro
git pull origin main
npm run build
pm2 restart navarro
```

---

### Session 7 — Show/Hide Password Toggle on Login & Signup (April 13, 2026)

**Feature added:** Eye/EyeOff icon button inside all password fields so users can reveal or hide what they're typing.

- `LoginPage.tsx` — one toggle for the password field
- `UserSignupPage.tsx` — independent toggles for both the Password and Confirm Password fields (each controlled separately)

**Commit:** `81316c6` — pushed to `macwuche/navarroshipping` on April 13, 2026.

**To deploy on VPS:**
```bash
cd /var/www/navarro && git pull origin main && npm run build && pm2 restart navarro
```

**Confirmed working on VPS** — April 13, 2026. Hard refresh required after deploy to clear cached assets.

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
| Nginx orphaned process (bind failed) | `ss -tlnp \| grep -E ':80\|:443'` then `nginx -s stop && systemctl start nginx` |

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
