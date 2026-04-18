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
  純粋な Go チーム向けの、vibe coding に向いた管理画面兼 API スターターです。
</p>

<p align="center">
  Templ UI + HTMX + Fiber v3 + GORM + Goose + go-i18n + Swagger
</p>

<p align="center">
  <a href="#機能">機能</a> |
  <a href="#技術スタック">技術スタック</a> |
  <a href="#実行方法">実行方法</a> |
  <a href="#ai-ワークフロー">AI ワークフロー</a>
</p>

このリポジトリは、重い admin フレームワークを入れずに、サーバーサイド描画ページ、ドキュメント化された API、わかりやすいプロジェクト構成を欲しいチーム向けの純 Go 管理画面スターターです。

## 機能

- フロントエンドとバックエンドをどちらも Go で統一
- ルート、ページ、モデル、マイグレーション、翻訳の構成が明確で AI 拡張に向く
- [Templ UI](https://templui.io/) による ShadCN 風 UI
- [`templ`](https://templ.guide/) による React に近い感覚の Go コンポーネント開発
- React や Vue なしで [HTMX](https://htmx.org/) による部分更新
- Swagger 付きの API サーバーを提供
- auth、RBAC、i18n、ページネーション、CRUD の例を内蔵
- PostgreSQL + GORM + Goose + seed スクリプト
- 実行時に Node や npm は不要

## このリポジトリの狙い

このプロジェクトは、生の Go Web アプリと重い admin フレームワークの中間を狙っています。

- Go + Javascript(React/Vue) 構成よりシンプル
- 設定駆動の admin フレームワークより非強制的
- 一般的な管理画面機能を素早く作れるだけの完成度
- それでも普通の Go コードを書き続けられる

## 技術スタック

- Frontend: [Templ UI](https://templui.io/) + [HTMX](https://htmx.org/)
- Web: [Fiber v3](https://docs.gofiber.io/)
- Auth: [pkgz/auth](https://github.com/go-pkgz/auth)
- RBAC: [casbin](https://casbin.apache.org/)
- DB: PostgreSQL 18 + [GORM](https://gorm.io/cli/) + [goose](https://pressly.github.io/goose/)
- i18n: [go-i18n](https://github.com/nicksnyder/go-i18n)
- OpenAPI: [swaggo](https://github.com/swaggo/swag)

## 含まれるもの

- 認証ページ
- dashboard と inbox
- 商品、SKU、在庫管理
- ユーザー、ロール、権限管理
- 英語、簡体字中国語、繁体字中国語の翻訳
- 管理画面レイアウトと再利用可能な UI ブロック
- migration と seed の流れ
- Swagger UI

## スクリーンショット

| | | | |
|---|---|---|---|
| [![Home Screen](./screenshots/homescreen.png)](./screenshots/homescreen.png) | [![Login](./screenshots/login.png)](./screenshots/login.png) | [![Products](./screenshots/product-list.png)](./screenshots/product-list.png) | [![Users](./screenshots/user-management.png)](./screenshots/user-management.png) |
| Home Screen | Login | Products | Users |

## 実行方法

最短手順:

```sh
docker compose up --build
```

- アプリ: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/openapi/swagger`
- 開発用ログイン: `superadmin01` / `password01`

Docker Compose は Postgres を起動し、migration と seed を実行してからアプリを起動します。

ローカルでの反復開発は VS Code タスク `dev` を使います。

便利なタスク:

- `templ gen`
- `Goose Up`
- `Goose Down`
- `Goose Status`
- `GORM Seed`

## AI ワークフロー

- まず [llm.md](./llm.md) を確認
- よくある作業は `skills/` のドキュメントを参照
- AI がソースを変更し、必要なら templ、GORM、Swagger 出力を再生成
- 新しい流儀を作るより既存の feature module を踏襲する

## API + UI

このプロジェクトは次の両方です。

- 管理 UI サーバー
- ドキュメント化された API サーバー

ルートは `internal/admsvr/router` 配下にあり、Swagger は `/openapi/*` で提供されます。