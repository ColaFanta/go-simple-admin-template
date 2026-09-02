package hx_utils

import (
	"github.com/gofiber/fiber/v3"
)

const (
	HxRequestHeaderBoosted               HxRequestHeaderKey = "HX-Boosted"
	HxRequestHeaderCurrentURL            HxRequestHeaderKey = "HX-Current-URL"
	HxRequestHeaderHistoryRestoreRequest HxRequestHeaderKey = "HX-History-Restore-Request"
	HxRequestHeaderPrompt                HxRequestHeaderKey = "HX-Prompt"
	HxRequestHeaderRequest               HxRequestHeaderKey = "HX-Request"
	HxRequestHeaderTarget                HxRequestHeaderKey = "HX-Target"
	HxRequestHeaderTriggerName           HxRequestHeaderKey = "HX-Trigger-Name"
	HxRequestHeaderTrigger               HxRequestHeaderKey = "HX-Trigger"
)

type (
	HxRequestHeaderKey string

	HxRequestHeader struct {
		HxBoosted               bool
		HxCurrentURL            string
		HxHistoryRestoreRequest bool
		HxPrompt                string
		HxRequest               bool
		HxTarget                string
		HxTriggerName           string
		HxTrigger               string
	}
)

func HxRequestHeaderFromRequest(c fiber.Ctx) HxRequestHeader {
	return HxRequestHeader{
		HxBoosted:    HxStrToBool(c.Get(HxRequestHeaderBoosted.String())),
		HxCurrentURL: c.Get(HxRequestHeaderCurrentURL.String()),
		HxHistoryRestoreRequest: HxStrToBool(
			c.Get(HxRequestHeaderHistoryRestoreRequest.String()),
		),
		HxPrompt:      c.Get(HxRequestHeaderPrompt.String()),
		HxRequest:     HxStrToBool(c.Get(HxRequestHeaderRequest.String())),
		HxTarget:      c.Get(HxRequestHeaderTarget.String()),
		HxTriggerName: c.Get(HxRequestHeaderTriggerName.String()),
		HxTrigger:     c.Get(HxRequestHeaderTrigger.String()),
	}
}

func (x HxRequestHeaderKey) String() string {
	return string(x)
}
