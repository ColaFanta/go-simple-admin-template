package rbac

import (
	"fantacode/ecomm/internal/biz/auth"
	"fantacode/ecomm/internal/fiber/service"

	. "github.com/colafanta/go-opera"
	"github.com/go-pkgz/auth/v2/token"
	"github.com/gofiber/fiber/v3"
)

func RequirePermission(resource Resource, actions ...Action) fiber.Handler {
	return func(c fiber.Ctx) error {
		return Do(func() Unit {
			ef :=
				fiber.MustGetService[*service.RbacService](
					c.App().State(),
					service.KeyRbacService,
				).Enforcer
			userInfo :=
				MaybeNilPtr(fiber.Locals[*token.User](c, auth.UserInfoKey)).Yield()
			role := userInfo.Role
			for _, action := range actions {
				accepted := Must(ef.Enforce(role, resource.String(), action.String()))
				if !accepted {
					c.SendStatus(fiber.StatusForbidden)
					return U
				}
			}
			MustPass(c.Next())
			return U
		}).Err()
	}
}
