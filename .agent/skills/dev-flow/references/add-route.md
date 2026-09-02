# Add A Route

Read `internal/app/server/router/main.go`, `internal/app/server/router/api/index.go`, and the closest feature module first.

1. Create or update `internal/app/server/router/api/<feature>`.
2. Expose `New(i do.Injector) fiber.Router` and register routes on a local Fiber app.
3. Mount the module from `internal/app/server/router/api/index.go`.
4. Reuse inherited authentication and add RBAC permissions for protected actions.
5. Render HTML through `handler.RenderTempl` and use the feature's partial/full-page pattern for HTMX.
6. Keep the dependency direction singular: route code may depend on modules and platform helpers, but modules and platform packages must not import route code or server service registries. Pass module dependencies explicitly into server middleware.
7. Run `go generate ./internal/app/server/router` when Swagger annotations change.