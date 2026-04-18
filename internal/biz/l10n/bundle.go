package l10n

import (
	"embed"
	"fantacode/ecomm/internal/envvar"

	. "github.com/colafanta/go-opera"
	"github.com/goccy/go-yaml"
	"github.com/nicksnyder/go-i18n/v2/i18n"
	"github.com/samber/do/v2"
	"golang.org/x/text/language"
)

//go:embed translation/*.yaml
var fs embed.FS

func NewI18nBundleDI(i do.Injector) (*i18n.Bundle, error) {
	return Do(func() *i18n.Bundle {
		lang := Must(do.Invoke[envvar.EnvVar](i)).Language

		tag := Must(language.Parse(lang))

		bundle := i18n.NewBundle(tag)

		bundle.RegisterUnmarshalFunc("yml", yaml.Unmarshal)
		bundle.RegisterUnmarshalFunc("yaml", yaml.Unmarshal)

		dirn := "translation/"

		Must(bundle.LoadMessageFileFS(fs, dirn+"messages.en.yaml"))
		Must(bundle.LoadMessageFileFS(fs, dirn+"messages.zh.yaml"))
		Must(bundle.LoadMessageFileFS(fs, dirn+"messages.zh-Hant.yaml"))
		return bundle
	}).Get()
}

var ProvideDeps = do.Package(do.Lazy(NewI18nBundleDI))
