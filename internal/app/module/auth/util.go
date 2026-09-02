package auth

import (
	"fmt"

	opera "github.com/colafanta/go-opera"
	"github.com/go-pkgz/auth/v2/token"
	"github.com/gofiber/fiber/v3"
)

type _UserInfoKey string

const UserInfoKey _UserInfoKey = "userInfo"

func DeriveUserInfo(c fiber.Ctx) error {
	return opera.Do(func() opera.Unit {
		var userInfoO opera.Option[token.User]
		c.Request().VisitUserValuesAll(func(k any, v any) {
			if fmt.Sprintf("%T", k) == "token.contextKey" && fmt.Sprint(k) == "user" {
				userInfoO = opera.MayCast[token.User](v)
			}
		})
		userInfo := userInfoO.Yield()
		fiber.Locals(c, UserInfoKey, &userInfo)
		opera.MustPass(c.Next())
		return opera.U
	}).Err()
}
