package rbac

import (
	_ "embed"
	"fantacode/ecomm/internal/platform/config"

	"github.com/casbin/casbin/v3"
	"github.com/casbin/casbin/v3/model"
	gormadapter "github.com/casbin/gorm-adapter/v3"
	opera "github.com/colafanta/go-opera"
	"github.com/samber/do/v2"
	"gorm.io/gorm"
)

//go:embed model.conf
var conf string

func NewEnforcer(db *gorm.DB, dbschema string) (*casbin.Enforcer, error) {
	return opera.Do(func() *casbin.Enforcer {
		adapter := opera.Must(gormadapter.NewAdapterByDBUseTableName(db, "", dbschema+".rbac_rules"))

		m := opera.Must(model.NewModelFromString(conf))

		e := opera.Must(casbin.NewEnforcer(m, adapter))

		opera.MustPass(e.LoadPolicy())

		opera.MustPass(addBuiltInPermissions(e))

		return e
	}).Get()
}

func NewEnforcerDI(i do.Injector) (*casbin.Enforcer, error) {
	db := do.MustInvoke[*gorm.DB](i)
	dbschema := do.MustInvoke[envvar.EnvVar](i).DatabaseSchema
	return NewEnforcer(db, dbschema)
}

var ProvideDeps = do.Package(
	do.Lazy(NewEnforcerDI),
)
