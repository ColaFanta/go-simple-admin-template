package envvar

import (
	"github.com/caarlos0/env/v11"
	. "github.com/colafanta/go-opera"
	"github.com/samber/do/v2"
)

type EnvVar struct {
	AppUrl             string   `env:"APP_URL"               envDefault:":3000"`
	DatabaseDsn        string   `env:"DATABASE_DSN,required"`
	DatabaseSchema     string   `env:"DATABASE_SCHEMA"       envDefault:"biz"`
	RedisUrl           string   `env:"REDIS_URL"`
	Language           string   `env:"LANGUAGE"              envDefault:"zh"`
	AuthSecret         string   `env:"AUTH_SECRET,required"`
	AuthIssuer         string   `env:"AUTH_ISSUER,required"`
	AuthUrl            string   `env:"AUTH_URL,required"`
	AuthTokenDuration  int      `env:"AUTH_TOKEN_DURATION"   envDefault:"2"`
	AuthCookieDuration int      `env:"AUTH_COOKIE_DURATION"  envDefault:"168"`
	AuthWhiteList      []string `env:"AUTH_WHITE_LIST"`
}

func New() Result[EnvVar] {
	return Do(func() EnvVar {
		return Must(env.ParseAs[EnvVar]())
	})

}

func NewDI(do.Injector) (EnvVar, error) {
	return Do(func() EnvVar {
		envvar := New().Yield()
		return envvar
	}).Get()
}

var ProvideDeps = do.Package(
	do.Lazy(NewDI),
)
