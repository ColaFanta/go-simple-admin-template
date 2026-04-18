package service

import (
	"context"
	"errors"

	. "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"github.com/samber/do/v2"
	"github.com/samber/lo"
)

type DepsService struct {
	Deps do.Injector
}

const KeyDepsService = "service.DepsService"

func (s *DepsService) String() string {
	return KeyDepsService
}

func (s *DepsService) Start(ctx context.Context) error {
	return nil
}

func (s *DepsService) State(ctx context.Context) (string, error) {
	return Do(func() string {
		status := s.Deps.HealthCheckWithContext(ctx)
		success := "ok"
		if len(status) == 0 {
			return success
		}

		errs := lo.MapToSlice(status, func(k string, v error) error {
			return v
		})
		err := lo.Reduce(errs, func(agg error, item error, _ int) error {
			return errors.Join(agg, item)
		}, errs[0])
		MustPass(err)

		return success

	}).Get()
}

func (s *DepsService) Terminate(ctx context.Context) error {
	return nil
}

var _ fiber.Service = (*DepsService)(nil)
