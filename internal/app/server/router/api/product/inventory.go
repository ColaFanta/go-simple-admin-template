package product

import (
	"strconv"

	"fantacode/ecomm/internal/app/module/dao/gen"
	"fantacode/ecomm/internal/app/module/dao/model"
	"fantacode/ecomm/internal/app/server/query/gormq"
	"fantacode/ecomm/internal/app/server/service"

	opera "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type _InventoryTableDataKey int

const keyInventoryTableData _InventoryTableDataKey = 0

type getInventoryTableDataParams struct {
	gormq.GetListParams
	SkuID string `query:"sku_id" form:"sku_id" validate:"omitempty"`
}

// getInventoryTableData lists inventory entries.
//
//	@Summary	List inventories
//	@Tags		Inventory
//	@Produce	json
//	@Param		_page	query		int			false	"Page number (1-based)"		default(1)
//	@Param		_size	query		int			false	"Page size"					default(10)
//	@Param		_sort	query		[]string	false	"Sort fields"				collectionFormat(multi)
//	@Param		_order	query		[]string	false	"Sort direction per _sort"	collectionFormat(multi)	Enums(asc,desc)
//	@Param		sku_id	query		string		false	"Filter by SKU ID"
//	@Success	200		{object}	gormq.GetListResponse[model.Inventory]
//	@Router		/api/inventories [get]
//	@Security	CookieAuth
func getInventoryTableData(c fiber.Ctx) error {
	return opera.Do(func() opera.Unit {
		p := new(getInventoryTableDataParams)
		opera.MustPass(c.Bind().All(p))

		db := opera.MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		q := gorm.G[model.Inventory](db).Where(nil)
		if v, ok := opera.MaybeEmpty(p.SkuID).Get(); ok {
			id := opera.Must(strconv.ParseUint(v, 10, 64))
			q = q.Where(gen.Inventory.SkuID.Eq(uint(id)))
		}

		list := gormq.ExecGetList(c, q, p.GetListParams).Yield()
		fiber.Locals(c, keyInventoryTableData, list)
		opera.MustPass(c.Next())
		return opera.U
	}).Err()
}

type _InventoryDetailDataKey string

const inventoryDetailDataKey _InventoryDetailDataKey = "inventoryDetailData"

// getInventoryDetailData gets an inventory entry by ID.
//
//	@Summary	Get inventory detail
//	@Tags		Inventory
//	@Produce	json
//	@Param		id	path		int	true	"Inventory ID"
//	@Success	200	{object}	model.Inventory
//	@Router		/api/inventories/{id} [get]
//	@Security	CookieAuth
func getInventoryDetailData(c fiber.Ctx) error {
	return opera.Do(func() opera.Unit {
		var payload gormq.IDPathParam
		opera.MustPass(c.Bind().URI(&payload))
		id64 := opera.Must(strconv.ParseUint(payload.ID, 10, 64))
		id := uint(id64)

		db := opera.MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		inv := opera.Must(
			gorm.G[model.Inventory](db).
				Where(gen.Inventory.ID.Eq(id)).
				First(c),
		)
		fiber.Locals(c, inventoryDetailDataKey, inv)
		opera.MustPass(c.Next())
		return opera.U
	}).Err()
}

type _UpsertInventoryPayload struct {
	ID        uint   `form:"id"        validate:"omitempty,number"`
	SkuID     uint   `form:"sku_id"    validate:"required,number"`
	Warehouse string `form:"warehouse" validate:"required"`
	Quantity  uint64 `form:"quantity"  validate:"required,number"`
}

// upsertInventory creates or updates an inventory entry.
//
//	@Summary	Upsert inventory
//	@Tags		Inventory
//	@Accept		x-www-form-urlencoded
//	@Produce	json
//	@Param		id			formData	int		false	"Inventory ID (empty to create)"
//	@Param		sku_id		formData	int		true	"SKU ID"
//	@Param		warehouse	formData	string	true	"Warehouse"
//	@Param		quantity	formData	int		true	"Quantity"
//	@Success	204
//	@Router		/api/inventories [put]
//	@Security	CookieAuth
func upsertInventory(c fiber.Ctx) error {
	return opera.Do(func() opera.Unit {
		var payload _UpsertInventoryPayload
		opera.MustPass(c.Bind().Form(&payload))

		db := opera.MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		inv := model.Inventory{
			Model:     gorm.Model{ID: payload.ID},
			SkuID:     payload.SkuID,
			Warehouse: payload.Warehouse,
			Quantity:  payload.Quantity,
		}
		opera.MustPass(db.Save(&inv).Error)

		opera.MustPass(c.Next())
		return opera.U
	}).Err()
}

// deleteInventory deletes an inventory entry.
//
//	@Summary	Delete inventory
//	@Tags		Inventory
//	@Param		id	path	int	true	"Inventory ID"
//	@Success	204
//	@Router		/api/inventories/{id} [delete]
//	@Security	CookieAuth
func deleteInventory(c fiber.Ctx) error {
	return opera.Do(func() opera.Unit {
		var payload gormq.IDPathParam
		opera.MustPass(c.Bind().URI(&payload))
		id64 := opera.Must(strconv.ParseUint(payload.ID, 10, 64))
		id := uint(id64)

		db := opera.MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		opera.MustPass(db.Where("id = ?", id).Delete(&model.Inventory{}).Error)
		opera.MustPass(c.Next())
		return opera.U
	}).Err()
}
