# Skill: Add Route

Use this guide when you need to add a new page route, data route, or feature module.

## Goal

Add a route in the same style as the existing admin modules under `internal/admsvr/router/api`.

## Read These Files First

- `internal/admsvr/router/main.go`
- `internal/admsvr/router/api/index.go`
- `internal/admsvr/router/api/product/index.go`

## Route Layout In This Repo

- `internal/admsvr/router/main.go` creates the root Fiber app.
- `internal/admsvr/router/api/index.go` mounts authenticated admin modules under `/api`.
- Each feature module usually lives in its own folder and exposes `New(i do.Injector) fiber.Router`.

## Steps

1. Create or update a feature folder under `internal/admsvr/router/api/<feature>`.
2. Add an `index.go` with `func New(i do.Injector) fiber.Router`.
3. Register handlers on a local `fiber.New()` app inside that module.
4. Mount the feature module from `internal/admsvr/router/api/index.go` with `g.Use(feature.New(i))`.
5. If the route is admin-only, rely on the existing `/api` group middleware unless there is a reason not to.
6. Add RBAC middleware where the route needs resource/action control.
7. If the route returns HTML, render through `handler.RenderTempl`.
8. If the route returns data or supports both data and HTML, follow the existing `product` module pattern.

## Current Pattern

The admin group in `internal/admsvr/router/api/index.go` already applies:

- admin authentication
- user derivation middleware
- `/api` prefixing

That means a new module mounted there inherits the authenticated admin context automatically.

## When To Add Swagger

Add Swagger annotations on handler functions when the route is part of the HTTP API surface and should appear in OpenAPI.

After API annotation changes, regenerate docs:

```sh
go generate ./internal/admsvr/router
```

## HTML + HTMX Pattern

If the route serves full HTML and partial swaps:

- load data in a handler first
- store derived data in Fiber locals if needed
- return JSON or raw data when the request is not HTML
- render a partial or full layout depending on HTMX context

The `internal/admsvr/router/api/product/index.go` module is the reference pattern for this.

## Checklist

- Route lives in the correct feature folder.
- Module is mounted from the parent index file.
- RBAC is applied if the route changes protected resources.
- HTML routes use `RenderTempl` instead of manual response assembly.
- Swagger annotations are updated if this is part of the documented API.

## Avoid

- Adding routes directly to `router/main.go` unless they are truly global.
- Re-implementing auth middleware inside a feature module already mounted under `/api`.
- Mixing unrelated features into one large route module.