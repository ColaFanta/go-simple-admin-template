# shadcn-templ

shadcn-templ v2 is configured by the root `components.json` and pinned as a project-local Go tool in `go.mod`. Shared UI components, layouts, assets, and scripts live under `internal/app/ui`.

## Component Workflow

1. Confirm the shadcn-templ version in `go.mod` and use `go tool shadcn-templ`.
2. Run `go tool shadcn-templ add <component>` from the repository root.
3. Run `go tool shadcn-templ bundle` after component script changes.
4. Run `go tool templ generate` from the repository root.
5. Compile and test the project.

## Asset Rules

- Component JavaScript source lives under `internal/app/ui/components`; the generated bundle is written to `internal/app/ui/assets/js` and embedded by `internal/app/ui/assets/assets.go`.
- The generated bundle URL is recorded in `internal/app/ui/components/scripts_bundle.go`.
- Do not hand-edit generated shadcn-templ or templ files. Regenerate them from the project-local tools.