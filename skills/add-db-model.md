# Skill: Add DB Model

Use this guide when you need to add a new persistent entity to the project.

## Goal

Add a GORM model, migrate the schema safely, regenerate query helpers when needed, and keep the repo conventions intact.

## Read These Files First

- `internal/biz/dao/model`
- `internal/biz/dao/model/gen.go`
- `scripts/goose/00001_init.go`
- `scripts/seed/main.go`

## Model Source Of Truth

The source models live under `internal/biz/dao/model`. Generated access helpers live under `internal/biz/dao/gen` and should not be edited manually.

## Steps

1. Add a new model struct in `internal/biz/dao/model`.
2. Use the same GORM tagging and naming style already present in nearby models.
3. Decide whether the new model needs seed data.
4. Add a new Goose migration for the schema change.
5. Regenerate DAO helpers if the feature depends on generated accessors.
6. Update route or service code to use the new model.

## Migration Rule

For future work, prefer creating a new Goose migration instead of editing `scripts/goose/00001_init.go`.

That initial migration is useful as a reference for the existing schema shape, but once the project has history, new schema changes should be added forward as separate migrations.

## Generation

The model package already defines a generate directive:

```sh
go generate ./internal/biz/dao/model
```

Run that after changing model definitions when generated DAO code is required.

## Seeds

If the new model needs development bootstrap data:

- add seed logic under `scripts/seed/seed`
- wire it from `scripts/seed/main.go`

Keep seeds idempotent enough for local development workflows.

## Checklist

- Model added under `internal/biz/dao/model`.
- New schema change captured in a forward migration.
- Generated DAO code refreshed if needed.
- Seed logic added only when useful for local development.
- Feature code uses the model from the source or generated package appropriately.

## Avoid

- Editing `internal/biz/dao/gen` by hand.
- Editing old migrations for normal forward development.
- Putting model logic directly into handlers when a service or query helper is more appropriate.