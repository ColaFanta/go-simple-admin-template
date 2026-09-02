package goose

import (
	"context"
	"database/sql"
	"fmt"

	"fantacode/ecomm/internal/app/module/dao/model"
	"fantacode/ecomm/internal/platform/config"
	. "fantacode/ecomm/scripts/migrationdb"

	opera "github.com/colafanta/go-opera"
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
			return opera.Do(func() opera.Unit {
				opera.MustPass(
					tx.Migrator().CreateTable(initTables...))
				un := "superadmin01"
				pw := "password01"
				acc := model.Account{
					PreferredUsername: &un,
					Email:             lo.ToPtr(un + "@example.com"),
					EmailVerified:     lo.ToPtr(true),
					Password: lo.ToPtr(
						string(opera.Must(bcrypt.GenerateFromPassword([]byte(pw), 16))),
					),
				}
				opera.MustPass(
					gorm.G[model.Account](tx).Create(ctx, &acc))
				admin := model.Admin{
					AccountSub: acc.Sub,
					Role:       "role::root",
				}
				opera.MustPass(
					gorm.G[model.Admin](tx).Create(ctx, &admin))

				return opera.U
			}).Err()
		})
}

func downInit(_ context.Context, _ *sql.Tx) error {
	return DB.Transaction(
		func(tx *gorm.DB) error {
			return opera.Do(func() opera.Unit {
				opera.MustPass(tx.Migrator().DropTable(initTables...))
				dbschema := do.MustInvoke[envvar.EnvVar](Container).DatabaseSchema
				opera.MustPass(tx.Migrator().DropTable(fmt.Sprintf(`"%s"."rbac_rules"`, dbschema)))
				return opera.U
			}).Err()
		})
}
