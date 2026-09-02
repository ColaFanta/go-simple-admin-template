package middleware

import (
	"fantacode/ecomm/internal/app/module/auth"
	"fantacode/ecomm/internal/app/module/rbac"

	"github.com/casbin/casbin/v3"
	"github.com/colafanta/go-opera"
	"github.com/go-pkgz/auth/v2/token"
	"github.com/gofiber/fiber/v3"
)

func RequirePermission(enforcer *casbin.Enforcer, resource rbac.Resource, actions ...rbac.Action) fiber.Handler {
	return func(c fiber.Ctx) error {
		return opera.Do(func() opera.Unit {
			userInfo := opera.MaybeNilPtr(fiber.Locals[*token.User](c, auth.UserInfoKey)).Yield()
			for _, action := range actions {
				accepted := opera.Must(enforcer.Enforce(userInfo.Role, resource.String(), action.String()))
				if !accepted {
					c.SendStatus(fiber.StatusForbidden)
					return opera.U
				}
			}
			opera.MustPass(c.Next())
			return opera.U
		}).Err()
	}
}
