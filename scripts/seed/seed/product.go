package seed

import (
	opera "github.com/colafanta/go-opera"
	"gorm.io/gorm"
)

// Products seeds Apple products (iPhone/Mac/MacBook) in one shot.
// It relies on GORM association inserts (FullSaveAssociations) to persist
// variants -> skus -> prices/inventory.
func Products(db *gorm.DB) opera.Result[opera.Unit] {
	return opera.Do(func() opera.Unit {
		products := AppleProducts()
		opera.MustPass(
			db.Transaction(func(tx *gorm.DB) error {
				return tx.
					Session(&gorm.Session{FullSaveAssociations: true}).
					Create(&products).
					Error
			}),
		)
		return opera.U
	})
}
