package gormq

//go:generate go tool go-enum --noprefix --prefix CrudOp

/*
ENUM(
and
or
)
*/
type ComposeOperator string

/*
ENUM(
eq
ne
lt
gt
lte
gte
in
nin
ina
nina
contains
ncontains
containss
ncontainss
between
nbetween
null
nnull
startswith
nstartswith
startswiths
nstartswiths
endswith
nendswith
endswiths
nendswiths
tsmatch
)
*/
type FieldOperator string
