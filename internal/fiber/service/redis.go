package service

import (
	"context"

	"github.com/gofiber/fiber/v3"
	"github.com/redis/go-redis/v9"
)

const KeyRedisService = "service.RedisService"

type RedisService struct {
	Client *redis.Client
}

func (s *RedisService) String() string {
	return KeyRedisService
}

func (s *RedisService) Start(ctx context.Context) error {
	return nil
}

func (s *RedisService) State(ctx context.Context) (string, error) {
	return s.Client.Ping(ctx).Result()
}

func (s *RedisService) Terminate(ctx context.Context) error {
	return nil
}

var _ fiber.Service = (*RedisService)(nil)
