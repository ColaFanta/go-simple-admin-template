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
  Starter de admin y API, amigable para vibe coding, pensado para equipos que trabajan con Go puro.
</p>

<p align="center">
  Templ UI + HTMX + Fiber v3 + GORM + Goose + go-i18n + Swagger
</p>

<p align="center">
  <a href="#características">Características</a> |
  <a href="#stack">Stack</a> |
  <a href="#cómo-ejecutarlo">Cómo ejecutarlo</a> |
  <a href="#flujo-de-ai">Flujo de AI</a>
</p>

Este repositorio es un starter de admin en Go puro para equipos que quieren páginas renderizadas en servidor, APIs documentadas y una estructura clara, sin depender de un framework admin pesado.

## Características

- Frontend y backend en Go puro
- Estructura clara para rutas, páginas, modelos, migraciones y traducciones, ideal para ampliar con AI
- UI estilo ShadCN con [Templ UI](https://templui.io/)
- Flujo de componentes parecido a React en Go con [`templ`](https://templ.guide/)
- Render parcial con [HTMX](https://htmx.org/) sin React ni Vue
- API server con documentación Swagger
- Ejemplos incluidos de auth, RBAC, i18n, paginación y CRUD
- PostgreSQL + GORM + Goose + scripts de seed
- No necesita Node ni npm en runtime

## Por qué existe este repo

Este repo se sitúa entre una app web Go básica y un framework admin pesado:

- más simple que un stack Go + Javascript(React/Vue)
- menos rígido que un framework admin guiado por configuración
- suficientemente completo para entregar funciones admin comunes con rapidez
- flexible para seguir escribiendo Go normal

## Stack

- Frontend: [Templ UI](https://templui.io/) + [HTMX](https://htmx.org/)
- Web: [Fiber v3](https://docs.gofiber.io/)
- Auth: [pkgz/auth](https://github.com/go-pkgz/auth)
- RBAC: [casbin](https://casbin.apache.org/)
- DB: PostgreSQL 18 + [GORM](https://gorm.io/cli/) + [goose](https://pressly.github.io/goose/)
- i18n: [go-i18n](https://github.com/nicksnyder/go-i18n)
- OpenAPI: [swaggo](https://github.com/swaggo/swag)

## Incluye

- páginas de auth
- dashboard e inbox
- gestión de productos, SKU e inventario
- gestión de usuarios, roles y permisos
- traducciones en inglés, chino simplificado y chino tradicional
- layout admin y bloques UI reutilizables
- flujo de migración y seed
- Swagger UI

## Capturas

| | | | |
|---|---|---|---|
| [![Home Screen](./screenshots/homescreen.png)](./screenshots/homescreen.png) | [![Login](./screenshots/login.png)](./screenshots/login.png) | [![Products](./screenshots/product-list.png)](./screenshots/product-list.png) | [![Users](./screenshots/user-management.png)](./screenshots/user-management.png) |
| Home Screen | Login | Products | Users |

## Cómo ejecutarlo

La forma más rápida:

```sh
docker compose up --build
```

- app: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/openapi/swagger`
- login dev: `superadmin01` / `password01`

Docker Compose levantará Postgres, ejecutará migraciones, ejecutará seeds y arrancará la app.

Para iteración local, usa la tarea de VS Code `dev`.

Tareas útiles:

- `templ gen`
- `Goose Up`
- `Goose Down`
- `Goose Status`
- `GORM Seed`

## Flujo de AI

- Empieza por [llm.md](./llm.md)
- Usa la documentación en `skills/` para tareas comunes
- Deja que AI edite archivos fuente y luego regenere templ, GORM o Swagger cuando haga falta
- Sigue los módulos existentes en vez de inventar patrones nuevos

## API + UI

Este proyecto es ambas cosas:

- servidor de UI admin
- servidor API documentado

Las rutas viven en `internal/admsvr/router` y Swagger se sirve desde `/openapi/*`.