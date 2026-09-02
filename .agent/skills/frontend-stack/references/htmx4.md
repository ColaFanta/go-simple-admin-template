# HTMX 4

The shared script is loaded in `internal/app/server/ui/layout/base.templ` from the HTMX 4 CDN URL.

## Migration Rules

- Lifecycle events use `htmx:phase:action`, for example `htmx:after:request`, `htmx:config:request`, and `htmx:response:error`.
- Request and response data is under `event.detail.ctx`; use `ctx.request.method`, `ctx.request.headers`, `ctx.response.status`, and `ctx.text`.
- HTMX 4 uses `fetch`, so do not use `event.detail.xhr`.
- Attribute inheritance is explicit by default. This app currently sets `htmx.config.implicitInheritance = true` to preserve existing nested markup while it is migrated incrementally.
- HTTP error responses are swapped by default. This app sets `htmx.config.noSwap = [204, 304, "4xx", "5xx"]` to preserve the existing error-handling behavior.
- `hx-delete` no longer includes enclosing form inputs automatically; add `hx-include="closest form"` when a delete action needs those values.
- `hx-disable` and `hx-ignore` have different meanings in HTMX 4. Check the migration table before changing either.

## Validation

Search source templates for old event names and `event.detail.xhr`, then regenerate templ output:

```sh
go tool templ generate
```

Use the HTMX 4 upgrade checker for larger changes:

```sh
npx htmx.org@4.0.0 upgrade-check -- --ext .templ .
```