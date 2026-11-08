# Local SQLite recovery

The local service stores workspace versions, catalog edits, demo accounts, proposal links, customer feedback and independent website inquiries in `work/runtime/pac.sqlite` (or `PAC_DB_PATH`). Use Node 22.13 or newer. This workflow is for trusted local demo backups; it does not import arbitrary browser exports or databases from third parties.

Create a consistent backup while the service is running:

```sh
node scripts/database-recovery.mjs backup --source work/runtime/pac.sqlite --destination work/backups/pac-2026-11-07.sqlite
```

The command captures committed WAL changes through SQLite, validates the schema and integrity, and writes a private `0600` database plus a SHA-256 manifest. Keep both files together. They include customer contact information, commercial data and account password hashes; store them in a private location. Nothing is uploaded. Reusing an existing destination is refused.

Validate a database without modifying it:

```sh
node scripts/database-recovery.mjs verify --source work/backups/pac-2026-11-07.sqlite
```

Restore into a **new** database file, then start the service using that file:

```sh
node scripts/database-recovery.mjs restore --source work/backups/pac-2026-11-07.sqlite --destination work/runtime/pac-restored.sqlite
PAC_DB_PATH=work/runtime/pac-restored.sqlite npm start
```

Stop the existing service before starting its replacement on the same port. The restore command checks the backup checksum, schema and SQLite integrity, refuses existing destinations and sidecars, and never overwrites the current database. Staff sessions are invalidated, so sign in again. Existing scoped proposal links, expiry/revocation state, feedback, catalog versions and inquiry receipts are restored to the backup point. Changes made after that point stay only in the previous database. Keep the previous file until the restored state has been reviewed.

Backups are not encrypted or automatically scheduled. They do not include source media or application files; keep the matching project revision and catalog assets. Legacy browser workspace migration and general document uploads remain separate, unimplemented capabilities. Browser data is retained by the app for manual recovery; this command does not modify it.
