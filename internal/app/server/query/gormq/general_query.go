package gormq

import (
	"fantacode/ecomm/internal/app/server/service"
	"strings"

	opera "github.com/colafanta/go-opera"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v3"
	"github.com/samber/lo"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type _PageQueryParams struct {
	Page int `query:"_page" validate:"omitempty,gte=1"`
	Size int `query:"_size" validate:"omitempty,gte=1"`
}

type _SortQueryParams struct {
	Sort  []string `query:"_sort"  validate:"omitempty,dive,required"`
	Order []string `query:"_order" validate:"omitempty,dive,oneof=asc desc"`
}

type IDPathParam struct {
	ID string `uri:"id" validate:"required"`
}

func GetById[T, P any](
	build func(P) []clause.Expression,
) func(fiber.Ctx) opera.Result[T] {
	return func(c fiber.Ctx) opera.Result[T] {
		return opera.Do(func() T {
			q := whereById[T](build)(c).Yield()
			t := opera.Must(q.First(c))
			return t
		})
	}
}

func DeleteById[T, P any](
	build func(P) []clause.Expression,
) func(fiber.Ctx) opera.Result[int] {
	return func(c fiber.Ctx) opera.Result[int] {
		return opera.Do(func() int {
			q := whereById[T](build)(c).Yield()
			rawAffected := opera.Must(q.Delete(c))
			return rawAffected
		})
	}
}

func UpdateById[T, P any](
	build func(P) []clause.Expression,
) func(fiber.Ctx) opera.Result[int] {
	return func(c fiber.Ctx) opera.Result[int] {
		return opera.Do(func() int {
			q := whereById[T](build)(c).Yield()

			assignments := deriveBodyAssignments(c).Yield()
			rawAffected := opera.Must(
				q.Set(clause.Set(assignments)).Update(c),
			)
			return rawAffected
		})
	}
}

func CreateOne[T any](c fiber.Ctx) opera.Result[opera.Unit] {
	return opera.Do(func() opera.Unit {
		db := opera.MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB
		assignments := deriveBodyAssignments(c).Yield()

		q := gorm.G[T](db)
		opera.MustPass(
			q.Set(clause.Set(assignments)).Create(c),
		)
		return opera.U
	})
}

func whereById[T, P any](
	build func(P) []clause.Expression,
) func(fiber.Ctx) opera.Result[gorm.ChainInterface[T]] {
	return func(c fiber.Ctx) opera.Result[gorm.ChainInterface[T]] {
		return opera.Do(func() gorm.ChainInterface[T] {
			var p P
			opera.MustPass(c.Bind().URI(&p))
			db := opera.MustHave(
				fiber.GetService[*service.DatabaseService](
					c.App().State(),
					service.KeyDatabaseService,
				),
			).DB
			clauses := build(p)
			q := gorm.G[T](db).Where(nil)
			for _, cl := range clauses {
				q = q.Where(cl)
			}

			return q
		})
	}
}

func deriveBodyAssignments(c fiber.Ctx) opera.Result[[]clause.Assignment] {
	return opera.Do(func() []clause.Assignment {
		var body map[string]any
		opera.MustPass(
			c.Bind().Body(&body),
		)
		assignments := lo.MapToSlice(body, func(k string, v any) clause.Assignment {
			return clause.Assignment{Column: clause.Column{Name: k}, Value: v}
		})
		return assignments
	})
}

func _deriveQueryCrudFilters(c fiber.Ctx) opera.Result[[]CrudFilter] {
	return opera.Do(func() []CrudFilter {
		m := c.Queries()
		query := lo.MapEntries(m, func(k string, v string) (string, []string) {
			if v == "" {
				return k, nil
			}
			return k, lo.Map(strings.Split(v, ","), func(v string, _ int) string {
				return strings.TrimSpace(v)
			})
		})

		return buildCrudFiltersFromQuery(query).Yield()
	})
}

func buildCrudFiltersFromQuery(raw map[string][]string) opera.Result[[]CrudFilter] {
	return opera.Do(func() []CrudFilter {
		validate := validator.New()
		validate.RegisterStructValidation(ValidateFieldFilter, FieldFilter{})

		var filters []CrudFilter
		for k, v := range raw {
			if v == nil {
				continue
			}
			var f FieldFilter
			// Check suffixes in order of specificity
			switch {
			case strings.HasSuffix(k, suffixNe):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixNe),
					Operator: CrudOpNe,
					Value:    tryNumericFalllbackString(opera.MustHave(lo.First(v))),
				}
			case strings.HasSuffix(k, suffixLt):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixLt),
					Operator: CrudOpLt,
					Value:    tryNumericFalllbackString(opera.MustHave(lo.First(v))),
				}
			case strings.HasSuffix(k, suffixGt):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixGt),
					Operator: CrudOpGt,
					Value:    tryNumericFalllbackString(opera.MustHave(lo.First(v))),
				}
			case strings.HasSuffix(k, suffixLte):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixLte),
					Operator: CrudOpLte,
					Value:    tryNumericFalllbackString(opera.MustHave(lo.First(v))),
				}
			case strings.HasSuffix(k, suffixGte):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixGte),
					Operator: CrudOpGte,
					Value:    tryNumericFalllbackString(opera.MustHave(lo.First(v))),
				}

			case strings.HasSuffix(k, suffixIn):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixIn),
					Operator: CrudOpIn,
					Value:    tryNumericFallbackStringSlice(v),
				}
			case strings.HasSuffix(k, suffixNin):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixNin),
					Operator: CrudOpNin,
					Value:    tryNumericFallbackStringSlice(v),
				}
			case strings.HasSuffix(k, suffixIna):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixIna),
					Operator: CrudOpIna,
					Value:    tryNumericFallbackStringSlice(v),
				}
			case strings.HasSuffix(k, suffixNina):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixNina),
					Operator: CrudOpNina,
					Value:    tryNumericFallbackStringSlice(v),
				}
			case strings.HasSuffix(k, suffixContains):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixContains),
					Operator: CrudOpContains,
					Value:    opera.MustHave(lo.First(v)),
				}

			case strings.HasSuffix(k, suffixNcontains):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixNcontains),
					Operator: CrudOpNcontains,
					Value:    opera.MustHave(lo.First(v)),
				}

			case strings.HasSuffix(k, suffixContainss):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixContainss),
					Operator: CrudOpContainss,
					Value:    opera.MustHave(lo.First(v)),
				}

			case strings.HasSuffix(k, suffixNcontainss):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixNcontainss),
					Operator: CrudOpNcontainss,
					Value:    opera.MustHave(lo.First(v)),
				}

			case strings.HasSuffix(k, suffixBetween):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixBetween),
					Operator: CrudOpBetween,
					Value:    tryNumericFallbackStringSlice(v),
				}
			case strings.HasSuffix(k, suffixNbetween):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixNbetween),
					Operator: CrudOpNbetween,
					Value:    tryNumericFallbackStringSlice(v),
				}
			case strings.HasSuffix(k, suffixNull):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixNull),
					Operator: CrudOpNull,
					Value:    nil,
				}
			case strings.HasSuffix(k, suffixNnull):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixNnull),
					Operator: CrudOpNnull,
					Value:    nil,
				}
			case strings.HasSuffix(k, suffixStartswith):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixStartswith),
					Operator: CrudOpStartswith,
					Value:    opera.MustHave(lo.First(v)),
				}
			case strings.HasSuffix(k, suffixNstartswith):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixNstartswith),
					Operator: CrudOpNstartswith,
					Value:    opera.MustHave(lo.First(v)),
				}
			case strings.HasSuffix(k, suffixStartswiths):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixStartswiths),
					Operator: CrudOpStartswiths,
					Value:    opera.MustHave(lo.First(v)),
				}
			case strings.HasSuffix(k, suffixNstartswiths):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixNstartswiths),
					Operator: CrudOpNstartswiths,
					Value:    opera.MustHave(lo.First(v)),
				}
			case strings.HasSuffix(k, suffixEndswith):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixEndswith),
					Operator: CrudOpEndswith,
					Value:    opera.MustHave(lo.First(v)),
				}
			case strings.HasSuffix(k, suffixNendswith):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixNendswith),
					Operator: CrudOpNendswith,
					Value:    opera.MustHave(lo.First(v)),
				}
			case strings.HasSuffix(k, suffixEndswiths):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixEndswiths),
					Operator: CrudOpEndswiths,
					Value:    opera.MustHave(lo.First(v)),
				}
			case strings.HasSuffix(k, suffixNendswiths):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixNendswiths),
					Operator: CrudOpNendswiths,
					Value:    opera.MustHave(lo.First(v)),
				}
			case strings.HasSuffix(k, suffixTsMatch):
				f = FieldFilter{
					Field:    strings.TrimSuffix(k, suffixTsMatch),
					Operator: CrudOpTsmatch,
					Value:    opera.MustHave(lo.First(v)),
				}
			default:
				f = FieldFilter{
					Field:    k,
					Operator: CrudOpEq,
					Value:    opera.MustHave(lo.First(v)),
				}
			}
			opera.MustPass(validate.Struct(f))
			filters = append(filters, f)
		}

		return filters
	})
}

func buildOrderByFromQuery(sortParams _SortQueryParams) opera.Result[[]clause.OrderByColumn] {
	return opera.Do(func() []clause.OrderByColumn {
		pairs := lo.Zip2(
			opera.MaybeEmpty(sortParams.Sort).Or([]string{}),
			opera.MaybeEmpty(sortParams.Order).Or([]string{}),
		)

		var obc []clause.OrderByColumn
		for _, pair := range pairs {
			col, order := pair.Unpack()
			if len(col) == 0 {
				continue
			}
			order = strings.ToLower(order)
			desc := order == "desc"
			obc = append(obc, clause.OrderByColumn{
				Column: clause.Column{Name: col},
				Desc:   desc,
			})
		}

		return obc
	})
}
