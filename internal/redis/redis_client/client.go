package redis_client

import (
	"fantacode/ecomm/internal/envvar"

	"github.com/redis/go-redis/v9"
	"github.com/samber/do/v2"
)

func NewRedisClient(url string) (*redis.Client, error) {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}
	return redis.NewClient(opt), nil
}

func NewRedisClientDI(i do.Injector) (*redis.Client, error) {
	url := do.MustInvoke[envvar.EnvVar](i).RedisUrl
	return NewRedisClient(url)
}

var ProvideDeps = do.Package(
	do.Lazy(NewRedisClientDI),
)
