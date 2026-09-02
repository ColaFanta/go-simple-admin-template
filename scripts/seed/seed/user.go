package seed

import (
	"fantacode/ecomm/internal/app/module/dao/model"

	opera "github.com/colafanta/go-opera"
	"github.com/samber/lo"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Users(db *gorm.DB) opera.Result[opera.Unit] {
	return opera.Do(func() opera.Unit {
		un := "productadmin01"
		pw := "password01"
		data := model.Account{
			PreferredUsername: &un,
			Email:             lo.ToPtr(un + "@example.com"),
			EmailVerified:     lo.ToPtr(true),
			Password: lo.ToPtr(
				string(opera.Must(bcrypt.GenerateFromPassword([]byte(pw), 16))),
			),
			Admin: &model.Admin{
				Role: "role::product_admin",
			},
		}

		opera.MustPass(
			db.Transaction(func(tx *gorm.DB) error {
				return tx.
					Session(&gorm.Session{FullSaveAssociations: true}).
					Create(&data).
					Error
			}),
		)
		return opera.U
	})
}
