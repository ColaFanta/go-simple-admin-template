package auth

import (
	"fantacode/ecomm/internal/platform/config"
	"time"

	opera "github.com/colafanta/go-opera"
	"github.com/go-pkgz/auth/v2"
	"github.com/go-pkgz/auth/v2/token"
	"github.com/go-playground/validator/v10"
	"github.com/samber/do/v2"
	"gorm.io/gorm"
)

type AuthServiceOpts struct {
	SecretKey      string `validate:"required"`
	Issuer         string
	URL            string
	TokenDuration  opera.Option[int] // in hours
	CookieDuration opera.Option[int] // in hours
	db             *gorm.DB          `validate:"required"`
}

func NewAuthService(opts AuthServiceOpts) *auth.Service {
	validate := validator.New()
	opera.MustPass(validate.Struct(opts))
	options := auth.Opts{
		SecretReader: token.SecretFunc(func(string) (string, error) { // secret key for JWT
			return opts.SecretKey, nil
		}),
		TokenDuration: time.Hour * time.Duration(
			opts.TokenDuration.Or(2),
		), // token expires in 1 hour
		CookieDuration: time.Hour * time.Duration(
			opts.CookieDuration.Or(168),
		), // cookie expires in 7 days and will enforce re-login
		DisableXSRF: true,
		Issuer:      opts.Issuer,
		URL:         opts.URL,
		Validator: token.ValidatorFunc(func(token string, claims token.Claims) bool {
			// allow only if user info is present in claims
			return claims.User != nil
		}),
		ClaimsUpd: token.ClaimsUpdFunc(passwordClaimsUpd(opts.db)),
	}
	service := auth.NewService(options)

	service.AddDirectProvider(passwordCredProviderName, passwordCredChecker(opts.db))

	return service
}

func NewAuthServiceDI(i do.Injector) (*auth.Service, error) {
	return opera.Do(func() *auth.Service {
		envVar := do.MustInvoke[envvar.EnvVar](i)
		db := do.MustInvoke[*gorm.DB](i)
		opts := AuthServiceOpts{
			opera.MaybeEmpty(envVar.AuthSecret).Yield(),
			opera.MaybeEmpty(envVar.AuthIssuer).Yield(),
			opera.MaybeEmpty(envVar.AuthUrl).Yield(),
			opera.MaybeEmpty(envVar.AuthTokenDuration),
			opera.MaybeEmpty(envVar.AuthCookieDuration),
			db,
		}
		return NewAuthService(opts)
	}).Get()
}

var ProvideDeps = do.Package(
	do.Lazy(NewAuthServiceDI),
)
