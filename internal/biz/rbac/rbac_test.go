package rbac

import (
	"testing"

	"github.com/casbin/casbin/v3"
	"github.com/casbin/casbin/v3/model"
)

func TestRbacManualCheck(t *testing.T) {
	// Model from model.conf
	text := `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && (r.obj == p.obj || p.obj == "*") && (r.act == p.act || p.act == "*")
`

	m, err := model.NewModelFromString(text)
	if err != nil {
		t.Fatal(err)
	}

	e, err := casbin.NewEnforcer(m)
	if err != nil {
		t.Fatal(err)
	}

	// Setup policies similar to what we have in DB
	// p, perm::read_product, product, read
	_, err = e.AddPolicy("perm::read_product", string(ResourceProduct), string(ActionRead))
	if err != nil {
		t.Fatal(err)
	}

	// g, role::product_admin, perm::read_product
	_, err = e.AddGroupingPolicy("role::product_admin", "perm::read_product")
	if err != nil {
		t.Fatal(err)
	}

	// Test Case 1: Product Admin Read Product
	sub := "role::product_admin"
	obj := ResourceProduct
	act := ActionRead

	// IMPORTANT: Must cast custom types to strings for Casbin to match correctly against string policies
	ok, err := e.Enforce(sub, string(obj), string(act))
	if err != nil {
		t.Fatal(err)
	}

	if !ok {
		t.Errorf("Expected allow for %s accessing %s via %s", sub, obj, act)
	}
}
