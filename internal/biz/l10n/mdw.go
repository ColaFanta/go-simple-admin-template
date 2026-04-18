package l10n

import (
	"fantacode/ecomm/internal/fiber/service"

	. "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"github.com/nicksnyder/go-i18n/v2/i18n"
)

type _I18nLocalizerKey int

const KeyI18nLocalizer _I18nLocalizerKey = 0

func LocalizerMdw(c fiber.Ctx) error {
	return Do(func() Unit {

		bundle := MustHave(
			fiber.GetService[*service.L10nService](c.App().State(), service.KeyL10nService),
		).Bundle

		localizer := i18n.NewLocalizer(bundle, c.Cookies("LANGUAGE"), c.Get("Accept-Language"))

		fiber.Locals(c, KeyI18nLocalizer, localizer)

		MustPass(c.Next())

		return U
	}).Err()
}
