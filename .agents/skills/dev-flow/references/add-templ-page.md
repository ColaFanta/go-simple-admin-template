# Add A Templ Page

Read `internal/platform/http/fiber/handler/templ.go`, the closest feature `.templ` file, and the admin layout first.

1. Add the page and partial components in a `.templ` source file.
2. Use existing UI components and request-scoped localization.
3. Render through `handler.RenderTempl` from the route handler.
4. Split full-page and HTMX partial components when both responses are needed.
5. Run `go tool templ generate`.

Never hand-edit generated `*_templ.go` files.