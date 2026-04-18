package migrationdb

import (
	"database/sql"
	"fantacode/ecomm/internal/envvar"
	"fantacode/ecomm/internal/gorm/gorm_db"

	. "github.com/colafanta/go-opera"
	"github.com/joho/godotenv"
	"github.com/pressly/goose/v3"
	"github.com/samber/do/v2"
	"gorm.io/gorm"
)

var DB *gorm.DB
var SqlDb *sql.DB
var ScriptsDir = "./scripts/goose"
var Container = do.New()

func Init() Unit {
	godotenv.Load()

	envvar.ProvideDeps(Container)
	gorm_db.ProvideDeps(Container)

	DB = do.MustInvoke[*gorm.DB](Container)
	SqlDb = Must(DB.DB())
	dbschema := do.MustInvoke[envvar.EnvVar](Container).DatabaseSchema

	goose.SetTableName(dbschema + "." + "goose_db_version")
	MustPass(DB.Exec(`CREATE SCHEMA IF NOT EXISTS "` + dbschema + `"`).Error)
	return U
}

var _ = Init()
