package rbac

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

	app.Get(
		"/roles",
		servermw.RequirePermission(enforcer, rbac.ResourceSystem, rbac.ActionRead),
		getRoleTableData,
		hx_utils.IfNotHtmlSendData(roleTableDataKey),
		hx_utils.IfHx(hx_utils.IsHxBoostedForm,
			handler.RenderTempl(RoleTable),
			handler.RenderTempl(RoleTable, RoleTableLayout),
		),
	)
	app.Put("/roles",
		servermw.RequirePermission(enforcer, rbac.ResourceSystem, rbac.ActionCreate, rbac.ActionUpdate),
		upsertRole)

	app.Get(
		"/roles/create",
		servermw.RequirePermission(enforcer, rbac.ResourceSystem, rbac.ActionRead),
		handler.RenderTempl(RoleCuForm),
	)
	app.Get(
		"/roles/:name",
		servermw.RequirePermission(enforcer, rbac.ResourceSystem, rbac.ActionRead),
		getRoleDetailData,
		hx_utils.IfNotHtmlSendData(roleDetailDataKey),
		handler.RenderTempl(RoleCuForm),
	)
	app.Delete("/roles/:name",
		servermw.RequirePermission(enforcer, rbac.ResourceSystem, rbac.ActionDelete),
		deleteRole)

	app.Get(
		"/permissions",
		servermw.RequirePermission(enforcer, rbac.ResourceSystem, rbac.ActionRead),
		getPermissions,
		hx_utils.IfNotHtmlSendData(keyPermissionsData),
		handler.RenderTempl(PermissionsPage),
	)

	return app
}
