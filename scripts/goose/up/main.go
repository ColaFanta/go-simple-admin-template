package main

import (
	opera "github.com/colafanta/go-opera"
	"github.com/pressly/goose/v3"

	_ "fantacode/ecomm/scripts/goose"
	. "fantacode/ecomm/scripts/migrationdb"
)

func main() {
	opera.MustPass(goose.Up(SqlDb, ScriptsDir, goose.WithAllowMissing()))
}
