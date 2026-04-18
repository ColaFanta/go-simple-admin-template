# Go Simple Admin Template

<p align="center">
	<a href="./README.md">English</a> |
	<a href="./README_CN.md">简体中文</a> |
	<a href="./README_ZH.md">繁體中文</a> |
	<a href="./README_KR.md">한국어</a> |
	<a href="./README_JP.md">日本語</a> |
	<a href="./README_VN.md">Tiếng Việt</a> |
	<a href="./README_SP.md">Español</a> |
	<a href="./README_AR.md">العربية</a>
</p>

<p align="center">
	Simple, vibe-coding-friendly admin and API starter for pure Go teams.
</p>

<p align="center">
	Templ UI + HTMX + Fiber v3 + GORM + Goose + go-i18n + Swagger
</p>

<p align="center">
	<a href="#features">Features</a> |
	<a href="#stack">Stack</a> |
	<a href="#how-to-run">How to Run</a> |
	<a href="#ai-workflow">AI Workflow</a>
</p>

Pure Go admin starter for teams that want server-rendered pages, documented APIs, and a clean project structure without a heavy admin framework.

## Features

- Frontend and backend in Pure Go flow
- Vibe-coding-friendly structure for routes, pages, models, migrations, and translations
- ShadCN-like UI with [Templ UI](https://templui.io/)
- React-like component workflow in Go with [`templ`](https://templ.guide/)
- HTMX-powered partial rendering without React or Vue
- Plain API server with Swagger docs at `/openapi/swagger`
- Built-in auth, RBAC, i18n, pagination, and CRUD examples
- PostgreSQL + GORM + Goose + seed scripts
- No Node or npm required for runtime

## Why this repo

This repo sits between raw Go web apps and heavy admin frameworks:

- simpler than Go + Javascript(React/Vue) stacks
- less opinionated than config-driven admin frameworks
- complete enough to ship common admin features fast
- flexible enough to keep writing normal Go

## Stack

- Frontend: [Templ UI](https://templui.io/) + [HTMX](https://htmx.org/)
- Web: [Fiber v3](https://docs.gofiber.io/)
- Auth: [pkgz/auth](https://github.com/go-pkgz/auth)
- RBAC: [casbin](https://casbin.apache.org/)
- DB: PostgreSQL 18 + [GORM](https://gorm.io/cli/) + [goose](https://pressly.github.io/goose/)
- i18n: [go-i18n](https://github.com/nicksnyder/go-i18n)
- OpenAPI: [swaggo](https://github.com/swaggo/swag)

## What Is Included

- auth pages
- dashboard and inbox
- product, SKU, and inventory management
- user, role, and permission management
- English, Simplified Chinese, and Traditional Chinese translations
- admin layout and reusable UI blocks
- migration and seed workflow
- Swagger UI

## ScreenShots

| | | | |
|---|---|---|---|
| [![Home Screen](./screenshots/homescreen.png)](./screenshots/homescreen.png) | [![Login](./screenshots/login.png)](./screenshots/login.png) | [![Products](./screenshots/product-list.png)](./screenshots/product-list.png) | [![Users](./screenshots/user-management.png)](./screenshots/user-management.png) |
| Home Screen | Login | Products | Users |

## How to Run

Fastest path:

```sh
docker compose up --build
```

- app: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/openapi/swagger`
- dev login: `superadmin01` / `password01`

Docker Compose will start Postgres, run migrations, run seeds, and boot the app.

For local iteration, use the VS Code task `dev`.

Useful tasks:

- `templ gen`
- `Goose Up`
- `Goose Down`
- `Goose Status`
- `GORM Seed`

## AI Workflow

- Start with [llm.md](./llm.md)
- Use the docs in `skills/` for common tasks
- Let AI edit source files, then regenerate `templ`, GORM, or Swagger output when needed
- Follow existing feature modules instead of inventing new patterns

## API + UI

This is both:

- an admin UI server
- a documented API server

Routes live under `internal/admsvr/router`, and Swagger is served from `/openapi/*`.
