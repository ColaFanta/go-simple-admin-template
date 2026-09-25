package assets

import (
	"embed"
)

//go:embed css/* js/* image/*
var Assets embed.FS

//go:embed favicon.ico
var Favicon string
