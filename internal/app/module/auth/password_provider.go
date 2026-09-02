package auth

import (
	"context"
	"fantacode/ecomm/internal/app/module/dao/gen"
	"fantacode/ecomm/internal/app/module/dao/model"
	"time"

	opera "github.com/colafanta/go-opera"
	"github.com/go-pkgz/auth/v2/provider"
	"github.com/go-pkgz/auth/v2/token"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const passwordCredProviderName = "unpw"

func passwordCredChecker(db *gorm.DB) provider.CredChecker {
	return provider.CredCheckerFunc(func(user, password string) (ok bool, err error) {
		return opera.Do(func() bool {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			acc := opera.Must(gorm.G[model.Account](db).Where(
				gen.Account.PreferredUsername.Eq(user)).First(ctx))

			pwd := opera.MaybeNilPtr(acc.Password).OrEmpty()
			opera.MustPass(
				bcrypt.CompareHashAndPassword([]byte(pwd), []byte(password)),
			)
			return true
		}).
			CatchIs(gorm.ErrRecordNotFound, false).
			CatchIs(bcrypt.ErrMismatchedHashAndPassword, false).
			Get()
	})
}

func passwordClaimsUpd(db *gorm.DB) token.ClaimsUpdFunc {
	return token.ClaimsUpdFunc(func(claims token.Claims) token.Claims {
		return opera.Do(func() token.Claims {
			user := opera.MaybeNilPtr(claims.User).Yield()
			name := user.Name
			opera.MustTrue(claims.AuthProvider.Name == passwordCredProviderName)
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			account := opera.Must(
				gorm.G[model.Account](db).
					Where(gen.Account.PreferredUsername.Eq(name)).
					Preload(gen.Account.Admin.Name(), nil).
					Preload(gen.Account.Customer.Name(), nil).
					First(ctx),
			)

			user.Email = opera.MaybeNilPtr(account.Email).OrEmpty()
			if admin := account.Admin; admin != nil {
				user.SetAdmin(true)
				user.Role = admin.Role
			}

			claims.User = &user
			claims.Subject = account.Sub.String()

			return claims
		}).Or(claims)
	})
}
