package product

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

	app.Get("/products", servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionRead),
		getProductTableData,
		hx_utils.IfNotHtmlSendData(keyProductTableData),
		hx_utils.IfHx(hx_utils.IsHxBoostedForm,
			handler.RenderTempl(productTable),
			handler.RenderTempl(productTable, productTableLayout),
		))
	app.Get(
		"/products/create",
		servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionRead),
		handler.RenderTempl(ProductCuForm),
	)
	app.Get("/products/:id", servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionRead),
		getProductDetailData,
		hx_utils.IfNotHtmlSendData(productDetailDataKey),
		handler.RenderTempl(ProductCuForm),
	)

	app.Put(
		"/products",
		servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionCreate, rbac.ActionUpdate),
		upsertProduct,
	)
	app.Delete(
		"/products/:id",
		servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionDelete),
		deleteProduct,
	)

	// SKUs
	app.Get("/skus", servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionRead),
		getSkuTableData,
		hx_utils.IfNotHtmlSendData(keySkuTableData),
		hx_utils.IfHx(hx_utils.IsHxBoostedForm,
			handler.RenderTempl(SkuTable),
			handler.RenderTempl(SkuTable, SkuTableLayout),
		),
	)
	app.Get(
		"/skus/create",
		servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionRead),
		handler.RenderTempl(SkuCuForm),
	)
	app.Get(
		"/skus/:id",
		servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionRead),
		getSkuDetailData,
		hx_utils.IfNotHtmlSendData(skuDetailDataKey),

		handler.RenderTempl(SkuCuForm),
	)
	app.Put(
		"/skus",
		servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionCreate, rbac.ActionUpdate),
		upsertSku,
	)
	app.Delete(
		"/skus/:id",
		servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionDelete),
		deleteSku,
	)

	// Inventory
	app.Get("/inventories", servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionRead),
		getInventoryTableData,
		hx_utils.IfNotHtmlSendData(keyInventoryTableData),
		hx_utils.IfHx(hx_utils.IsHxBoostedForm,
			handler.RenderTempl(InventoryTable),
			handler.RenderTempl(InventoryTable, InventoryTableLayout),
		),
	)
	app.Get(
		"/inventories/create",
		servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionRead),
		handler.RenderTempl(InventoryCuForm),
	)
	app.Get(
		"/inventories/:id",
		servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionRead),
		getInventoryDetailData,
		hx_utils.IfNotHtmlSendData(inventoryDetailDataKey),
		handler.RenderTempl(InventoryCuForm),
	)
	app.Put(
		"/inventories",
		servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionCreate, rbac.ActionUpdate),
		upsertInventory,
	)
	app.Delete(
		"/inventories/:id",
		servermw.RequirePermission(enforcer, rbac.ResourceProduct, rbac.ActionDelete),
		deleteInventory,
	)

	return app
}
