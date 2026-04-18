package handler

import (
	"context"
	"io"

	"github.com/a-h/templ"
	. "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/gofiber/fiber/v3/middleware/adaptor"
	"github.com/samber/lo"
	"github.com/samber/lo/mutable"
)

type FiberTempl = func(fiber.Ctx) templ.Component

type _LayoutChainFunc = func(next templ.Component) templ.Component

func renderLayoutChain(chain []_LayoutChainFunc) templ.Component {
	if len(chain) == 0 {
		panic("renderChain: chain must have at least one component")
	}
	head := chain[0]
	rest := chain[1:]
	if len(rest) == 0 {
		return head(nil)
	}
	return head(renderLayoutChain(rest))
}

func RenderTempl(tmpl FiberTempl, layouts ...FiberTempl) fiber.Handler {
	return func(c fiber.Ctx) error {
		handlers := make([]templ.Component, 0, len(layouts)+1)
		handlers = append(handlers, tmpl(c))
		for _, layout := range layouts {
			handlers = append(handlers, layout(c))
		}
		mutable.Reverse(handlers)

		chain := lo.Map(handlers, func(t templ.Component, _ int) _LayoutChainFunc {
			return func(next templ.Component) templ.Component {
				return templ.ComponentFunc(func(ctx context.Context, w io.Writer) error {
					return Do(func() Unit {
						if next != nil {
							ctx = templ.WithChildren(ctx, next)
						}
						MustPass(t.Render(ctx, w))
						return U
					}).
						TapErr(func(err error) { log.Error(err) }).
						Err()
				})
			}
		})

		finalComp := renderLayoutChain(chain)

		return adaptor.HTTPHandler(templ.Handler(finalComp))(c)
	}
}
