package inbox

import (
	"fantacode/ecomm/internal/platform/http/fiber/handler"

	"github.com/gofiber/fiber/v3"
	"github.com/samber/do/v2"
)

func getInboxPage(c fiber.Ctx) error {
	return handler.RenderTempl(InboxPage)(c)
}

func New(i do.Injector) fiber.Router {
	app := fiber.New()

	app.Get("/inbox", getInboxPage)

	return app
}
