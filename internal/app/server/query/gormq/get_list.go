package gormq

import (
	"context"

	opera "github.com/colafanta/go-opera"
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
) opera.Result[GetListResponse[T]] {
	return opera.Do(func() GetListResponse[T] {
		// Set default paging params
		page := opera.MaybeEmpty(params.Page).Or(1)
		size := opera.MaybeEmpty(params.Size).Or(10)
		params._PageQueryParams = _PageQueryParams{
			Page: page,
			Size: size,
		}

		qcount := q
		countTask := opera.Async(c, func(ctx context.Context) opera.Result[int64] {
			return opera.Try(qcount.Count(ctx, "*"))
		})

		qdata := q
		dataTask := opera.Async(c, func(ctx context.Context) opera.Result[[]T] {
			offset := (page - 1) * size
			qdata = qdata.Offset(offset).Limit(size)
			sort := buildOrderByFromQuery(params._SortQueryParams).Yield()
			for _, s := range sort {
				qdata = qdata.Order(s)
			}
			return opera.Try(qdata.Find(ctx))
		})
		count, data := opera.Await(c, countTask).Yield(), opera.Await(c, dataTask).Yield()

		res := GetListResponse[T]{int(count), data, params}

		return res
	})
}
