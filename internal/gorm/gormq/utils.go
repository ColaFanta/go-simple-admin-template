package gormq

import (
	"strconv"

	. "github.com/colafanta/go-opera"
	"github.com/samber/lo"
)

func tryNumericFalllbackString(value string) any {
	numV := Try(strconv.ParseFloat(value, 64))
	return lo.Ternary[any](numV.IsOk(), numV, value)
}

func tryNumericFallbackStringSlice(values []string) []any {
	result := []any{}
	for _, v := range values {
		result = append(result, tryNumericFalllbackString(v))
	}
	return result
}
