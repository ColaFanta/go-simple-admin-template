package service

import (
	"context"

	"github.com/gofiber/fiber/v3"
	"github.com/nicksnyder/go-i18n/v2/i18n"
)

type L10nService struct {
	Bundle *i18n.Bundle
}

const KeyL10nService = "service.L10nService"

func (s *L10nService) String() string {
	return KeyL10nService
}

func (s *L10nService) Start(ctx context.Context) error {
	return nil
}

func (s *L10nService) State(ctx context.Context) (string, error) {
	return "ok", nil
}

func (s *L10nService) Terminate(ctx context.Context) error {
	return nil
}

var _ fiber.Service = (*L10nService)(nil)
