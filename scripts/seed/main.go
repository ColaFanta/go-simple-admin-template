package main

import (
	"fantacode/ecomm/scripts/seed/seed"

	. "fantacode/ecomm/scripts/migrationdb"
)

func main() {
	if err := seed.Users(DB).Err(); err != nil {
		panic(err)
	}
	if err := seed.Products(DB).Err(); err != nil {
		panic(err)
	}
}
