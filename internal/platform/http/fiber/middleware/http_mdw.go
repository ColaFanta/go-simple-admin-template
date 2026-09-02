package middleware

import (
	"net/http"

	"github.com/gofiber/fiber/v3"
	"github.com/valyala/fasthttp/fasthttpadaptor"
)

func NewFromHttpMdw(
	hm func(http.Handler) http.Handler,
	ctxMapper func(r *http.Request, c fiber.Ctx) error,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if ctxMapper != nil {
				if err := ctxMapper(r, c); err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
			}
			if err := c.Next(); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			for k, v := range c.Response().Header.All() {
				w.Header().Add(string(k), string(v))
			}

			w.WriteHeader(c.Response().StatusCode())
			_, _ = w.Write(c.Response().Body())
		})
		fasthttpadaptor.
			NewFastHTTPHandler(hm(next))(c.RequestCtx())
		return nil
	}
}

func ChainHttpMdw(hm func(http.Handler) http.Handler, hms ...func(http.Handler) http.Handler) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		for i := len(hms) - 1; i >= 0; i-- {
			next = hms[i](next)
		}
		return hm(next)
	}
}
