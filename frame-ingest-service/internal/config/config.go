package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Host          string
	Port          int
	MaxFrameBytes int64
	NATSURL       string
	NATSSubject   string
	CORSOrigins   []string
}

func Load() Config {
	return Config{
		Host:          getEnv("HOST", "0.0.0.0"),
		Port:          getEnvInt("PORT", 5301),
		MaxFrameBytes: getEnvInt64("MAX_FRAME_BYTES", 8*1024*1024),
		NATSURL:       getEnv("NATS_URL", ""),
		NATSSubject:   getEnv("NATS_SUBJECT", "frames.raw"),
		CORSOrigins:   splitCSV(getEnv("CORS_ORIGINS", "*")),
	}
}

func (c Config) ListenAddr() string {
	return c.Host + ":" + strconv.Itoa(c.Port)
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func getEnvInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getEnvInt64(key string, fallback int64) int64 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	if len(origins) == 0 {
		return []string{"*"}
	}
	return origins
}
