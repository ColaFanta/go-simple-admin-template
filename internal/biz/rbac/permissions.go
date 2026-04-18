package rbac

import (
	"github.com/casbin/casbin/v3"
	. "github.com/colafanta/go-opera"
)

type Role struct {
	Name        string       `form:"name"        json:"name"        validate:"required"`
	Permissions []Permission `form:"permissions" json:"permissions" validate:"omitempty,dive,required"`
}

type Permission struct {
	Name     string `form:"name"     json:"name"     validate:"required"`
	Resource string `form:"resource" json:"resource" validate:"required"`
	Action   string `form:"action"   json:"action"   validate:"required"`
}

func addBuiltInPermissions(ef *casbin.Enforcer) error {
	return Do(func() Unit {
		MustPass(addRolePermissions(ef))
		MustPass(addCustomerPermissions(ef))
		MustPass(addProductPermissions(ef))

		Must(
			ef.AddRoleForUser("role::root", "perm::super_admin"),
		)
		Must(ef.AddRolesForUser("role::system_admin", []string{
			"perm::create_system",
			"perm::read_system",
			"perm::update_system",
			"perm::delete_system",
		}))
		Must(ef.AddRolesForUser("role::customer_admin", []string{
			"perm::create_customer",
			"perm::read_customer",
			"perm::update_customer",
			"perm::delete_customer",
		}))
		Must(ef.AddRolesForUser("role::product_admin", []string{
			"perm::create_product",
			"perm::read_product",
			"perm::update_product",
			"perm::delete_product",
		}))
		return U
	}).Err()

}

func addRolePermissions(ef *casbin.Enforcer) error {
	return Do(func() Unit {

		Must(
			ef.AddPermissionForUser(
				"perm::super_admin", "*", "*",
			),
		)

		Must(
			ef.AddPermissionForUser("perm::create_system",
				ResourceSystem.String(),
				ActionCreate.String(),
			),
		)
		Must(
			ef.AddPermissionForUser("perm::read_system",
				ResourceSystem.String(),
				ActionRead.String(),
			),
		)
		Must(
			ef.AddPermissionForUser("perm::update_system",
				ResourceSystem.String(),
				ActionUpdate.String(),
			),
		)
		Must(
			ef.AddPermissionForUser("perm::delete_system",
				ResourceSystem.String(),
				ActionDelete.String(),
			),
		)

		return U
	}).Err()
}

func addCustomerPermissions(ef *casbin.Enforcer) error {
	return Do(func() Unit {
		Must(
			ef.AddPermissionForUser("perm::create_customer",
				ResourceCustomer.String(),
				ActionCreate.String(),
			),
		)
		Must(
			ef.AddPermissionForUser("perm::read_customer",
				ResourceCustomer.String(),
				ActionRead.String(),
			),
		)
		Must(
			ef.AddPermissionForUser("perm::update_customer",
				ResourceCustomer.String(),
				ActionUpdate.String(),
			),
		)
		Must(
			ef.AddPermissionForUser("perm::delete_customer",
				ResourceCustomer.String(),
				ActionDelete.String(),
			),
		)

		return U
	}).Err()
}

func addProductPermissions(ef *casbin.Enforcer) error {
	return Do(func() Unit {
		Must(
			ef.AddPermissionForUser("perm::create_product",
				ResourceProduct.String(),
				ActionCreate.String(),
			),
		)
		Must(
			ef.AddPermissionForUser("perm::read_product",
				ResourceProduct.String(),
				ActionRead.String(),
			),
		)
		Must(
			ef.AddPermissionForUser("perm::update_product",
				ResourceProduct.String(),
				ActionUpdate.String(),
			),
		)
		Must(
			ef.AddPermissionForUser("perm::delete_product",
				ResourceProduct.String(),
				ActionDelete.String(),
			),
		)
		return U
	}).Err()
}
