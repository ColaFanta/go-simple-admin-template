package main

import (
	. "github.com/colafanta/go-opera"
	"github.com/pressly/goose/v3"

	_ "fantacode/ecomm/scripts/goose"
	. "fantacode/ecomm/scripts/migrationdb"
)

func main() {
	MustPass(goose.Status(SqlDb, ScriptsDir))
}
