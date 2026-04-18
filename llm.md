# LLM Guide

This repository is a pure Go admin and API starter. Treat it like a normal Fiber application with server-rendered `templ` pages, not like a meta-framework.

## Core Intent

- Keep implementation close to plain Go.
- Use existing feature modules as the source of truth for patterns.
- Prefer adding code in the same style and folder layout that already exists.
- Avoid introducing extra abstraction unless the repo already uses it.

## Mental Model

- `cmd/admin/main.go` boots the app and wires dependencies.
- `internal/admsvr/router` holds the HTTP entrypoints.
- `internal/admsvr/router/api` holds authenticated admin modules under `/api`.
- `internal/admsvr/router/auth` holds login and signup flows.
- `internal/admsvr/ui` holds reusable UI building blocks.
- `internal/biz` holds business concerns such as auth, RBAC, i18n, DAO, and models.
- `scripts/goose` and `scripts/seed` hold migration and seed workflows.

## Non-Negotiable Working Rules

- Do not invent a new framework layer.
- Do not add an `admin resource` DSL.
- Do not hand-edit generated `*_templ.go` files.
- Do not hand-edit generated files under `internal/biz/dao/gen`.
- Regenerate code from source files when needed.
- Reuse existing middleware and render helpers before creating new ones.
- Keep HTML pages and JSON/data handlers close to the relevant feature module.

## Preferred Workflow Before Changing Code

1. Read the existing module that is closest to the new task.
2. Identify which layer is being changed: route, templ page, translation, model, migration, or seed.
3. Change the source files only.
4. Run the relevant generator if the repo expects generated output.
5. Validate the route, data flow, and localization behavior.

## Repo Conventions To Preserve

- New admin routes normally belong under `internal/admsvr/router/api/<feature>`.
- Route modules expose `New(i do.Injector) fiber.Router` and are mounted from a parent index file.
- HTML rendering goes through `internal/fiber/handler.RenderTempl`.
- Layout composition happens by passing layout components into `RenderTempl`.
- Localization comes from the request-scoped localizer stored in Fiber locals.
- Models live under `internal/biz/dao/model`.
- Future schema changes should be added as new Goose migrations.

## Generation Commands

- Templ: `go tool templ generate`
- GORM model generation: `go generate ./internal/biz/dao/model`
- Swagger docs: `go generate ./internal/admsvr/router`

Use the existing VS Code tasks when they already exist.

## Skills

- [Add route](./skills/add-route.md)
- [Add templ page](./skills/add-templ-page.md)
- [Add language](./skills/add-language.md)
- [Add DB model](./skills/add-db-model.md)

## Good Defaults For AI

- Copy the closest existing feature module instead of creating a novel structure.
- Keep handlers small and explicit.
- Prefer composable templ components over one giant page component.
- If a page can serve both full-page and HTMX partial responses, follow the existing product module pattern.
- If an API shape changes, keep Swagger annotations in sync.

## What This Repo Is Not

- Not a low-code admin framework.
- Not a config-driven CRUD generator.
- Not a frontend SPA with Go acting only as an API.

It is a clean Go codebase that already includes the boring pieces so AI can help you extend real product features faster.