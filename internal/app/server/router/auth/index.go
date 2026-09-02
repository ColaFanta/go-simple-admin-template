package auth

import (
	"fantacode/ecomm/internal/platform/http/fiber/handler"
	"net/http"

	opera "github.com/colafanta/go-opera"
	"github.com/go-pkgz/auth/v2"
	"github.com/gofiber/fiber/v3"
	"github.com/samber/do/v2"
)

func New(i do.Injector) *fiber.App {
	authSvc := do.MustInvoke[*auth.Service](i)

	authRoutes, avatarRoutes := authSvc.Handlers()
	app := fiber.New(fiber.Config{
		EnableSplittingOnParsers: true,
	})

	app.Post("/auth/unpw/signup", signupHandler)

	app.Use("/auth", loginHandler(authRoutes))
	app.Use("/avatar", avatarRoutes)
	app.Get("/login", handler.RenderTempl(LoginPage))
	app.Get("/signup", handler.RenderTempl(SignUpPage))

	return app
}

// loginHandler wraps a authRouter to provide login functionality.
//
//	@Summary	Login
//	@Tags		Auth
//	@Accept		x-www-form-urlencoded
//	@Param		user	formData	string	true	"Username"
//	@Param		passwd	formData	string	true	"Password"
//	@Success	200
//	@Header		200	{string}	Set-Cookie	"JWT token cookie"
//
//	@Router		/auth/unpw/login [post]
func loginHandler(authRoutes http.Handler) http.Handler {
	return authRoutes
}

// signupHandler handles user signup requests.
//
//	@Summary	Signup
//	@Tags		Auth
//	@Accept		x-www-form-urlencoded
//	@Param		user			formData	string	true	"Username"
//	@Param		passwd			formData	string	true	"Password"
//	@Param		confirm-passwd	formData	string	true	"Confirm Password"
//	@Success	200
//	@Router		/auth/unpw/signup [post]
func signupHandler(c fiber.Ctx) error {
	return opera.Do(func() opera.Unit {
		c.SendString("Demo signup will always success")
		return nil
	}).Err()
}
