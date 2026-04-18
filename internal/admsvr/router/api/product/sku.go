package product

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"fantacode/ecomm/internal/biz/dao/gen"
	"fantacode/ecomm/internal/biz/dao/model"
	"fantacode/ecomm/internal/fiber/service"
	"fantacode/ecomm/internal/gorm/gormq"

	. "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type _SkuTableDataKey int

const keySkuTableData _SkuTableDataKey = 0

type _GetSkuTableDataParams struct {
	gormq.GetListParams

	Q         string `query:"search"     form:"search"     validate:"omitempty"`
	ProductID uint   `query:"product_id" form:"product_id" validate:"omitempty"`
}

// getSkuTableData lists SKUs.
//
//	@Summary	List SKUs
//	@Tags		SKUs
//	@Produce	json
//	@Param		_page		query		int			false	"Page number (1-based)"		default(1)
//	@Param		_size		query		int			false	"Page size"					default(10)
//	@Param		_sort		query		[]string	false	"Sort fields"				collectionFormat(multi)
//	@Param		_order		query		[]string	false	"Sort direction per _sort"	collectionFormat(multi)	Enums(asc,desc)
//	@Param		search		query		string		false	"Search query"
//	@Param		product_id	query		int			false	"Filter by product ID"
//	@Success	200			{object}	gormq.GetListResponse[model.Sku]
//	@Router		/api/skus [get]
func getSkuTableData(c fiber.Ctx) error {
	return Do(func() Unit {
		p := new(_GetSkuTableDataParams)
		MustPass(c.Bind().All(p))

		db := MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		q := gorm.G[model.Sku](db).
			Preload(gen.Sku.Product.Name(), nil).
			Preload(gen.Sku.Inventories.Name(), nil).
			Preload(gen.Sku.Prices.Name(), nil).
			Joins(clause.LeftJoin.Association(gen.Sku.SkuSpecPc.Name()), nil).
			Joins(clause.LeftJoin.Association(gen.Sku.SkuSpecPhone.Name()), nil)

		if v, ok := MaybeEmpty(p.ProductID).Get(); ok {
			q = q.Where(gen.Sku.ProductID.Eq(v))
		}

		if v, ok := MaybeEmpty(p.Q).Get(); ok {
			q = q.Where(gen.Sku.SkuCode.ILike("%" + v + "%"))
		}

		list := gormq.ExecGetList(c, q, p.GetListParams).Yield()

		fiber.Locals(c, keySkuTableData, list)
		MustPass(c.Next())
		return U
	}).Err()
}

type _SkuDetailDataKey string

const skuDetailDataKey _SkuDetailDataKey = "skuDetailData"

// getSkuDetailData gets a SKU by ID.
//
//	@Summary	Get SKU detail
//	@Tags		SKUs
//	@Produce	json
//	@Param		id	path		int	true	"SKU ID"
//	@Success	200	{object}	model.Sku
//	@Router		/api/skus/{id} [get]
//	@Security	CookieAuth
func getSkuDetailData(c fiber.Ctx) error {
	return Do(func() Unit {
		var payload gormq.IDPathParam
		MustPass(c.Bind().URI(&payload))
		id64 := Must(strconv.ParseUint(payload.ID, 10, 64))
		id := uint(id64)

		db := MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		sku := Must(
			gorm.G[model.Sku](db).
				Preload(gen.Sku.Product.Name(), func(db gorm.PreloadBuilder) error { return nil }).
				Preload(gen.Sku.Prices.Name(), func(db gorm.PreloadBuilder) error { return nil }).
				Preload(gen.Sku.Inventories.Name(), func(db gorm.PreloadBuilder) error { return nil }).
				Joins(clause.LeftJoin.Association(gen.Sku.SkuSpecPc.Name()), nil).
				Joins(clause.LeftJoin.Association(gen.Sku.SkuSpecPhone.Name()), nil).
				Where(gen.Sku.ID.WithTable("skus").Eq(id)).
				First(c),
		)
		fiber.Locals(c, skuDetailDataKey, sku)
		MustPass(c.Next())
		return U
	}).Err()
}

type _UpsertSkuPayload struct {
	ID        uint   `form:"id"         validate:"omitempty,number"`
	ProductID uint   `form:"product_id" validate:"required,number"`
	SkuCode   string `form:"sku_code"   validate:"required"`

	// "phone" or "pc". Exactly one spec is stored per SKU.
	SpecType string `form:"spec_type" validate:"required"`

	BasePrice uint64 `form:"base_price" validate:"required,number"`
	Currency  string `form:"currency"   validate:"required"`

	// Comma-separated list fields, e.g. "USD,EUR" and "129900,119900".
	PricesCurrencies string `form:"prices_currencies" validate:"omitempty"`
	PricesAmounts    string `form:"prices_amounts"    validate:"omitempty"`

	PhoneProcessor string `form:"phone_processor" validate:"omitempty"`
	PhoneStorage   uint   `form:"phone_storage"   validate:"omitempty,number"`
	PhoneColor     string `form:"phone_color"     validate:"omitempty"`
	PhoneSize      string `form:"phone_size"      validate:"omitempty"`
	PhoneCamera    string `form:"phone_camera"    validate:"omitempty"`

	PcProcessor string `form:"pc_processor" validate:"omitempty"`
	PcRam       uint   `form:"pc_ram"       validate:"omitempty,number"`
	PcStorage   uint   `form:"pc_storage"   validate:"omitempty,number"`
}

// upsertSku creates or updates a SKU.
//
//	@Summary	Upsert SKU
//	@Tags		SKUs
//	@Accept		x-www-form-urlencoded
//	@Produce	json
//	@Param		id			formData	int		false	"SKU ID (empty to create)"
//	@Param		product_id	formData	int		true	"Product ID"
//	@Param		sku_code	formData	string	true	"SKU code"
//	@Param		spec_type	formData	string	true	"Spec type"	Enums(phone,pc)
//	@Param		base_price	formData	int		true	"Base price (minor units)"
//	@Param		currency	formData	string	true	"Currency"
//	@Success	204
//	@Router		/api/skus [put]
//	@Security	CookieAuth
func upsertSku(c fiber.Ctx) error {
	return Do(func() Unit {
		var payload _UpsertSkuPayload
		MustPass(c.Bind().Form(&payload))

		db := MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		MustPass(db.Transaction(func(tx *gorm.DB) error {
			s := model.Sku{
				Model:     gorm.Model{ID: payload.ID},
				ProductID: payload.ProductID,
				SkuCode:   payload.SkuCode,
			}
			if err := tx.Save(&s).Error; err != nil {
				return err
			}

			specType := strings.ToLower(strings.TrimSpace(payload.SpecType))
			var specErr error
			switch specType {
			case "phone":
				if payload.PhoneProcessor == "" || payload.PhoneColor == "" ||
					payload.PhoneSize == "" ||
					payload.PhoneCamera == "" {
					specErr = fiber.NewError(fiber.StatusBadRequest, "phone spec is incomplete")
					break
				}
				// Ensure only one spec exists
				if err := tx.Where("sku_id = ?", s.ID).
					Delete(&model.SkuSpecPc{}).
					Error; err != nil {
					specErr = err
					break
				}

				var phone model.SkuSpecPhone
				err := tx.Where("sku_id = ?", s.ID).First(&phone).Error
				if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
					specErr = err
					break
				}
				phone.SkuID = s.ID
				phone.BasePrice = payload.BasePrice
				phone.Currency = payload.Currency
				phone.Processor = payload.PhoneProcessor
				phone.Storage = payload.PhoneStorage
				phone.Color = payload.PhoneColor
				phone.Size = payload.PhoneSize
				phone.Camera = payload.PhoneCamera
				if phone.ID == 0 {
					specErr = tx.Create(&phone).Error
					break
				}
				specErr = tx.Save(&phone).Error

			case "pc":
				if payload.PcProcessor == "" {
					specErr = fiber.NewError(fiber.StatusBadRequest, "pc spec is incomplete")
					break
				}
				if err := tx.Where("sku_id = ?", s.ID).
					Delete(&model.SkuSpecPhone{}).
					Error; err != nil {
					specErr = err
					break
				}

				var pc model.SkuSpecPc
				err := tx.Where("sku_id = ?", s.ID).First(&pc).Error
				if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
					specErr = err
					break
				}
				pc.SkuID = s.ID
				pc.BasePrice = payload.BasePrice
				pc.Currency = payload.Currency
				pc.Processor = payload.PcProcessor
				pc.Ram = payload.PcRam
				pc.Storage = payload.PcStorage
				if pc.ID == 0 {
					specErr = tx.Create(&pc).Error
					break
				}
				specErr = tx.Save(&pc).Error
			default:
				specErr = fiber.NewError(
					fiber.StatusBadRequest,
					"spec_type must be 'phone' or 'pc'",
				)
			}

			if specErr != nil {
				return specErr
			}

			parseCSV := func(raw string) []string {
				raw = strings.TrimSpace(raw)
				if raw == "" {
					return nil
				}
				parts := strings.Split(raw, ",")
				out := make([]string, 0, len(parts))
				for _, p := range parts {
					p = strings.TrimSpace(p)
					if p == "" {
						continue
					}
					out = append(out, p)
				}
				return out
			}

			currencies := parseCSV(payload.PricesCurrencies)
			amounts := parseCSV(payload.PricesAmounts)

			if len(currencies) == 0 && len(amounts) == 0 {
				return fiber.NewError(fiber.StatusBadRequest, "at least 1 price row is required")
			}

			if len(currencies) != len(amounts) {
				return fiber.NewError(
					fiber.StatusBadRequest,
					"prices are invalid (currencies/amounts length mismatch)",
				)
			}

			// Replace prices: if user submits no rows, clear all prices.
			if err := tx.Where("sku_id = ?", s.ID).Delete(&model.SkuPrice{}).Error; err != nil {
				return err
			}

			if len(currencies) > 0 {
				seen := make(map[string]struct{}, len(currencies))
				prices := make([]model.SkuPrice, 0, len(currencies))
				for i := range currencies {
					cur := strings.ToUpper(strings.TrimSpace(currencies[i]))
					if cur == "" {
						return fiber.NewError(fiber.StatusBadRequest, "price currency is required")
					}
					if strings.Contains(cur, ",") {
						return fiber.NewError(
							fiber.StatusBadRequest,
							"price currency cannot contain commas",
						)
					}
					if _, ok := seen[cur]; ok {
						return fiber.NewError(
							fiber.StatusBadRequest,
							fmt.Sprintf("duplicate price currency: %s", cur),
						)
					}
					seen[cur] = struct{}{}

					amtStr := strings.TrimSpace(amounts[i])
					amt, err := strconv.ParseUint(amtStr, 10, 64)
					if err != nil {
						return fiber.NewError(
							fiber.StatusBadRequest,
							"price amount must be an integer number of cents",
						)
					}

					prices = append(prices, model.SkuPrice{SkuID: s.ID, Currency: cur, Price: amt})
				}

				if err := tx.Create(&prices).Error; err != nil {
					return err
				}
			}

			return nil
		}))

		MustPass(c.Next())
		return U
	}).Err()
}

// deleteSku deletes a SKU.
//
//	@Summary	Delete SKU
//	@Tags		SKUs
//	@Param		id	path	int	true	"SKU ID"
//	@Success	204
//	@Router		/api/skus/{id} [delete]
//	@Security	CookieAuth
func deleteSku(c fiber.Ctx) error {
	return Do(func() Unit {
		var payload gormq.IDPathParam
		MustPass(c.Bind().URI(&payload))
		id64 := Must(strconv.ParseUint(payload.ID, 10, 64))
		id := uint(id64)

		db := MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		MustPass(db.Where("id = ?", id).Delete(&model.Sku{}).Error)
		MustPass(c.Next())
		return U
	}).Err()
}
