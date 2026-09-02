package rbac

//go:generate go tool go-enum

/*
ENUM(
system
customer
product
)
*/
type Resource string
