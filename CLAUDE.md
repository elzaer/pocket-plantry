# Project context

A household pantry management and meal planning app for two users (a couple), built as a web app first (add-to-homescreen, not a full PWA build initially), self-hosted on a home Linux server.

Full design docs live in this repo:
- `pantry_app_roadmap.md` — epics and user stories, in build order
- `infrastructure_plan.md` — hosting, deployment, backup plan
- `database_schema.md` — full schema with rationale for every table

Read those three files before making architectural changes — they contain the reasoning behind decisions below, not just the decisions themselves.

## Stack

- **Backend**: PocketBase (single binary, embedded SQLite, built-in auth + realtime subscriptions + admin UI). Not Supabase/Postgres — deliberately kept lightweight for a two-user household deployment. Migration path to Postgres exists later if needed; don't design around that possibility prematurely.
- **Frontend**: React + Vite (SPA). Uses the PocketBase JS SDK directly from the client for auth, data, and realtime subscriptions — no separate backend-for-frontend layer.
- **Hosting**: existing home Linux server, new subdomain, Caddy (or existing Nginx + certbot) reverse proxy, Let's Encrypt HTTPS.
- **Auth**: PocketBase's built-in auth, two user accounts under one household.

## Core data model decisions — don't relitigate these without discussion

- **Generic item vs product (SKU) split**: shopping lists, meal plans, and pantry stock all operate on `generic_items` (e.g. "peanut butter"). Barcodes resolve to `products`, which map many-to-one onto a generic item. This is the central pattern of the whole app — see `database_schema.md` for the full rationale.
- **No pack-size normalization**: pantry stock is a has/doesn't-have boolean per generic item, not a quantity. Don't add quantity-aware stock logic without an explicit decision to revisit this.
- **Quantity fields exist on `meal_items` and `receipt_line_items` but are intentionally unused today** — they're future-proofing, not dead code to clean up.
- Every household-scoped table carries `household_id` — this is deliberate, built to support other households later even though only one exists today.

## Product resolution chain (Epic 0)

Barcode scan resolves in this order, stopping at the first hit:
1. Local cache (by barcode)
2. Open Food Facts API (read: no auth; write: authenticated account, used to contribute new products/photos back)
3. Optional paid fallback API (not implemented yet — skip unless asked)
4. Manual entry — which also requires mapping the product to a generic item (existing or new) as part of the same form

Products sourced from the paid fallback are never written back to Open Food Facts (licensing) — only manually-entered data/photos get contributed.

## Build order

Follow the sequencing in `pantry_app_roadmap.md`. Epic 0 (product resolution + generic item mapping) is the foundation — build and prove it out with real manual usage before starting Epic 5 (receipt import), which depends heavily on it.

## Conventions

Starting defaults — adjust once real code exists, this isn't meant to be fixed in stone:

- Functional components + hooks only, no class components.
- ESLint (recommended config + `eslint-plugin-react-hooks`) and Prettier, defaults unless a specific rule causes friction.
- Vitest + React Testing Library for tests.
- Conventional commits (`feat:`, `fix:`, `chore:`, etc).

## Non-negotiables

- No secrets committed to the repo — use `.env`, gitignored, with `.env.example` as the template.
- HTTPS only, no plain HTTP endpoints in any deployed environment.
