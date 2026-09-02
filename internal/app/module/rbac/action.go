package rbac

//go:generate go tool go-enum

// ENUM(create, read, update, delete)
type Action string
