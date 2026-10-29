# Deploying PaisaPilot (invite-only beta)

PaisaPilot has **no separate backend service**. There is no Postgres, no Redis,
no queue and no object storage. One Node process serves the app and owns one
SQLite file. That is the whole backend.

What you actually need to provide:

| Requirement | Why |
| --- | --- |
| Node.js **24.x** | The app uses the built-in `node:sqlite` module. Node 22 will not work. |
| A **persistent disk** | Holds `paisapilot.db` (plus `-wal` / `-shm`). Ephemeral filesystems lose every account. |
| **HTTPS** | Session cookies are `secure` in production, so login silently fails over plain HTTP. |
| One app instance | SQLite allows one writer. Do not scale horizontally against the same file. |

Rough size: ~512 MB RAM and <1 GB disk is plenty for a few hundred beta users.

---

## Option A — single VPS (recommended for a beta)

Tested shape: Ubuntu 24.04, Caddy for TLS, systemd for supervision.

### 1. Install Node 24

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs caddy
node -v   # must print v24.x
```

### 2. Create a service user and directories

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin paisapilot
sudo -u paisapilot git clone <your-repo-url> /home/paisapilot/app
sudo mkdir -p /var/lib/paisapilot
sudo chown -R paisapilot:paisapilot /var/lib/paisapilot /home/paisapilot/app
```

### 3. Configure the environment

`/etc/paisapilot.env` (mode `600`, owner root):

```bash
NODE_ENV=production
PORT=3000
TZ=Asia/Kolkata
DATABASE_PATH=/var/lib/paisapilot/paisapilot.db
BETA_INVITE_ONLY=true
# PDF import + Gemini narration (get a key at https://aistudio.google.com/apikey)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-sonnet-4-5
```

```bash
sudo chmod 600 /etc/paisapilot.env
```

`TZ=Asia/Kolkata` matters: "this month" is computed in the server's timezone
(see known bug #10).

### 4. Build

```bash
sudo -u paisapilot bash -lc 'cd /home/paisapilot/app && npm ci && npm run build'
```

`npm run build` is the only step that needs dev dependencies. The database is
created and migrated automatically on first request — no migration command.

### 5. systemd unit

`/etc/systemd/system/paisapilot.service`:

```ini
[Unit]
Description=PaisaPilot
After=network.target

[Service]
Type=simple
User=paisapilot
WorkingDirectory=/home/paisapilot/app
EnvironmentFile=/etc/paisapilot.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/var/lib/paisapilot
# Node 24 + next start
Environment=NODE_OPTIONS=--max-old-space-size=512

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now paisapilot
curl -s localhost:3000/api/health   # {"ok":true,...}
```

### 6. HTTPS with Caddy

`/etc/caddy/Caddyfile`:

```
beta.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

Caddy obtains and renews the certificate. Point the DNS `A` record at the VPS
first. Do not put Cloudflare in "Flexible" mode — the origin must be HTTPS, or
the secure cookie is dropped.

### 7. Issue the first invite

```bash
cd /home/paisapilot/app
sudo -u paisapilot DATABASE_PATH=/var/lib/paisapilot/paisapilot.db \
  npm run invite -- create --email you@example.com --label "Founder" --days 7
```

Open `https://beta.example.com/signup`, enter the code, and complete onboarding.
See [Invite operations](#invite-operations) below for the rest.

---

## Option B — Docker

The repo includes a `Dockerfile` and `.dockerignore`. The database lives on a
named volume, never in the image.

```bash
docker build -t paisapilot .
docker run -d --name paisapilot \
  -p 3000:3000 \
  -v paisapilot-data:/data \
  -e BETA_INVITE_ONLY=true \
  -e TZ=Asia/Kolkata \
  -e GEMINI_API_KEY=your-key \
  --restart unless-stopped \
  paisapilot
```

`docker-compose.yml`:

```yaml
services:
  app:
    build: .
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      TZ: Asia/Kolkata
      BETA_INVITE_ONLY: "true"
      DATABASE_PATH: /data/paisapilot.db
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      GEMINI_MODEL: gemini-2.5-flash
    volumes:
      - paisapilot-data:/data
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  paisapilot-data:
```

Put Caddy/nginx in front for TLS. Issue invites inside the container:

```bash
docker compose exec app npm run invite -- create --label "Riya" --days 30
```

Back up the volume:

```bash
docker compose exec app node scripts/backup.mjs /data/backups
docker cp paisapilot-app-1:/data/backups ./backups
```

---

## Option C — managed platforms

Works on anything that runs a Dockerfile and offers a persistent volume:

- **Fly.io** — `fly launch`, then `fly volumes create paisapilot_data --size 1`,
  mount at `/data`, set `DATABASE_PATH=/data/paisapilot.db`.
- **Railway / Render** — add a volume at `/data`, set the same variables.
- **Do not use Vercel.** Serverless functions have an ephemeral filesystem and
  multiple instances; the SQLite design cannot work there.

Set `min_machines_running = 1` and disable autoscaling on Fly. Every extra
machine is a second writer against the same file.

---

## Environment variables

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `DATABASE_PATH` | Recommended | `./data/paisapilot.db` | Absolute path on the persistent volume. |
| `BETA_INVITE_ONLY` | No | `true` | Set `false` only to open signup. |
| `NODE_ENV` | Yes in prod | — | `production` makes cookies `secure`. |
| `PORT` | No | `3000` | |
| `TZ` | Recommended | system | `Asia/Kolkata` for correct month boundaries. |
| `GEMINI_API_KEY` | No | unset | Enables PDF statement import and Gemini narration. Without it, PDF uploads are rejected and CSV still works. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Any Gemini model that supports `generateContent` and PDF input. |
| `GEMINI_API_BASE` | No | Google endpoint | Only for tests/stubs; leave unset in production. |
| `ANTHROPIC_API_KEY` | No | unset | Enables Claude narration. |
| `OPENAI_API_KEY` | No | unset | Used only if Gemini and Anthropic are unset. |
| `BACKUP_KEEP` | No | `14` | How many backup files `scripts/backup.mjs` retains. |

Never commit `.env`, `.env.production` or `data/`. All three are gitignored.

### Gemini and PDF import

- Get a key at <https://aistudio.google.com/apikey>, then set `GEMINI_API_KEY` in
  the host environment. Treat it as a secret: it is only read server-side and is
  never sent to the browser.
- PDF uploads are 8 MB max. Next.js server actions are capped at `12mb` in
  `next.config.mjs` to leave room for multipart overhead, so a reverse proxy in
  front must allow at least that: `client_max_body_size 12m;` in nginx, or
  Caddy's default (1 GB) is fine.
- If the key is missing or invalid, uploads fail with a readable message and the
  rest of the app keeps working. Set `GEMINI_API_KEY` to an empty value to
  disable PDF import deliberately.
- Decrypted PDFs are converted to layout text locally; the password itself is
  never logged or stored. Plain PDFs and scans go to Gemini as a file.

---

## Invite operations

Signup requires a code while `BETA_INVITE_ONLY` is unset or `true`. Codes are
stored as SHA-256 hashes, so a lost code cannot be recovered — revoke and issue
a new one.

```bash
npm run invite -- create --email friend@example.com --label "Riya" --uses 1 --days 30
npm run invite -- create --label "Twitter batch" --uses 10 --days 14
npm run invite -- list
npm run invite -- validate PP-XXXX-XXXX-XXXX --email friend@example.com
npm run invite -- revoke PP-XXXX-XXXX-XXXX
npm run invite -- stats
```

- Codes look like `PP-XXXX-XXXX-XXXX` and are case-insensitive.
- `--days 0` never expires. `--uses` is capped at 100.
- Binding `--email` means only that address can redeem the code.
- Redemption is transactional: two simultaneous signups cannot share the last
  use of a code.

Invites are not emailed by the app — send the code yourself. There is no admin
UI (known bug #12), so this command needs shell access to the host.

---

## Backups and restore

`scripts/backup.mjs` uses SQLite's `VACUUM INTO`, which is consistent while the
app is running:

```bash
cd /home/paisapilot/app
sudo -u paisapilot DATABASE_PATH=/var/lib/paisapilot/paisapilot.db \
  node scripts/backup.mjs /var/backups/paisapilot
```

Cron, every six hours, keeping 14 files:

```cron
0 */6 * * * cd /home/paisapilot/app && sudo -u paisapilot DATABASE_PATH=/var/lib/paisapilot/paisapilot.db BACKUP_KEEP=14 node scripts/backup.mjs /var/backups/paisapilot
```

Then copy `/var/backups/paisapilot` off the machine (rclone, S3, another host).
A backup on the same disk is not a backup.

Restore:

```bash
sudo systemctl stop paisapilot
sudo rm -f /var/lib/paisapilot/paisapilot.db-wal /var/lib/paisapilot/paisapilot.db-shm
sudo cp /var/backups/paisapilot/paisapilot-<stamp>.db /var/lib/paisapilot/paisapilot.db
sudo chown paisapilot:paisapilot /var/lib/paisapilot/paisapilot.db
sudo systemctl start paisapilot
curl -s localhost:3000/api/health
```

---

## Upgrades

```bash
sudo systemctl stop paisapilot
sudo -u paisapilot bash -lc 'cd /home/paisapilot/app && git pull && npm ci && npm run build'
sudo systemctl start paisapilot
```

Schema changes are additive `CREATE TABLE IF NOT EXISTS` statements that run on
startup. Back up before every upgrade anyway.

For zero-downtime deploys the app would need a shared database and a second
instance; not this beta.

---

## Monitoring

- `GET /api/health` returns `200 {"ok":true}` when the process can query the
  database, `503` otherwise. Wire it into UptimeRobot/Better Stack.
- Application errors go to stdout/stderr: `journalctl -u paisapilot -f`.
- There is no error tracker, no metrics endpoint and no audit log. Add Sentry if
  the beta grows.

---

## Security checklist for the beta host

- [ ] HTTPS working; `http://` redirects to `https://`.
- [ ] `NODE_ENV=production` (secure cookies).
- [ ] `BETA_INVITE_ONLY` not set to `false`.
- [ ] SSH keys only, password login disabled, firewall allows 22/80/443.
- [ ] `data/` or the volume owned by the service user, not world-readable.
- [ ] Backups leaving the host on a schedule.
- [ ] `/api/health` reachable, `/api/export` returns 401 without a cookie.
- [ ] Invite codes sent over a channel you trust; revoke any that leak.

Before opening public signup, work through
[`docs/known-bugs.md`](./known-bugs.md#checklist-before-opening-signup-to-the-public).
