# Application Layers

## Request Flow

1. `cmd/admin/main.go` builds the dependency injector and starts the Fiber app.
2. `internal/app/server/router/main.go` creates the app, serves embedded assets, installs localization, and mounts global, auth, and admin routes.
3. `internal/app/server/router/api/index.go` creates the authenticated `/api` group and mounts feature modules.
4. Feature modules such as `api/product` own route handlers, source templ components, and feature-specific data loading.
5. `internal/platform/http/fiber/handler.RenderTempl` composes templ pages with layouts.
6. HTMX requests may receive a partial component; normal browser requests receive a full layout.

## Placement Rules

- Put a new admin feature under `internal/app/server/router/api/<feature>` and expose `New(i do.Injector) fiber.Router`.
- Put reusable UI in `internal/app/server/ui`, not in a feature handler.
- Put persistent entities in `internal/app/module/dao/model`; generated query helpers belong under `internal/app/module/dao/gen`.
- Put cross-request business behavior in `internal/app/module` services or the nearest existing domain package.
- Put application-specific Fiber middleware and lifecycle services in `internal/app/server/middleware` and `internal/app/server/service`.
- Put neutral Fiber helpers and HTMX request utilities in `internal/platform/http/fiber`.
- Put neutral infrastructure setup in `internal/platform`, such as configuration, GORM database setup, and Redis client setup.

## Dependency Direction

Use a singular dependency direction:

```text
cmd/admin -> app/server -> app/module
cmd/admin -> platform
app/server -> platform
app/module -> domain contracts
platform -> external systems
```

The reverse edges are prohibited. `app/module` must not import `app/server` or Fiber service adapters. `platform` must not import `app/server` or `app/module`. When a server adapter needs a module object such as an i18n bundle or Casbin enforcer, pass it through a constructor or function argument.

## Dependency Wiring

The application registers database, dependency, RBAC, and localization services through Fiber configuration. Feature route modules receive the injector and resolve their required services through do v2 at the server boundary. Pass explicit values into middleware, handlers, and components; business modules must not resolve values from Fiber state.