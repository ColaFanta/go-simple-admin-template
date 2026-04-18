package main

import (
	"fantacode/ecomm/internal/admsvr/router"
	"fantacode/ecomm/internal/admsvr/ui/utils"
	"fantacode/ecomm/internal/biz/auth"
	"fantacode/ecomm/internal/biz/l10n"
	"fantacode/ecomm/internal/biz/rbac"
	"fantacode/ecomm/internal/envvar"
	"fantacode/ecomm/internal/gorm/gorm_db"

	"github.com/joho/godotenv"
	"github.com/samber/do/v2"
)

func main() {
	rootScope := do.New()
	godotenv.Load()

	envvar.ProvideDeps(rootScope)
	gorm_db.ProvideDeps(rootScope)
	// redis_client.ProvideDeps(rootScope)
	auth.ProvideDeps(rootScope)
	rbac.ProvideDeps(rootScope)
	l10n.ProvideDeps(rootScope)

	app := router.New(rootScope)

	envVar := do.MustInvoke[envvar.EnvVar](rootScope)

	utils.UseUnminifiedScripts = envvar.Debug

	app.Listen(envVar.AppUrl)
}
