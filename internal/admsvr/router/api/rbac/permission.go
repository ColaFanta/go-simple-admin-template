package rbac

import (
	"fantacode/ecomm/internal/biz/rbac"
	"fantacode/ecomm/internal/fiber/service"

	. "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"github.com/samber/lo"
)

type _getPermissionsDataKey int

const keyPermissionsData _getPermissionsDataKey = 0

// getPermissions lists all permissions.
//
//	@Summary	List permissions
//	@Tags		RBAC
//	@Produce	json
//	@Success	200	{array}	rbac.Permission
//	@Router		/api/permissions [get]
//	@Security	CookieAuth
func getPermissions(c fiber.Ctx) error {
	return Do(func() Unit {
		ef := fiber.MustGetService[*service.RbacService](
			c.App().State(),
			service.KeyRbacService,
		).Enforcer

		permsRaw := Must(ef.GetPolicy()) // Get p

		perms := lo.Map(permsRaw, func(p []string, _ int) rbac.Permission {
			return rbac.Permission{
				Name:     p[0],
				Resource: p[1],
				Action:   p[2],
			}
		})

		fiber.Locals(c, keyPermissionsData, perms)
		MustPass(c.Next())

		return U
	}).Err()
}
