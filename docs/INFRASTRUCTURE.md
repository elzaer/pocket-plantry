# Infrastructure plan — pantry & meal planner

Self-hosted on the existing home Linux server, alongside the current website. Goal: zero additional cost, minimal ops overhead, works well for two household users to start.

---

## Deployment

- **Subdomain**: e.g. `pantry.yourdomain.com`, pointed at the home server via an A record on the existing domain. Free, doesn't touch the current site.
- **Reverse proxy**: Caddy, run alongside (or replacing) whatever currently serves the existing website. Caddy issues and renews Let's Encrypt certificates automatically — no manual `certbot` steps, no cron job to remember. If Nginx + certbot is already in place and working, that's a fine alternative; no need to migrate just for this.
- **Existing website is untouched** — separate site block / separate reverse-proxy config, same box.

## Backend

- **PocketBase**: single Go binary, embedded SQLite, built-in auth, realtime subscriptions, and an admin UI. Run as a `systemd` service so it survives reboots and restarts on crash.
- **Two user accounts** (household members) via PocketBase's built-in auth — no separate auth service needed.
- Talks to Open Food Facts (Epic 0) for product lookups; no separate infrastructure needed for that, it's just outbound HTTPS calls from the backend.

## Frontend

- Plain web app to start — no PWA build tooling required.
- Add a `manifest.json` + a couple of icon sizes so "add to home screen" opens standalone (no browser chrome) instead of a bare bookmark. ~10 lines of JSON, no build step.
- Talks to PocketBase via its JS SDK (REST + realtime subscriptions) directly from the browser.

## Security (minimal but not skippable)

- HTTPS everywhere — non-negotiable, and free via Let's Encrypt regardless of which reverse proxy is used.
- Strong, non-dictionary passwords on both accounts.
- `fail2ban` (or PocketBase's own rate limiting, if sufficient) watching the auth endpoint, since the app is reachable by anyone who finds the subdomain, not just household devices.
- PocketBase's admin UI should not be casually discoverable — worth restricting its route or at minimum ensuring it also requires strong auth (on by default, just don't weaken it).

## Data & backups

- The entire database is one SQLite file — trivial to back up.
- Automated nightly copy to a second location (NAS, cloud storage, even another machine on the network) from day one. Household data, even "just" a shopping list, shouldn't have a single point of failure.
- Keep a few days of rolling backups, not just the latest copy, in case a bad write goes unnoticed for a day.

## Future migration paths (not needed now, just not blocked)

- **Scaling beyond one household**: PocketBase/SQLite → self-hosted Supabase/Postgres. The schema is standard relational SQL either way, so this is a data migration, not a redesign.
- **Tighter network exposure**: Tailscale can be added later to take the app off the public internet entirely, without touching the app itself — purely a networking-layer change.

## Open decisions before build

- Reverse proxy: Caddy (simplest) vs reuse existing Nginx + certbot setup.
- Final subdomain name.
- Backup destination (NAS vs cloud storage vs secondary machine).
