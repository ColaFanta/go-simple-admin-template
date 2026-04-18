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
  面向纯 Go 团队、适合 vibe coding 的后台与 API 启动模板。
</p>

<p align="center">
  Templ UI + HTMX + Fiber v3 + GORM + Goose + go-i18n + Swagger
</p>

<p align="center">
  <a href="#功能">功能</a> |
  <a href="#技术栈">技术栈</a> |
  <a href="#如何运行">如何运行</a> |
  <a href="#ai-工作流">AI 工作流</a>
</p>

这是一个纯 Go 后台启动模板，适合想要服务端页面、文档化 API，以及清晰项目结构，但又不想引入沉重 admin 框架的团队。

## 功能

- 前后端都使用纯 Go
- 路由、页面、模型、迁移、翻译结构清晰，适合 AI 扩展
- 基于 [Templ UI](https://templui.io/) 的类 ShadCN 设计系统
- 使用 [`templ`](https://templ.guide/) 以接近 React 组件的方式写 Go 页面
- 用 [HTMX](https://htmx.org/) 做局部更新，无需 React 或 Vue
- 同时支持后台 UI 与 Swagger 文档 API
- 内置 auth、RBAC、i18n、分页与 CRUD 示例
- PostgreSQL + GORM + Goose + seed 脚本
- 运行时不依赖 Node 或 npm

## 为什么做这个仓库

它位于原始 Go Web 项目与重型 admin 框架之间：

- 比 Go + Javascript(React/Vue) 栈更简单
- 比配置驱动的 admin 框架更不强绑定
- 足够完整，能快速交付常见后台功能
- 仍然保持正常 Go 项目的写法

## 技术栈

- 前端: [Templ UI](https://templui.io/) + [HTMX](https://htmx.org/)
- Web: [Fiber v3](https://docs.gofiber.io/)
- Auth: [pkgz/auth](https://github.com/go-pkgz/auth)
- RBAC: [casbin](https://casbin.apache.org/)
- 数据库: PostgreSQL 18 + [GORM](https://gorm.io/cli/) + [goose](https://pressly.github.io/goose/)
- i18n: [go-i18n](https://github.com/nicksnyder/go-i18n)
- OpenAPI: [swaggo](https://github.com/swaggo/swag)

## 已包含内容

- 登录与注册页面
- dashboard 与 inbox
- 商品、SKU、库存管理
- 用户、角色、权限管理
- 英文、简体中文、繁体中文翻译
- admin 布局与可复用 UI 组件
- migration 与 seed 流程
- Swagger UI

## 截图

| | | | |
|---|---|---|---|
| [![Home Screen](./screenshots/homescreen.png)](./screenshots/homescreen.png) | [![Login](./screenshots/login.png)](./screenshots/login.png) | [![Products](./screenshots/product-list.png)](./screenshots/product-list.png) | [![Users](./screenshots/user-management.png)](./screenshots/user-management.png) |
| Home Screen | Login | Products | Users |

## 如何运行

最快方式：

```sh
docker compose up --build
```

- 应用: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/openapi/swagger`
- 开发账号: `superadmin01` / `password01`

Docker Compose 会启动 Postgres、执行 migration、执行 seed，然后启动应用。

本地开发可直接使用 VS Code 任务 `dev`。

常用任务：

- `templ gen`
- `Goose Up`
- `Goose Down`
- `Goose Status`
- `GORM Seed`

## AI 工作流

- 先看 [llm.md](./llm.md)
- 常见任务参考 `skills/` 中的文档
- 让 AI 修改源文件，再按需重新生成 templ、GORM 或 Swagger 输出
- 尽量沿用现有 feature module，而不是发明新模式

## API + UI

这个项目同时是：

- 后台 UI 服务
- 带文档的 API 服务

路由位于 `internal/admsvr/router`，Swagger 位于 `/openapi/*`。