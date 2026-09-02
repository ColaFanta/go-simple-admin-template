# Goose Migrations

Schema changes belong in forward-only migrations under `scripts/goose`.

## Workflow

1. Inspect the current status and database configuration.
2. Add a new numbered migration; do not edit an already-applied migration.
3. Register both `Up` and `Down` operations in the migration.
4. Run the migration status command.
5. Apply it with the `Goose Up` VS Code task or `go run ./scripts/goose/up`.
6. Validate the feature against the migrated schema.

## Commands

```sh
go run ./scripts/goose/status
go run ./scripts/goose/up
go run ./scripts/goose/down
```

The migration directory is configured by `scripts/migrationdb/init.go`. Seeds are separate from schema migrations and run through `go run ./scripts/seed` when development data is needed.