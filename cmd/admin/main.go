package main

import (
	"fantacode/ecomm/internal/app/server/router"
	"fantacode/ecomm/internal/app/ui/utils"
	"fantacode/ecomm/internal/app/module/auth"
	"fantacode/ecomm/internal/app/module/l10n"
	"fantacode/ecomm/internal/app/module/rbac"
	"fantacode/ecomm/internal/platform/config"
	"fantacode/ecomm/internal/platform/database/gorm_db"

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
