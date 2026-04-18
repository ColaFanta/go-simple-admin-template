package gormq

import (
	"gorm.io/gorm/clause"
)

type CrudFilter interface {
	priv()
	ToExpression() clause.Expression
}
