package service

import (
	"context"

	"github.com/casbin/casbin/v3"
	. "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
)

type RbacService struct {
	Enforcer *casbin.Enforcer
}

const KeyRbacService = "service.RbacService"

func (s *RbacService) String() string {
	return KeyRbacService
}

func (s *RbacService) Start(ctx context.Context) error {
	return nil
}

func (s *RbacService) State(ctx context.Context) (string, error) {
	return Do(func() string {
		MustPass(s.Enforcer.LoadPolicy())
		return "ok"
	}).Get()
}

func (s *RbacService) Terminate(ctx context.Context) error {
	return nil
}

var _ fiber.Service = (*RbacService)(nil)
