package router

import (
	admin "fantacode/ecomm/internal/admsvr/router/api"
	"fantacode/ecomm/internal/admsvr/router/auth"
	_ "fantacode/ecomm/internal/admsvr/router/docs"
	"fantacode/ecomm/internal/admsvr/router/misc"
	"fantacode/ecomm/internal/admsvr/ui/assets"
	"fantacode/ecomm/internal/biz/l10n"
	"fantacode/ecomm/internal/fiber/handler"
	"fantacode/ecomm/internal/fiber/service"

	"github.com/casbin/casbin/v3"
	"github.com/go-playground/validator/v10"
	swaggo "github.com/gofiber/contrib/v3/swaggo"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"github.com/samber/do/v2"
	"gorm.io/gorm"
)

//go:generate go tool swag init --parseDependency --parseInternal -ot go

type structValidator struct {
	validate *validator.Validate
}

func (v *structValidator) Validate(out any) error {
	if err := v.validate.Struct(out); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return nil
}

// Admin Server API
//
//	@title						Fanta Go Server API
//	@version					1.0
//	@description				This is a Fanta Go API server with built-in admin ui.
//	@license.name				Apache 2.0
//	@license.url				http://www.apache.org/licenses/LICENSE-2.0.html
//
//	@securityDefinitions.apiKey	CookieAuth
//	@in							cookie
//	@name						JWT
func New(i do.Injector) *fiber.App {
	cfg := &fiber.Config{}
	cfg.EnableSplittingOnParsers = true
	cfg.StructValidator = &structValidator{validate: validator.New()}
	cfg.Services = append(
		cfg.Services,
		&service.DatabaseService{DB: do.MustInvoke[*gorm.DB](i)},
		&service.DepsService{Deps: i},
		&service.RbacService{Enforcer: do.MustInvoke[*casbin.Enforcer](i)},
		&service.L10nService{Bundle: do.MustInvoke[*i18n.Bundle](i)},
		// &service.RedisService{Client: do.MustInvoke[*redis.Client](i)},
	)

	app := fiber.New(*cfg)

	app.Use(logger.New())

	// Static assets
	app.Get("/favicon.ico", func(c fiber.Ctx) error {
		return c.SendString(assets.Favicon)
	})
	app.Use("/assets/*", static.New("", static.Config{
		FS: assets.Assets,
		NotFoundHandler: func(c fiber.Ctx) error {
			return c.SendStatus(fiber.StatusNotFound)
		},
	}))

	app.Use(l10n.LocalizerMdw)

	app.Get("/", handler.RenderTempl(misc.LandingPage))

	app.Get("/openapi/*", swaggo.HandlerDefault)

	// Auth routes
	app.Use(auth.New(i))

	// Admin routes
	app.Use(admin.New(i))

	// Not found
	app.Use("*", handler.RenderTempl(misc.NotFound))

	return app
}
