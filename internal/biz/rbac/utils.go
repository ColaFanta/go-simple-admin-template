package rbac

import (
	"github.com/casbin/casbin/v3"
	. "github.com/colafanta/go-opera"
	"github.com/samber/lo"
)

func GetAllRoles(ef *casbin.Enforcer) Result[[]Role] {
	return Do(func() []Role {

		crolestrs := Must(ef.GetAllRoles()) // Get g-v1

		cuserstrss := lo.Map(crolestrs, func(item string, _ int) []string {
			return Try(ef.GetUsersForRole(item)).OrEmpty() // Get g-v0
		})

		cuserstrs := lo.Flatten(cuserstrss)
		cuserstrs = lo.Uniq(cuserstrs)
		roles := lo.Map(cuserstrs, func(item string, _ int) Role {
			role := Role{
				Name:        item,
				Permissions: nil,
			}

			policies := Try(ef.GetImplicitPermissionsForUser(item)).OrEmpty()
			role.Permissions = lo.Map(policies, func(p []string, _ int) Permission {
				return Permission{
					Name:     p[0],
					Resource: p[1],
					Action:   p[2],
				}
			})

			return role
		})

		return roles
	})
}
