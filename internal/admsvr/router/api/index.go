package admin

import (
	"fantacode/ecomm/internal/admsvr/router/api/apicm"
	"fantacode/ecomm/internal/admsvr/router/api/dashboard"
	"fantacode/ecomm/internal/admsvr/router/api/inbox"
	"fantacode/ecomm/internal/admsvr/router/api/product"
	"fantacode/ecomm/internal/admsvr/router/api/rbac"
	"fantacode/ecomm/internal/admsvr/router/api/user"
	bizauth "fantacode/ecomm/internal/biz/auth"
	"strings"

	"github.com/go-pkgz/auth/v2"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/adaptor"
	"github.com/samber/do/v2"
	"github.com/samber/lo"
)

func New(i do.Injector) *fiber.App {
	app := fiber.New()
	g := app.Group(apicm.ApiBasePath)

	authSvc := do.MustInvoke[*auth.Service](i)
	m := authSvc.Middleware()

	g.Use(
		"/*",
		adaptor.HTTPMiddleware(m.AdminOnly),
		bizauth.DeriveUserInfo,
	)

	// defaults to /dashboard
	g.Get("/", func(c fiber.Ctx) error {
		path := c.Path()
		path += lo.Ternary(strings.HasSuffix(path, "/"), "", "/") + "dashboard"
		return c.Redirect().To(path)
	})

	g.Use(dashboard.New(i))
	g.Use(inbox.New(i))

	g.Use(product.New(i))

	g.Use(user.New(i))
	g.Use(rbac.New(i))

	return app
}
