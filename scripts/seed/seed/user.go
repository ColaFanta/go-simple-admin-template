package seed

import (
	"fantacode/ecomm/internal/biz/dao/model"

	. "github.com/colafanta/go-opera"
	"github.com/samber/lo"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Users(db *gorm.DB) Result[Unit] {
	return Do(func() Unit {
		un := "productadmin01"
		pw := "password01"
		data := model.Account{
			PreferredUsername: &un,
			Email:             lo.ToPtr(un + "@example.com"),
			EmailVerified:     lo.ToPtr(true),
			Password: lo.ToPtr(
				string(Must(bcrypt.GenerateFromPassword([]byte(pw), 16))),
			),
			Admin: &model.Admin{
				Role: "role::product_admin",
			},
		}

		MustPass(
			db.Transaction(func(tx *gorm.DB) error {
				return tx.
					Session(&gorm.Session{FullSaveAssociations: true}).
					Create(&data).
					Error
			}),
		)
		return U
	})
}
