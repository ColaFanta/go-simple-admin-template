# Code Generation

Run commands from the repository root unless a tool requires its configured directory.

## Templ

After editing `.templ` files:

```sh
go tool templ generate
```

The checked-in `*_templ.go` files are generated output. The VS Code `templ gen` task runs the same generator.

## shadcn-templ

The configuration is [`components.json`](../../../../components.json) at the repository root. The CLI is pinned as a project-local Go tool in `go.mod`:

```sh
go tool shadcn-templ add <component>
go tool shadcn-templ bundle
go tool templ generate
```

Use `go tool shadcn-templ` rather than a globally installed binary. Review generated changes because local component modifications may be overwritten by `--overwrite`.

## GORM DAO

After changing models, run:

```sh
go generate ./internal/app/module/dao/model
```

Do not edit files under `internal/app/module/dao/gen` manually.

## Swagger

After route annotations change, run:

```sh
go generate ./internal/app/server/router
```