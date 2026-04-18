package goose

import (
	"context"
	"database/sql"
	"fmt"

	"fantacode/ecomm/internal/biz/dao/model"
	"fantacode/ecomm/internal/envvar"
	. "fantacode/ecomm/scripts/migrationdb"

	. "github.com/colafanta/go-opera"
	"github.com/pressly/goose/v3"
	"github.com/samber/do/v2"
	"github.com/samber/lo"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func init() {
	goose.AddMigrationContext(upInit, downInit)
}

var initTables = []any{
	// Account
	&model.Account{},
	&model.SocialAccount{},

	// User
	&model.Admin{},
	&model.Customer{},

	// Product
	&model.Product{},
	&model.Sku{},
	&model.SkuSpecPhone{},
	&model.SkuSpecPc{},
	&model.SkuPrice{},
	&model.Inventory{},
}

func upInit(ctx context.Context, _ *sql.Tx) error {
	return DB.Transaction(
		func(tx *gorm.DB) error {
			return Do(func() Unit {
				MustPass(
					tx.Migrator().CreateTable(initTables...))
				un := "superadmin01"
				pw := "password01"
				acc := model.Account{
					PreferredUsername: &un,
					Email:             lo.ToPtr(un + "@example.com"),
					EmailVerified:     lo.ToPtr(true),
					Password: lo.ToPtr(
						string(Must(bcrypt.GenerateFromPassword([]byte(pw), 16))),
					),
				}
				MustPass(
					gorm.G[model.Account](tx).Create(ctx, &acc))
				admin := model.Admin{
					AccountSub: acc.Sub,
					Role:       "role::root",
				}
				MustPass(
					gorm.G[model.Admin](tx).Create(ctx, &admin))

				return U
			}).Err()
		})
}

func downInit(_ context.Context, _ *sql.Tx) error {
	return DB.Transaction(
		func(tx *gorm.DB) error {
			return Do(func() Unit {
				MustPass(tx.Migrator().DropTable(initTables...))
				dbschema := do.MustInvoke[envvar.EnvVar](Container).DatabaseSchema
				MustPass(tx.Migrator().DropTable(fmt.Sprintf(`"%s"."rbac_rules"`, dbschema)))
				return U
			}).Err()
		})
}
