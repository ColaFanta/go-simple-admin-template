package dashboard

import (
	"fantacode/ecomm/internal/fiber/handler"

	"github.com/gofiber/fiber/v3"
	"github.com/samber/do/v2"
)

func getDashboardPage(c fiber.Ctx) error {
	return handler.RenderTempl(DashboardPage)(c)
}

func New(i do.Injector) fiber.Router {
	app := fiber.New()

	app.Get("/dashboard", getDashboardPage)

	return app
}
