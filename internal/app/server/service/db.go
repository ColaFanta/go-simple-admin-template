package service

import (
	"context"

	opera "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type DatabaseService struct {
	DB *gorm.DB
}

const KeyDatabaseService = "service.DatabaseService"

func (s *DatabaseService) String() string                  { return KeyDatabaseService }
func (s *DatabaseService) Start(ctx context.Context) error { return nil }
func (s *DatabaseService) State(ctx context.Context) (string, error) {
	return opera.Do(func() string {
		db := opera.Must(s.DB.DB())
		opera.MustPass(db.Ping())
		return "ok"
	}).Get()
}
func (s *DatabaseService) Terminate(ctx context.Context) error { return nil }

var _ fiber.Service = (*DatabaseService)(nil)
