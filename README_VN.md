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
  Bộ khởi động admin và API thân thiện với vibe coding dành cho đội ngũ thuần Go.
</p>

<p align="center">
  Templ UI + HTMX + Fiber v3 + GORM + Goose + go-i18n + Swagger
</p>

<p align="center">
  <a href="#tính-năng">Tính năng</a> |
  <a href="#ngăn-xếp-công-nghệ">Ngăn xếp công nghệ</a> |
  <a href="#cách-chạy">Cách chạy</a> |
  <a href="#quy-trình-ai">Quy trình AI</a>
</p>

Đây là bộ khởi động admin thuần Go cho các đội muốn có trang render phía server, API có tài liệu, và cấu trúc dự án rõ ràng mà không cần framework admin nặng nề.

## Tính năng

- Frontend và backend đều viết bằng Go
- Cấu trúc route, page, model, migration và translation rõ ràng, dễ mở rộng bằng AI
- UI kiểu ShadCN với [Templ UI](https://templui.io/)
- Viết component Go theo phong cách gần giống React với [`templ`](https://templ.guide/)
- Render từng phần bằng [HTMX](https://htmx.org/) mà không cần React hoặc Vue
- API server có Swagger docs
- Có sẵn auth, RBAC, i18n, phân trang và ví dụ CRUD
- PostgreSQL + GORM + Goose + script seed
- Runtime không cần Node hay npm

## Vì sao có repo này

Repo này nằm giữa ứng dụng Go web thuần và framework admin nặng:

- đơn giản hơn stack Go + Javascript(React/Vue)
- ít áp đặt hơn framework admin dựa trên cấu hình
- đủ đầy để triển khai nhanh các tính năng admin phổ biến
- vẫn giữ cách viết Go bình thường

## Ngăn xếp công nghệ

- Frontend: [Templ UI](https://templui.io/) + [HTMX](https://htmx.org/)
- Web: [Fiber v3](https://docs.gofiber.io/)
- Auth: [pkgz/auth](https://github.com/go-pkgz/auth)
- RBAC: [casbin](https://casbin.apache.org/)
- DB: PostgreSQL 18 + [GORM](https://gorm.io/cli/) + [goose](https://pressly.github.io/goose/)
- i18n: [go-i18n](https://github.com/nicksnyder/go-i18n)
- OpenAPI: [swaggo](https://github.com/swaggo/swag)

## Những gì đã có sẵn

- trang auth
- dashboard và inbox
- quản lý sản phẩm, SKU và tồn kho
- quản lý người dùng, vai trò và quyền
- bản dịch tiếng Anh, Trung giản thể và Trung phồn thể
- layout admin và các khối UI tái sử dụng
- luồng migration và seed
- Swagger UI

## Ảnh chụp màn hình

| | | | |
|---|---|---|---|
| [![Home Screen](./screenshots/homescreen.png)](./screenshots/homescreen.png) | [![Login](./screenshots/login.png)](./screenshots/login.png) | [![Products](./screenshots/product-list.png)](./screenshots/product-list.png) | [![Users](./screenshots/user-management.png)](./screenshots/user-management.png) |
| Home Screen | Login | Products | Users |

## Cách chạy

Cách nhanh nhất:

```sh
docker compose up --build
```

- ứng dụng: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/openapi/swagger`
- tài khoản dev: `superadmin01` / `password01`

Docker Compose sẽ khởi động Postgres, chạy migration, chạy seed và boot ứng dụng.

Để phát triển cục bộ, dùng task VS Code `dev`.

Các task hữu ích:

- `templ gen`
- `Goose Up`
- `Goose Down`
- `Goose Status`
- `GORM Seed`

## Quy trình AI

- Bắt đầu từ [llm.md](./llm.md)
- Dùng tài liệu trong `skills/` cho các tác vụ phổ biến
- Để AI sửa file nguồn, rồi sinh lại output của templ, GORM hoặc Swagger khi cần
- Làm theo module có sẵn thay vì tạo pattern mới

## API + UI

Đây đồng thời là:

- server UI quản trị
- server API có tài liệu

Route nằm trong `internal/app/server/router`, và Swagger được phục vụ tại `/openapi/*`.