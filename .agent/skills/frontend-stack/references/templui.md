# Templui

Templui is configured under `internal/app/server/ui` and currently tracks `v1.13.2` in both the Go module and the CLI.

## Upgrade Checklist

1. Confirm `go.mod` and the templui CLI use the same version.
2. Run `go tool templui --force --installed add` from `internal/app/server/ui`.
3. Review missing or local-only components. The local `components/error` component is not present in the v1.13.2 upstream registry and must be treated as a project component.
4. Run `go tool templ generate` from the repository root.
5. Check generated component metadata and compile the project.

## Asset Rules

- Component JavaScript lives under `internal/app/server/ui/assets/js` and is embedded by `assets/assets.go`.
- `utils.ComponentScript` serves versioned local assets from `/assets/js` and appends a cache-busting query parameter.
- Do not hand-edit generated templui files. Regenerate them from the CLI.