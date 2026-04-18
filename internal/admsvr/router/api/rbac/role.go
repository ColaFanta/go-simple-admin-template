package rbac

import (
	"fantacode/ecomm/internal/biz/rbac"
	"fantacode/ecomm/internal/fiber/service"
	"net/url"
	"strings"

	. "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"github.com/samber/lo"
)

type upsertRolePayload struct {
	Name        string   `form:"name"        validate:"required"`
	Permissions []string `form:"permissions" validate:"omitempty,dive,required"`
}

// upsertRole creates or updates a role.
//
//	@Summary	Upsert role
//	@Tags		RBAC
//	@Accept		x-www-form-urlencoded
//	@Param		name		formData	string		true	"Role name"
//	@Param		permissions	formData	[]string	false	"Permission names"	collectionFormat(multi)
//	@Success	204
//	@Router		/api/roles [put]
func upsertRole(c fiber.Ctx) error {
	return Do(func() Unit {
		var payload upsertRolePayload
		MustPass(c.Bind().Form(&payload))

		if !strings.HasPrefix(payload.Name, "role::") {
			payload.Name = "role::" + payload.Name
		}

		ef := fiber.MustGetService[*service.RbacService](
			c.App().State(),
			service.KeyRbacService,
		).Enforcer

		gs := Must(ef.GetRolesForUser(payload.Name))

		lo.ForEach(gs, func(g string, _ int) {
			ef.DeleteRolesForUser(payload.Name)
		})

		allp := Must(ef.GetAllSubjects())

		lo.ForEach(payload.Permissions, func(perm string, _ int) {
			if lo.Contains(allp, perm) {
				Must(ef.AddRoleForUser(payload.Name, perm))
			}
		})

		return U
	}).Err()
}

type getRoleDetailPayload struct {
	RoleName string `uri:"name" validate:"required"`
}

// deleteRole deletes a role.
//
//	@Summary	Delete role
//	@Tags		RBAC
//	@Param		name	path	string	true	"Role name (URL-escaped)"
//	@Success	204
//	@Router		/api/roles/{name} [delete]
func deleteRole(c fiber.Ctx) error {
	return Do(func() Unit {
		var payload getRoleDetailPayload
		MustPass(c.Bind().URI(&payload))
		payload.RoleName = Must(url.PathUnescape(payload.RoleName))

		ef := fiber.MustGetService[*service.RbacService](
			c.App().State(),
			service.KeyRbacService,
		).Enforcer

		// delete g
		Must(ef.DeleteRole(payload.RoleName))

		return U
	}).Err()
}

type _roleTableDataKey int

const roleTableDataKey _roleTableDataKey = 0

// getRoleTableData lists roles (optionally filtered by q).
//
//	@Summary	List roles
//	@Tags		RBAC
//	@Produce	json
//	@Param		q	query	string	false	"Filter by role name substring"
//	@Success	200	{array}	rbac.Role
//	@Router		/api/roles [get]
//	@Security	CookieAuth
func getRoleTableData(c fiber.Ctx) error {
	return Do(func() Unit {
		ef := fiber.MustGetService[*service.RbacService](
			c.App().State(),
			service.KeyRbacService,
		).Enforcer

		MustPass(ef.LoadPolicy())

		roles := rbac.GetAllRoles(ef).Yield()

		q := c.Query("q")
		if q != "" {
			roles = lo.Filter(roles, func(role rbac.Role, _ int) bool {
				return strings.Contains(role.Name, q)
			})
		}

		fiber.Locals(c, roleTableDataKey, roles)
		MustPass(c.Next())

		return U
	}).Err()
}

type _roleDetailDataKey string

const roleDetailDataKey _roleDetailDataKey = "_roleDetailDataKey"

// getRoleDetailData gets a role with its permissions.
//
//	@Summary	Get role detail
//	@Tags		RBAC
//	@Produce	json
//	@Param		name	path		string	true	"Role name (URL-escaped)"
//	@Success	200		{object}	rbac.Role
//	@Router		/api/roles/{name} [get]
//	@Security	CookieAuth
func getRoleDetailData(c fiber.Ctx) error {
	return Do(func() Unit {
		var payload getRoleDetailPayload
		MustPass(c.Bind().URI(&payload))
		payload.RoleName = Must(url.PathUnescape(payload.RoleName))

		ef := fiber.MustGetService[*service.RbacService](
			c.App().State(),
			service.KeyRbacService,
		).Enforcer

		role := rbac.Role{
			Name: payload.RoleName,
			Permissions: lo.Map(
				Must(ef.GetImplicitPermissionsForUser(payload.RoleName)),
				func(p []string, _ int) rbac.Permission {
					return rbac.Permission{
						Name:     p[0],
						Resource: p[1],
						Action:   p[2],
					}
				},
			),
		}

		fiber.Locals(c, roleDetailDataKey, role)

		return U
	}).Err()
}
