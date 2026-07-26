# Backend (PocketBase)

Single-binary PocketBase backend. The binary itself isn't committed — download it per your platform:

```sh
# Linux amd64 example; see https://github.com/pocketbase/pocketbase/releases for other platforms
curl -sL -o pocketbase.zip https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_<version>_linux_amd64.zip
unzip pocketbase.zip pocketbase && rm pocketbase.zip && chmod +x pocketbase
```

## Local dev

Copy `.env.example` to `.env` and fill in values, then load it into the shell
before starting the server (the binary doesn't read `.env` itself):

```sh
set -a && source .env && set +a
./pocketbase serve
```

Migrations in `pb_migrations/` run automatically on startup. Admin UI at `http://127.0.0.1:8090/_/`.

Setting `PB_DEV_SUPERUSER_EMAIL`/`PASSWORD` and `PB_DEV_TEST_USER_EMAIL`/`PASSWORD`
in `.env` before the *first* run against a fresh `pb_data` seeds a superuser and
a household test user, so a new dev environment doesn't need a manual Admin UI
trip to create accounts. See `.env.example`.

> **Gotcha:** if you forget the `source .env` step, `pocketbase serve` starts
> up fine with no error — it just silently skips anything env-gated (dev
> account seeding, the OFF write-back hook), since those vars are read from
> the process environment, not the file. If a fresh instance seeds no
> accounts, this is the first thing to check. Also note the dev-seed
> migration only runs once per `pb_data` — if it already applied as a no-op,
> sourcing `.env` and restarting won't retroactively seed anything; you'd
> need to create the accounts manually (Admin UI) or via `migrate down`/`up`
> on that one migration.

`pb_data/` (the SQLite database + uploaded files) is gitignored — it's local/deployment state, not source.
