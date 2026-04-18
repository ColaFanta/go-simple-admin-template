package product

import (
	"fantacode/ecomm/internal/biz/rbac"
	"fantacode/ecomm/internal/fiber/handler"
	"fantacode/ecomm/internal/fiber/hx/hx_utils"

	"github.com/gofiber/fiber/v3"
	"github.com/samber/do/v2"
)

func New(i do.Injector) fiber.Router {
	app := fiber.New()

	app.Get("/products", rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionRead),
		getProductTableData,
		hx_utils.IfNotHtmlSendData(keyProductTableData),
		hx_utils.IfHx(hx_utils.IsHxBoostedForm,
			handler.RenderTempl(productTable),
			handler.RenderTempl(productTable, productTableLayout),
		))
	app.Get(
		"/products/create",
		rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionRead),
		handler.RenderTempl(ProductCuForm),
	)
	app.Get("/products/:id", rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionRead),
		getProductDetailData,
		hx_utils.IfNotHtmlSendData(productDetailDataKey),
		handler.RenderTempl(ProductCuForm),
	)

	app.Put(
		"/products",
		rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionCreate, rbac.ActionUpdate),
		upsertProduct,
	)
	app.Delete(
		"/products/:id",
		rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionDelete),
		deleteProduct,
	)

	// SKUs
	app.Get("/skus", rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionRead),
		getSkuTableData,
		hx_utils.IfNotHtmlSendData(keySkuTableData),
		hx_utils.IfHx(hx_utils.IsHxBoostedForm,
			handler.RenderTempl(SkuTable),
			handler.RenderTempl(SkuTable, SkuTableLayout),
		),
	)
	app.Get(
		"/skus/create",
		rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionRead),
		handler.RenderTempl(SkuCuForm),
	)
	app.Get(
		"/skus/:id",
		rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionRead),
		getSkuDetailData,
		hx_utils.IfNotHtmlSendData(skuDetailDataKey),

		handler.RenderTempl(SkuCuForm),
	)
	app.Put(
		"/skus",
		rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionCreate, rbac.ActionUpdate),
		upsertSku,
	)
	app.Delete(
		"/skus/:id",
		rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionDelete),
		deleteSku,
	)

	// Inventory
	app.Get("/inventories", rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionRead),
		getInventoryTableData,
		hx_utils.IfNotHtmlSendData(keyInventoryTableData),
		hx_utils.IfHx(hx_utils.IsHxBoostedForm,
			handler.RenderTempl(InventoryTable),
			handler.RenderTempl(InventoryTable, InventoryTableLayout),
		),
	)
	app.Get(
		"/inventories/create",
		rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionRead),
		handler.RenderTempl(InventoryCuForm),
	)
	app.Get(
		"/inventories/:id",
		rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionRead),
		getInventoryDetailData,
		hx_utils.IfNotHtmlSendData(inventoryDetailDataKey),
		handler.RenderTempl(InventoryCuForm),
	)
	app.Put(
		"/inventories",
		rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionCreate, rbac.ActionUpdate),
		upsertInventory,
	)
	app.Delete(
		"/inventories/:id",
		rbac.RequirePermission(rbac.ResourceProduct, rbac.ActionDelete),
		deleteInventory,
	)

	return app
}
