package hx_utils

import (
	"github.com/gofiber/fiber/v3"
)

type HxPredicateFiberFunc func(c fiber.Ctx) bool

func IfHx(pred HxPredicateFiberFunc, yes fiber.Handler, no fiber.Handler) fiber.Handler {
	return func(c fiber.Ctx) error {
		if pred(c) {
			return yes(c)
		} else {
			return no(c)
		}
	}
}

func IfNotHtmlSendData[T any](key T) fiber.Handler {
	return func(c fiber.Ctx) error {
		if !IsHtmlRequest(c) {
			data := fiber.Locals[any](c, key)
			return c.JSON(data)
		}
		return c.Next()
	}
}
