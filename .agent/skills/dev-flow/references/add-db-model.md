# Add A Database Model

Read `internal/app/module/dao/model`, `internal/app/module/dao/model/gen.go`, `scripts/goose`, and `scripts/seed` first.

1. Add the GORM model under `internal/app/module/dao/model` using nearby tags and names.
2. Add a new forward Goose migration under `scripts/goose`; do not edit an applied migration.
3. Add seed data only when useful for local development.
4. Run `go generate ./internal/app/module/dao/model` when generated DAO helpers are required.
5. Update the owning service and route module.

Generated files under `internal/app/module/dao/gen` must not be edited manually.