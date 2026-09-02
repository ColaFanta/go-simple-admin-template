package gormq

import (
	"strconv"

	opera "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm/clause"
)

func CreateOneHandler[T any](c fiber.Ctx) error {
	return opera.Do(func() opera.Unit {
		CreateOne[T](c).Yield()
		opera.MustPass(c.SendStatus(fiber.StatusCreated))
		return opera.U
	}).Err()
}

func GetByIdHandler[T, P any](
	build func(P) []clause.Expression,
) fiber.Handler {
	return fiber.Handler(func(c fiber.Ctx) error {
		return opera.Do(func() opera.Unit {
			t := GetById[T](build)(c).Yield()
			opera.MustPass(c.JSON(t))
			return opera.U
		}).Err()
	})
}

func UpdateByIdHandler[T, P any](
	build func(P) []clause.Expression,
) fiber.Handler {
	return fiber.Handler(func(c fiber.Ctx) error {
		return opera.Do(func() opera.Unit {
			rawsAffected := UpdateById[T](build)(c).Yield()
			opera.MustPass(c.SendString(strconv.Itoa(rawsAffected)))
			return opera.U
		}).Err()
	})
}

func DeleteByIdHandler[T, P any](
	build func(P) []clause.Expression,
) fiber.Handler {
	return fiber.Handler(func(c fiber.Ctx) error {
		return opera.Do(func() opera.Unit {
			rawsAffected := DeleteById[T](build)(c).Yield()
			opera.MustPass(c.SendString(strconv.Itoa(rawsAffected)))
			return opera.U
		}).Err()
	})
}
