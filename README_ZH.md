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
  面向純 Go 團隊、適合 vibe coding 的後台與 API 啟動模板。
</p>

<p align="center">
  Templ UI + HTMX + Fiber v3 + GORM + Goose + go-i18n + Swagger
</p>

<p align="center">
  <a href="#功能">功能</a> |
  <a href="#技術棧">技術棧</a> |
  <a href="#如何執行">如何執行</a> |
  <a href="#ai-工作流程">AI 工作流程</a>
</p>

這是一個純 Go 後台啟動模板，適合想要伺服器渲染頁面、文件化 API，以及清楚專案結構，但不想引入厚重 admin 框架的團隊。

## 功能

- 前後端都使用純 Go
- 路由、頁面、模型、遷移、翻譯結構清楚，適合 AI 擴充
- 基於 [Templ UI](https://templui.io/) 的類 ShadCN 設計系統
- 使用 [`templ`](https://templ.guide/) 以接近 React 元件的方式寫 Go 頁面
- 用 [HTMX](https://htmx.org/) 做局部更新，無需 React 或 Vue
- 同時支援後台 UI 與 Swagger 文件 API
- 內建 auth、RBAC、i18n、分頁與 CRUD 範例
- PostgreSQL + GORM + Goose + seed 腳本
- 執行時不依賴 Node 或 npm

## 為什麼做這個倉庫

它位於原始 Go Web 專案與重型 admin 框架之間：

- 比 Go + Javascript(React/Vue) 堆疊更簡單
- 比設定驅動的 admin 框架更不綁定
- 足夠完整，能快速交付常見後台功能
- 仍然保持正常 Go 專案的寫法

## 技術棧

- 前端: [Templ UI](https://templui.io/) + [HTMX](https://htmx.org/)
- Web: [Fiber v3](https://docs.gofiber.io/)
- Auth: [pkgz/auth](https://github.com/go-pkgz/auth)
- RBAC: [casbin](https://casbin.apache.org/)
- 資料庫: PostgreSQL 18 + [GORM](https://gorm.io/cli/) + [goose](https://pressly.github.io/goose/)
- i18n: [go-i18n](https://github.com/nicksnyder/go-i18n)
- OpenAPI: [swaggo](https://github.com/swaggo/swag)

## 已包含內容

- 登入與註冊頁面
- dashboard 與 inbox
- 商品、SKU、庫存管理
- 使用者、角色、權限管理
- 英文、簡體中文、繁體中文翻譯
- admin 版型與可重用 UI 元件
- migration 與 seed 流程
- Swagger UI

## 截圖

| | | | |
|---|---|---|---|
| [![Home Screen](./screenshots/homescreen.png)](./screenshots/homescreen.png) | [![Login](./screenshots/login.png)](./screenshots/login.png) | [![Products](./screenshots/product-list.png)](./screenshots/product-list.png) | [![Users](./screenshots/user-management.png)](./screenshots/user-management.png) |
| Home Screen | Login | Products | Users |

## 如何執行

最快方式：

```sh
docker compose up --build
```

- 應用程式: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/openapi/swagger`
- 開發帳號: `superadmin01` / `password01`

Docker Compose 會啟動 Postgres、執行 migration、執行 seed，然後啟動應用。

本機開發可直接使用 VS Code 任務 `dev`。

常用任務：

- `templ gen`
- `Goose Up`
- `Goose Down`
- `Goose Status`
- `GORM Seed`

## AI 工作流程

- 先看 [llm.md](./llm.md)
- 常見任務參考 `skills/` 中的文件
- 讓 AI 修改原始檔，再按需重新產生 templ、GORM 或 Swagger 輸出
- 盡量沿用現有 feature module，而不是發明新模式

## API + UI

這個專案同時是：

- 後台 UI 服務
- 具文件的 API 服務

路由位於 `internal/admsvr/router`，Swagger 位於 `/openapi/*`。