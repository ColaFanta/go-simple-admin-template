package service

import (
	"context"
	"errors"

	opera "github.com/colafanta/go-opera"
	"github.com/gofiber/fiber/v3"
	"github.com/samber/do/v2"
	"github.com/samber/lo"
)

type DepsService struct {
	Deps do.Injector
}

const KeyDepsService = "service.DepsService"

func (s *DepsService) String() string                  { return KeyDepsService }
func (s *DepsService) Start(ctx context.Context) error { return nil }
func (s *DepsService) State(ctx context.Context) (string, error) {
	return opera.Do(func() string {
		status := s.Deps.HealthCheckWithContext(ctx)
		if len(status) == 0 {
			return "ok"
		}
		errs := lo.MapToSlice(status, func(k string, v error) error { return v })
		opera.MustPass(lo.Reduce(errs, func(agg error, item error, _ int) error {
			return errors.Join(agg, item)
		}, errs[0]))
		return "ok"
	}).Get()
}
func (s *DepsService) Terminate(ctx context.Context) error { return nil }

var _ fiber.Service = (*DepsService)(nil)
