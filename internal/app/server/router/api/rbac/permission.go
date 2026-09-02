package rbac

import (
	"fantacode/ecomm/internal/app/module/rbac"
	"fantacode/ecomm/internal/app/server/service"

	opera "github.com/colafanta/go-opera"
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
	return opera.Do(func() opera.Unit {
		ef := fiber.MustGetService[*service.RbacService](
			c.App().State(),
			service.KeyRbacService,
		).Enforcer

		permsRaw := opera.Must(ef.GetPolicy()) // Get p

		perms := lo.Map(permsRaw, func(p []string, _ int) rbac.Permission {
			return rbac.Permission{
				Name:     p[0],
				Resource: p[1],
				Action:   p[2],
			}
		})

		fiber.Locals(c, keyPermissionsData, perms)
		opera.MustPass(c.Next())

		return opera.U
	}).Err()
}
