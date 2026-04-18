package rbac

import (
	"fantacode/ecomm/internal/biz/rbac"
	"fantacode/ecomm/internal/fiber/handler"
	"fantacode/ecomm/internal/fiber/hx/hx_utils"

	"github.com/gofiber/fiber/v3"
	"github.com/samber/do/v2"
)

func New(i do.Injector) fiber.Router {
	app := fiber.New()

	app.Get(
		"/roles",
		rbac.RequirePermission(rbac.ResourceSystem, rbac.ActionRead),
		getRoleTableData,
		hx_utils.IfNotHtmlSendData(roleTableDataKey),
		hx_utils.IfHx(hx_utils.IsHxBoostedForm,
			handler.RenderTempl(RoleTable),
			handler.RenderTempl(RoleTable, RoleTableLayout),
		),
	)
	app.Put("/roles",
		rbac.RequirePermission(rbac.ResourceSystem, rbac.ActionCreate, rbac.ActionUpdate),
		upsertRole)

	app.Get(
		"/roles/create",
		rbac.RequirePermission(rbac.ResourceSystem, rbac.ActionRead),
		handler.RenderTempl(RoleCuForm),
	)
	app.Get(
		"/roles/:name",
		rbac.RequirePermission(rbac.ResourceSystem, rbac.ActionRead),
		getRoleDetailData,
		hx_utils.IfNotHtmlSendData(roleDetailDataKey),
		handler.RenderTempl(RoleCuForm),
	)
	app.Delete("/roles/:name",
		rbac.RequirePermission(rbac.ResourceSystem, rbac.ActionDelete),
		deleteRole)

	app.Get(
		"/permissions",
		rbac.RequirePermission(rbac.ResourceSystem, rbac.ActionRead),
		getPermissions,
		hx_utils.IfNotHtmlSendData(keyPermissionsData),
		handler.RenderTempl(PermissionsPage),
	)

	return app
}
