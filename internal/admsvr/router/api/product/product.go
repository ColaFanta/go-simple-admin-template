package product

import (
	"strconv"

	"fantacode/ecomm/internal/biz/dao/gen"
	"fantacode/ecomm/internal/biz/dao/model"
	"fantacode/ecomm/internal/fiber/service"
	"fantacode/ecomm/internal/gorm/gormq"

	. "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type _ProductTableDataKey string

const keyProductTableData _ProductTableDataKey = "productTableData"

type getProductTableDataParams struct {
	gormq.GetListParams

	Q string `query:"search" form:"search" validate:"omitempty"`
}

// getProductTableData lists products.
//
//	@Summary	List products
//	@Tags		Products
//	@Produce	json
//	@Param		_page	query		int			false	"Page number (1-based)"		default(1)
//	@Param		_size	query		int			false	"Page size"					default(10)
//	@Param		_sort	query		[]string	false	"Sort fields"				collectionFormat(multi)
//	@Param		_order	query		[]string	false	"Sort direction per _sort"	collectionFormat(multi)	Enums(asc,desc)
//	@Param		search	query		string		false	"Search query"
//	@Success	200		{object}	gormq.GetListResponse[model.Product]
//	@Router		/api/products [get]
//	@Security	CookieAuth
func getProductTableData(c fiber.Ctx) error {
	return Do(func() Unit {
		p := new(getProductTableDataParams)
		MustPass(c.Bind().All(p))

		db := MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		q := gorm.G[model.Product](db).
			Preload(gen.Product.Skus.Name(), nil)

		if v, ok := MaybeEmpty(p.Q).Get(); ok {
			q = q.Where(gormq.FieldFilter{
				Field:    gen.Product.Q.Column().Name,
				Operator: gormq.CrudOpTsmatch,
				Value:    v,
			}.ToExpression())
		}

		list := gormq.ExecGetList(c, q, p.GetListParams).Yield()
		fiber.Locals(c, keyProductTableData, list)

		MustPass(c.Next())

		return U
	}).Err()
}

type _ProductDetailDataKey string

const productDetailDataKey _ProductDetailDataKey = "productDetailData"

// getProductDetailData gets a product by ID.
//
//	@Summary	Get product detail
//	@Tags		Products
//	@Produce	json
//	@Param		id	path		int	true	"Product ID"
//	@Success	200	{object}	model.Product
//	@Router		/api/products/{id} [get]
//	@Security	CookieAuth
func getProductDetailData(c fiber.Ctx) error {
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

		p := Must(
			gorm.G[model.Product](db).
				Preload(gen.Product.Skus.Name(), nil).
				Where(gen.Product.ID.Eq(id)).
				First(c),
		)

		fiber.Locals(c, productDetailDataKey, p)
		MustPass(c.Next())
		return U
	}).Err()
}

type _UpsertProductPayload struct {
	ID          uint   `form:"id"          validate:"omitempty,number"`
	Name        string `form:"name"        validate:"required"`
	Description string `form:"description" validate:"required"`
	Brand       string `form:"brand"       validate:"required"`
	Category    string `form:"category"    validate:"required"`
}

// upsertProduct creates or updates a product.
//
//	@Summary	Upsert product
//	@Tags		Products
//	@Accept		x-www-form-urlencoded
//	@Produce	json
//	@Param		id			formData	int		false	"Product ID (empty to create)"
//	@Param		name		formData	string	true	"Name"
//	@Param		description	formData	string	true	"Description"
//	@Param		brand		formData	string	true	"Brand"
//	@Param		category	formData	string	true	"Category"
//	@Success	204
//	@Router		/api/products [put]
//	@Security	CookieAuth
func upsertProduct(c fiber.Ctx) error {
	return Do(func() Unit {
		var payload _UpsertProductPayload
		MustPass(c.Bind().Form(&payload))

		db := MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		MustPass(db.Transaction(func(tx *gorm.DB) error {
			p := model.Product{
				Model:       gorm.Model{ID: payload.ID},
				Name:        payload.Name,
				Description: payload.Description,
				Brand:       payload.Brand,
				Category:    payload.Category,
			}

			if payload.ID == 0 {
				if err := tx.Create(&p).Error; err != nil {
					return err
				}
			} else {
				if err := tx.Clauses(clause.OnConflict{
					Columns: []clause.Column{{Name: gen.Product.ID.Column().Name}},
					DoUpdates: clause.AssignmentColumns(
						[]string{
							gen.Product.Name.Column().Name,
							gen.Product.Description.Column().Name,
							gen.Product.Brand.Column().Name,
							gen.Product.Category.Column().Name,
						},
					),
				}).Create(&p).Error; err != nil {
					return err
				}
			}

			return nil
		}))

		MustPass(c.Next())
		return U
	}).Err()
}

// deleteProduct deletes a product.
//
//	@Summary	Delete product
//	@Tags		Products
//	@Param		id	path	int	true	"Product ID"
//	@Success	204
//	@Router		/api/products/{id} [delete]
//	@Security	CookieAuth
func deleteProduct(c fiber.Ctx) error {
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

		Must(
			gorm.G[model.Product](db).
				Where(gen.Product.ID.Eq(id)).
				Delete(c),
		)

		MustPass(c.Next())
		return U
	}).Err()
}
