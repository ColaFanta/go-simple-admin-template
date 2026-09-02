# Code Generation

Run commands from the repository root unless a tool requires its configured directory.

## Templ

After editing `.templ` files:

```sh
go tool templ generate
```

The checked-in `*_templ.go` files are generated output. The VS Code `templ gen` task runs the same generator.

## Templui

The configuration is [`.templui.json`](../../../../internal/app/server/ui/.templui.json), so run the CLI from `internal/app/server/ui`:

```sh
go tool templui --force --installed add
go tool templ generate
```

The installed CLI and Go module must refer to the same templui version. Review the diff because local components may not exist in the upstream registry.

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