package gormq

import (
	"strconv"

	. "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm/clause"
)

func CreateOneHandler[T any](c fiber.Ctx) error {
	return Do(func() Unit {
		CreateOne[T](c).Yield()
		MustPass(c.SendStatus(fiber.StatusCreated))
		return U
	}).Err()
}

func GetByIdHandler[T, P any](
	build func(P) []clause.Expression,
) fiber.Handler {
	return fiber.Handler(func(c fiber.Ctx) error {
		return Do(func() Unit {
			t := GetById[T](build)(c).Yield()
			MustPass(c.JSON(t))
			return U
		}).Err()
	})
}

func UpdateByIdHandler[T, P any](
	build func(P) []clause.Expression,
) fiber.Handler {
	return fiber.Handler(func(c fiber.Ctx) error {
		return Do(func() Unit {
			rawsAffected := UpdateById[T](build)(c).Yield()
			MustPass(c.SendString(strconv.Itoa(rawsAffected)))
			return U
		}).Err()
	})
}

func DeleteByIdHandler[T, P any](
	build func(P) []clause.Expression,
) fiber.Handler {
	return fiber.Handler(func(c fiber.Ctx) error {
		return Do(func() Unit {
			rawsAffected := DeleteById[T](build)(c).Yield()
			MustPass(c.SendString(strconv.Itoa(rawsAffected)))
			return U
		}).Err()
	})
}
