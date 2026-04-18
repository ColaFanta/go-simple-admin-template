package user

import (
	"fantacode/ecomm/internal/biz/rbac"
	"fantacode/ecomm/internal/fiber/handler"
	"fantacode/ecomm/internal/fiber/hx/hx_utils"

	"github.com/gofiber/fiber/v3"
	"github.com/samber/do/v2"
)

func New(i do.Injector) fiber.Router {
	app := fiber.New()

	app.Get("/users", rbac.RequirePermission(rbac.ResourceSystem, rbac.ActionRead),
		getUserTableData,
		hx_utils.IfNotHtmlSendData(keyUserTableData),
		hx_utils.IfHx(hx_utils.IsHxBoostedForm,
			handler.RenderTempl(userTable),
			handler.RenderTempl(userTable, UserTableLayout),
		))
	app.Get(
		"/users/create",
		rbac.RequirePermission(rbac.ResourceSystem, rbac.ActionRead),
		handler.RenderTempl(UserCuForm),
	)
	app.Get(
		"/users/:id",
		rbac.RequirePermission(rbac.ResourceSystem, rbac.ActionRead),
		getUserDetailData,
		hx_utils.IfNotHtmlSendData(userDetailDataKey),
		handler.RenderTempl(UserCuForm),
	)
	app.Put("/users",
		rbac.RequirePermission(rbac.ResourceSystem, rbac.ActionCreate, rbac.ActionUpdate),
		upsertUser)
	app.Delete("/users/:id",
		rbac.RequirePermission(rbac.ResourceSystem, rbac.ActionDelete),
		deleteUser)

	return app
}
