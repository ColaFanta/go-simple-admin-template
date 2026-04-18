package gormq

import (
	"context"

	. "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type GetListParams struct {
	_PageQueryParams
	_SortQueryParams
}

type GetListResponse[T any] struct {
	Total int `json:"total"`
	Data  []T `json:"data"`
	GetListParams
}

func ExecGetList[T any](
	c fiber.Ctx,
	q gorm.ChainInterface[T],
	params GetListParams,
) Result[GetListResponse[T]] {
	return Do(func() GetListResponse[T] {
		// Set default paging params
		page := MaybeEmpty(params.Page).Or(1)
		size := MaybeEmpty(params.Size).Or(10)
		params._PageQueryParams = _PageQueryParams{
			Page: page,
			Size: size,
		}

		qcount := q
		countTask := Async(c, func(ctx context.Context) Result[int64] {
			return Try(qcount.Count(ctx, "*"))
		})

		qdata := q
		dataTask := Async(c, func(ctx context.Context) Result[[]T] {
			offset := (page - 1) * size
			qdata = qdata.Offset(offset).Limit(size)
			sort := buildOrderByFromQuery(params._SortQueryParams).Yield()
			for _, s := range sort {
				qdata = qdata.Order(s)
			}
			return Try(qdata.Find(ctx))
		})
		count, data := Await(c, countTask).Yield(), Await(c, dataTask).Yield()

		res := GetListResponse[T]{int(count), data, params}

		return res
	})
}
