package middleware

import (
	"github.com/gofiber/fiber/v3"
	"github.com/nicksnyder/go-i18n/v2/i18n"
)

type _I18nLocalizerKey int

const KeyI18nLocalizer _I18nLocalizerKey = 0

func Localizer(bundle *i18n.Bundle) fiber.Handler {
	return func(c fiber.Ctx) error {
		localizer := i18n.NewLocalizer(bundle, c.Cookies("LANGUAGE"), c.Get("Accept-Language"))
		fiber.Locals(c, KeyI18nLocalizer, localizer)
		return c.Next()
	}
}
