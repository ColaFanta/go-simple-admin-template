package gorm_db

import (
	"fantacode/ecomm/internal/envvar"

	"github.com/samber/do/v2"
	"github.com/samber/lo"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

func NewGormDb(dsn string, dbschema string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			TablePrefix: dbschema + ".",
		},
		Logger: lo.Ternary(envvar.Debug, logger.Default.LogMode(logger.Info), logger.Default),
	})
	return db, err
}

func NewGormDbDI(i do.Injector) (*gorm.DB, error) {
	dsn := do.MustInvoke[envvar.EnvVar](i).DatabaseDsn
	dbschema := do.MustInvoke[envvar.EnvVar](i).DatabaseSchema
	return NewGormDb(dsn, dbschema)
}

var ProvideDeps = do.Package(
	do.Lazy(NewGormDbDI),
)
