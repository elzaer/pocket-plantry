# Backend (PocketBase)

Single-binary PocketBase backend. The binary itself isn't committed — download it per your platform:

```sh
# Linux amd64 example; see https://github.com/pocketbase/pocketbase/releases for other platforms
curl -sL -o pocketbase.zip https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_<version>_linux_amd64.zip
unzip pocketbase.zip pocketbase && rm pocketbase.zip && chmod +x pocketbase
```

## Local dev

```sh
./pocketbase serve
```

Migrations in `pb_migrations/` run automatically on startup. Admin UI at `http://127.0.0.1:8090/_/`.

`pb_data/` (the SQLite database + uploaded files) is gitignored — it's local/deployment state, not source.
