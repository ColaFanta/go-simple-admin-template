package seed

import (
	. "github.com/colafanta/go-opera"
	"gorm.io/gorm"
)

// Products seeds Apple products (iPhone/Mac/MacBook) in one shot.
// It relies on GORM association inserts (FullSaveAssociations) to persist
// variants -> skus -> prices/inventory.
func Products(db *gorm.DB) Result[Unit] {
	return Do(func() Unit {
		products := AppleProducts()
		MustPass(
			db.Transaction(func(tx *gorm.DB) error {
				return tx.
					Session(&gorm.Session{FullSaveAssociations: true}).
					Create(&products).
					Error
			}),
		)
		return U
	})
}
