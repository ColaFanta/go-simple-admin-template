package gormq

import (
	"fmt"

	opera "github.com/colafanta/go-opera"
	"github.com/go-playground/validator/v10"
	"github.com/samber/lo"
	"gorm.io/gorm/clause"
)

// FieldFilter represents a direct field comparison condition
type FieldFilter struct {
	Field    string        `json:"f"   validate:"required"`
	Operator FieldOperator `json:"op"  validate:"required,validateFn=IsValid"`
	Value    any           `json:"val" validate:"omitempty"`
}

func (f FieldFilter) priv() {}

func (f FieldFilter) ToExpression() clause.Expression {
	field, operator, value := f.Field, f.Operator, f.Value
	column := clause.Column{Name: field}
	var expr clause.Expression
	switch operator {
	case CrudOpEq:
		expr = clause.Eq{Column: column, Value: value}
	case CrudOpNe:
		expr = clause.Neq{Column: column, Value: value}
	case CrudOpLt:
		expr = clause.Lt{Column: column, Value: value}
	case CrudOpGt:
		expr = clause.Gt{Column: column, Value: value}
	case CrudOpLte:
		expr = clause.Lte{Column: column, Value: value}
	case CrudOpGte:
		expr = clause.Gte{Column: column, Value: value}
	case CrudOpIn:
		arr := opera.TryCast[[]any](value).Yield()
		expr = clause.IN{Column: column, Values: arr}
	case CrudOpNin:
		arr := opera.TryCast[[]any](value).Yield()
		expr = clause.Not(clause.IN{Column: column, Values: arr})
	case CrudOpIna:
		sql := fmt.Sprintf(`"%s" && ARRAY[`, column.Name)
		arr := opera.TryCast[[]any](value).Yield()
		for i := range arr {
			if i > 0 {
				sql += ","
			}
			sql += "?"
		}
		sql += "]"
		expr = clause.Expr{
			SQL:  sql,
			Vars: arr,
		}
	case CrudOpNina:
		sql := fmt.Sprintf(`NOT ("%s" && ARRAY[`, column.Name)
		arr := opera.TryCast[[]any](value).Yield()
		for i := range arr {
			if i > 0 {
				sql += ","
			}
			sql += "?"
		}
		sql += "])"
		expr = clause.Expr{
			SQL:  sql,
			Vars: arr,
		}
	case CrudOpContains:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Expr{
			SQL:  fmt.Sprintf(`"%s"`, column.Name) + " ILIKE ?",
			Vars: []any{str},
		}
	case CrudOpNcontains:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Expr{
			SQL:  fmt.Sprintf(`"%s"`, column.Name) + " NOT ILIKE ?",
			Vars: []any{str},
		}
	case CrudOpContainss:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Like{Column: column, Value: fmt.Sprintf("%%%s%%", str)}
	case CrudOpNcontainss:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Not(clause.Like{Column: column, Value: fmt.Sprintf("%%%s%%", str)})
	case CrudOpBetween:
		rg := opera.TryCast[[]any](value).Yield()
		opera.MustTrue(len(rg) >= 2)
		expr = clause.Expr{
			SQL:  fmt.Sprintf(`"%s" BETWEEN ? AND ?`, column.Name),
			Vars: []any{rg[0], rg[1]},
		}
	case CrudOpNbetween:
		rg := opera.TryCast[[]any](value).Yield()
		opera.MustTrue(len(rg) >= 2)
		expr = clause.Expr{
			SQL:  fmt.Sprintf(`"%s" NOT BETWEEN ? AND ?`, column.Name),
			Vars: []any{rg[0], rg[1]},
		}
	case CrudOpNull:
		expr = clause.Eq{Column: column, Value: value}
	case CrudOpNnull:
		expr = clause.Neq{Column: column, Value: value}
	case CrudOpStartswith:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Expr{
			SQL:  fmt.Sprintf(`"%s"`, column.Name) + " ILIKE ?",
			Vars: []any{fmt.Sprintf("%s%%", str)},
		}
	case CrudOpNstartswith:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Expr{
			SQL:  fmt.Sprintf(`"%s"`, column.Name) + " NOT ILIKE ?",
			Vars: []any{fmt.Sprintf("%s%%", str)},
		}
	case CrudOpStartswiths:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Like{Column: column, Value: fmt.Sprintf("%s%%", str)}
	case CrudOpNstartswiths:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Not(clause.Like{Column: column, Value: fmt.Sprintf("%s%%", str)})
	case CrudOpEndswith:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Expr{
			SQL:  fmt.Sprintf(`"%s"`, column.Name) + " ILIKE ?",
			Vars: []any{fmt.Sprintf("%%%s", str)},
		}
	case CrudOpNendswith:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Expr{
			SQL:  fmt.Sprintf(`"%s"`, column.Name) + " NOT ILIKE ?",
			Vars: []any{fmt.Sprintf("%%%s", str)},
		}
	case CrudOpEndswiths:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Like{Column: column, Value: fmt.Sprintf("%%%s", str)}
	case CrudOpNendswiths:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Not(clause.Like{Column: column, Value: fmt.Sprintf("%%%s", str)})
	case CrudOpTsmatch:
		str := opera.TryCast[string](value).Yield()
		expr = clause.Expr{
			SQL:  fmt.Sprintf(`"%s" @@ to_tsquery(?)`, column.Name),
			Vars: []any{str},
		}
	default:
		opera.Err[opera.Unit](ErrInvalidFieldOperator).Yield()
	}
	return expr
}

var _ = CrudFilter(FieldFilter{})

func ValidateFieldFilter(sl validator.StructLevel) {
	filter := sl.Current().Interface().(FieldFilter)
	if lo.Contains([]FieldOperator{CrudOpNull, CrudOpNnull}, filter.Operator) &&
		filter.Value != nil {
		sl.ReportError(filter.Value, "val", "Value", "null_operator_no_value", "")
		return
	}
	if lo.Contains(
		[]FieldOperator{CrudOpIn, CrudOpNin, CrudOpIna, CrudOpNina, CrudOpBetween, CrudOpNbetween},
		filter.Operator,
	) && opera.MayCast[[]any](filter.Value).IsNone() {
		sl.ReportError(filter.Value, "val", "Value", "array_required", "")
		return
	}
	if lo.Contains(
		[]FieldOperator{
			CrudOpContains,
			CrudOpNcontains,
			CrudOpContainss,
			CrudOpNcontainss,
			CrudOpStartswith,
			CrudOpNstartswith,
			CrudOpStartswiths,
			CrudOpNstartswiths,
			CrudOpEndswith,
			CrudOpNendswith,
			CrudOpEndswiths,
			CrudOpNendswiths,
		},
		filter.Operator,
	) && opera.MayCast[string](filter.Value).IsNone() {
		sl.ReportError(filter.Value, "val", "Value", "string_required", "")
	}
}
