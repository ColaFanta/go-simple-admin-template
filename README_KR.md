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
  순수 Go 팀을 위한, vibe coding 친화적인 관리자 및 API 스타터입니다.
</p>

<p align="center">
  Templ UI + HTMX + Fiber v3 + GORM + Goose + go-i18n + Swagger
</p>

<p align="center">
  <a href="#기능">기능</a> |
  <a href="#스택">스택</a> |
  <a href="#실행-방법">실행 방법</a> |
  <a href="#ai-워크플로우">AI 워크플로우</a>
</p>

이 저장소는 무거운 관리자 프레임워크 없이 서버 렌더링 페이지, 문서화된 API, 명확한 프로젝트 구조를 원하는 팀을 위한 순수 Go 관리자 스타터입니다.

## 기능

- 프론트엔드와 백엔드를 모두 Go로 구성
- 라우트, 페이지, 모델, 마이그레이션, 번역 구조가 명확해서 AI 확장에 적합
- [Templ UI](https://templui.io/) 기반의 ShadCN 스타일 UI
- [`templ`](https://templ.guide/)로 React와 비슷한 방식의 Go 컴포넌트 작성
- React나 Vue 없이 [HTMX](https://htmx.org/)로 부분 렌더링 처리
- Swagger 문서가 포함된 API 서버 제공
- auth, RBAC, i18n, 페이지네이션, CRUD 예제 포함
- PostgreSQL + GORM + Goose + 시드 스크립트
- 런타임에 Node나 npm 불필요

## 왜 이 저장소인가

이 프로젝트는 원시 Go 웹앱과 무거운 admin 프레임워크의 중간에 있습니다.

- Go + Javascript(React/Vue) 스택보다 단순함
- 설정 중심 admin 프레임워크보다 덜 강제적임
- 일반적인 관리자 기능을 빠르게 만들 만큼 충분히 완성됨
- 여전히 일반적인 Go 코드 스타일을 유지함

## 스택

- Frontend: [Templ UI](https://templui.io/) + [HTMX](https://htmx.org/)
- Web: [Fiber v3](https://docs.gofiber.io/)
- Auth: [pkgz/auth](https://github.com/go-pkgz/auth)
- RBAC: [casbin](https://casbin.apache.org/)
- DB: PostgreSQL 18 + [GORM](https://gorm.io/cli/) + [goose](https://pressly.github.io/goose/)
- i18n: [go-i18n](https://github.com/nicksnyder/go-i18n)
- OpenAPI: [swaggo](https://github.com/swaggo/swag)

## 포함된 내용

- 인증 페이지
- dashboard 와 inbox
- 상품, SKU, 재고 관리
- 사용자, 역할, 권한 관리
- 영어, 중국어 간체, 중국어 번체 번역
- 관리자 레이아웃과 재사용 가능한 UI 블록
- 마이그레이션 및 시드 흐름
- Swagger UI

## 스크린샷

| | | | |
|---|---|---|---|
| [![Home Screen](./screenshots/homescreen.png)](./screenshots/homescreen.png) | [![Login](./screenshots/login.png)](./screenshots/login.png) | [![Products](./screenshots/product-list.png)](./screenshots/product-list.png) | [![Users](./screenshots/user-management.png)](./screenshots/user-management.png) |
| Home Screen | Login | Products | Users |

## 실행 방법

가장 빠른 방법:

```sh
docker compose up --build
```

- 앱: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/openapi/swagger`
- 개발 로그인: `superadmin01` / `password01`

Docker Compose가 Postgres를 시작하고, 마이그레이션과 시드를 실행한 뒤 앱을 부팅합니다.

로컬 반복 개발은 VS Code 작업 `dev`를 사용하면 됩니다.

유용한 작업:

- `templ gen`
- `Goose Up`
- `Goose Down`
- `Goose Status`
- `GORM Seed`

## AI 워크플로우

- 먼저 [llm.md](./llm.md)를 확인
- 일반 작업은 `skills/` 문서를 참고
- AI가 소스 파일을 수정하고, 필요하면 templ, GORM, Swagger 출력을 다시 생성
- 새로운 패턴을 만들기보다 기존 feature module을 따름

## API + UI

이 프로젝트는 다음 두 가지를 모두 제공합니다.

- 관리자 UI 서버
- 문서화된 API 서버

라우트는 `internal/app/server/router` 아래에 있고 Swagger는 `/openapi/*`에서 제공됩니다.