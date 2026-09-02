package user

import (
	"fantacode/ecomm/internal/app/module/dao/gen"
	"fantacode/ecomm/internal/app/module/dao/model"
	"fantacode/ecomm/internal/app/module/rbac"
	"fantacode/ecomm/internal/app/server/query/gormq"
	"fantacode/ecomm/internal/app/server/service"

	opera "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type _UserTableDataKey int

const keyUserTableData _UserTableDataKey = 0

type getUserTableDataParams struct {
	gormq.GetListParams

	Q     string   `query:"search" validate:"omitempty"`
	Roles []string `query:"roles"  validate:"omitempty,dive,required"`
}

// getUserTableData lists users with pagination and filtering.
//
//	@Summary	List users
//	@Tags		System Admin
//	@Produce	json
//	@Param		roles	query		[]string	false	"Filter users by role"	collectionFormat(multi)
//	@Param		search	query		string		false	"Search query for username or email"
//	@Param		_page	query		int			false	"Page number (1-based)"		default(1)
//	@Param		_size	query		int			false	"Page size"					default(10)
//	@Param		_sort	query		[]string	false	"Sort fields"				collectionFormat(multi)
//	@Param		_order	query		[]string	false	"Sort direction per _sort"	collectionFormat(multi)	Enums(asc,desc)
//	@Success	200		{object}	gormq.GetListResponse[model.Account]
//	@Router		/api/users [get]
//	@Security	CookieAuth
func getUserTableData(c fiber.Ctx) error {
	return opera.Do(func() opera.Unit {
		p := new(getUserTableDataParams)
		opera.MustPass(c.Bind().All(p))

		db := opera.MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		q := gorm.G[model.Account](db).Where(nil)

		if v, ok := opera.MaybeEmpty(p.Q).Get(); ok {
			q = q.Where(
				gormq.FieldFilter{
					Field:    gen.Account.Q.Column().Name,
					Operator: gormq.CrudOpTsmatch,
					Value:    v,
				}.ToExpression(),
			)
		}
		q = q.Joins(
			clause.JoinTarget{Association: gen.Account.Admin.Name()},
			func(db gorm.JoinBuilder, joinTable, curTable clause.Table) error {
				if v, ok := opera.MaybeEmpty(p.Roles).Get(); ok {
					db.Where(gen.Admin.Role.In(v...))
				}
				return nil
			})

		list := gormq.ExecGetList(c, q, p.GetListParams).Yield()
		fiber.Locals(c, keyUserTableData, list)

		opera.MustPass(c.Next())

		return opera.U
	}).Err()
}

type _UserDetailDataKey string

const userDetailDataKey _UserDetailDataKey = "userDetailData"

type UserDetailResponse struct {
	Data model.Account `json:"data"`
}

// getUserDetailData returns a single user record.
//
//	@Summary	Get user detail
//	@Tags		Users
//	@Produce	json
//	@Param		id	path		string	true	"User ID (UUID)"
//	@Success	200	{object}	model.Account
//	@Router		/api/users/{id} [get]
//	@Security	CookieAuth
func getUserDetailData(c fiber.Ctx) error {
	return opera.Do(func() opera.Unit {
		var payload gormq.IDPathParam
		opera.MustPass(c.Bind().URI(&payload))

		db := opera.MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		user := opera.Must(
			gorm.G[model.Account](db).
				Where(gen.Account.Sub.Eq(opera.Must(uuid.Parse(payload.ID)))).
				Joins(clause.JoinTarget{Association: gen.Account.Admin.Name()}, nil).
				First(c),
		)

		fiber.Locals(c, userDetailDataKey, user)
		opera.MustPass(c.Next())

		return opera.U
	}).Err()
}

type _UpsertUserPayload struct {
	Sub         uuid.UUID `form:"sub"          validate:"omitempty,uuid"`
	Username    string    `form:"username"     validate:"min=5,max=30,alphanum"`
	Email       string    `form:"email"        validate:"required,email"`
	Password    string    `form:"password"     validate:"min=8,alphanum"`
	PhoneNumber string    `form:"phone_number" validate:"omitempty,e164"`
	Role        string    `form:"role"         validate:"required"`
}

// upsertUser creates or updates a user.
//
//	@Summary	Upsert user
//	@Tags		Users
//	@Accept		x-www-form-urlencoded
//	@Param		sub				formData	string	false	"User UUID (empty to create)"
//	@Param		username		formData	string	false	"Username"
//	@Param		email			formData	string	true	"Email"
//	@Param		password		formData	string	false	"Password"
//	@Param		phone_number	formData	string	false	"Phone number (E.164)"
//	@Param		role			formData	string	true	"Role"
//	@Success	204
//	@Router		/api/users [put]
//	@Security	CookieAuth
func upsertUser(c fiber.Ctx) error {
	return opera.Do(func() opera.Unit {
		var payload _UpsertUserPayload
		opera.MustPass(c.Bind().Form(&payload))
		db := opera.MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		acc := model.Account{
			Sub:               payload.Sub,
			PreferredUsername: &payload.Username,
			Email:             &payload.Email,
			Password:          &payload.Password,
			PhoneNumber:       opera.MaybeEmpty(payload.PhoneNumber).ToPointer(),
		}

		opera.MustPass(gorm.G[model.Account](db, clause.OnConflict{
			Columns: []clause.Column{{Name: gen.Account.Sub.Column().Name}},
			DoUpdates: clause.AssignmentColumns(
				[]string{
					gen.Account.PreferredUsername.Column().Name,
					gen.Account.Email.Column().Name,
					gen.Account.Password.Column().Name,
					gen.Account.PhoneNumber.Column().Name,
				},
			),
		}).Create(c, &acc))

		admin := model.Admin{
			AccountSub: acc.Sub,
			Role:       payload.Role,
		}
		opera.MustPass(gorm.G[model.Admin](db, clause.OnConflict{
			Columns: []clause.Column{{Name: gen.Admin.AccountSub.Column().Name}},
			DoUpdates: clause.AssignmentColumns(
				[]string{gen.Admin.Role.Column().Name},
			),
		}).Create(c, &admin))

		opera.MustPass(c.Next())
		return opera.U
	}).Err()
}

// deleteUser deletes a user.
//
//	@Summary	Delete user
//	@Tags		Users
//	@Success	204
//	@Param		id	path	string	true	"User ID (UUID)"
//	@Router		/api/users/{id} [delete]
//	@Security	CookieAuth
func deleteUser(c fiber.Ctx) error {
	return opera.Do(func() opera.Unit {
		var payload gormq.IDPathParam
		opera.MustPass(c.Bind().URI(&payload))

		db := opera.MustHave(
			fiber.GetService[*service.DatabaseService](
				c.App().State(),
				service.KeyDatabaseService,
			),
		).DB

		opera.Must(
			gorm.G[model.Account](db).
				Where(gen.Account.Sub.Eq(opera.Must(uuid.Parse(payload.ID)))).
				Delete(c),
		)

		opera.MustPass(c.Next())
		return opera.U
	}).Err()
}

func getAllRoles(c fiber.Ctx) opera.Result[[]rbac.Role] {
	return opera.Do(func() []rbac.Role {
		ef := fiber.MustGetService[*service.RbacService](
			c.App().State(),
			service.KeyRbacService,
		).Enforcer

		roles := rbac.GetAllRoles(ef).Yield()
		return roles
	})
}
