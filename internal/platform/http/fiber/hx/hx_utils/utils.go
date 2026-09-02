package hx_utils

import (
	"strings"

	"github.com/gofiber/fiber/v3"
)

// IsHxRequest returns true if the request is a htmx request.
func IsHxRequest(c fiber.Ctx) bool {
	return HxStrToBool(c.Get(HxRequestHeaderRequest.String()))
}

// IsHxBoosted returns true if the request is a htmx request and the request is boosted
func IsHxBoosted(c fiber.Ctx) bool {
	return HxStrToBool(c.Get(HxRequestHeaderBoosted.String()))
}

// IsHxBoostedForm returns true if the request is a htmx request and the request is boosted via query parameter
func IsHxBoostedForm(c fiber.Ctx) bool {
	return IsHxBoosted(c) &&
		(len(c.Queries()) > 0 || c.Method() == fiber.MethodPost)
}

// IsHxHistoryRestoreRequest returns true if the request is a htmx request and the request is a history restore request
func IsHxHistoryRestoreRequest(c fiber.Ctx) bool {
	return HxStrToBool(c.Get(HxRequestHeaderHistoryRestoreRequest.String()))
}

// RenderPartial returns true if the request is an HTMX request that is either boosted or a hx request,
// provided it is not a history restore request.
func RenderPartial(c fiber.Ctx) bool {
	return (IsHxRequest(c) || IsHxBoosted(c)) && !IsHxHistoryRestoreRequest(c)
}

// HxStrToBool converts a string to a boolean value.
func HxStrToBool(str string) bool {
	return strings.EqualFold(str, "true")
}

// HxBoolToStr converts a boolean value to a string.
func HxBoolToStr(b bool) string {
	if b {
		return "true"
	}

	return "false"
}

func IsHtmlRequest(c fiber.Ctx) bool {
	acceptHeader := c.Get("Accept")
	return IsHxRequest(c) || IsHxBoosted(c) || strings.Contains(acceptHeader, "text/html")
}
