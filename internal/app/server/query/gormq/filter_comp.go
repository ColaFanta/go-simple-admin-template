package gormq

import (
	"gorm.io/gorm/clause"
)

// CompositeFilter groups multiple filters with boolean logic
type CompositeFilter struct {
	Operator ComposeOperator `json:"op"  validate:"required,validateFn=IsValid"`
	Value    []CrudFilter    `json:"val" validate:"required,dive,required"`
}

func (f CompositeFilter) priv() {}

func (f CompositeFilter) ToExpression() clause.Expression {
	exprs := []clause.Expression{}
	for _, filter := range f.Value {
		exprs = append(exprs, filter.ToExpression())
	}
	switch f.Operator {
	case CrudOpAnd:
		return clause.And(exprs...)
	case CrudOpOr:
		return clause.Or(exprs...)
	default:
		panic(ErrInvalidComposeOperator)
	}
}

var _ = CrudFilter(CompositeFilter{})
