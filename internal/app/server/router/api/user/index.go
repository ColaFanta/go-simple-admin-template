package user

import (
	"fantacode/ecomm/internal/app/module/rbac"
	servermw "fantacode/ecomm/internal/app/server/middleware"
	"fantacode/ecomm/internal/platform/http/fiber/handler"
	"fantacode/ecomm/internal/platform/http/fiber/hx/hx_utils"

	"github.com/casbin/casbin/v3"
	"github.com/gofiber/fiber/v3"
	"github.com/samber/do/v2"
)

func New(i do.Injector) fiber.Router {
	app := fiber.New()
	enforcer := do.MustInvoke[*casbin.Enforcer](i)

	app.Get("/users", servermw.RequirePermission(enforcer, rbac.ResourceSystem, rbac.ActionRead),
		getUserTableData,
		hx_utils.IfNotHtmlSendData(keyUserTableData),
		hx_utils.IfHx(hx_utils.IsHxBoostedForm,
			handler.RenderTempl(userTable),
			handler.RenderTempl(userTable, UserTableLayout),
		))
	app.Get(
		"/users/create",
		servermw.RequirePermission(enforcer, rbac.ResourceSystem, rbac.ActionRead),
		handler.RenderTempl(UserCuForm),
	)
	app.Get(
		"/users/:id",
		servermw.RequirePermission(enforcer, rbac.ResourceSystem, rbac.ActionRead),
		getUserDetailData,
		hx_utils.IfNotHtmlSendData(userDetailDataKey),
		handler.RenderTempl(UserCuForm),
	)
	app.Put("/users",
		servermw.RequirePermission(enforcer, rbac.ResourceSystem, rbac.ActionCreate, rbac.ActionUpdate),
		upsertUser)
	app.Delete("/users/:id",
		servermw.RequirePermission(enforcer, rbac.ResourceSystem, rbac.ActionDelete),
		deleteUser)

	return app
}
