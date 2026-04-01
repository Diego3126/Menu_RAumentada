package publisher

import (
	"fmt"

	"github.com/nats-io/nats.go"

	"frame-ingest-service/internal/config"
	"frame-ingest-service/internal/service"
)

type NatsPublisher struct {
	conn    *nats.Conn
	subject string
}

func New(cfg config.Config) (service.FramePublisher, func() error, error) {
	if cfg.NATSURL == "" {
		memory := NewMemoryPublisher()
		return memory, memory.Close, nil
	}

	conn, err := nats.Connect(cfg.NATSURL)
	if err != nil {
		return nil, nil, fmt.Errorf("no se pudo conectar a NATS: %w", err)
	}

	pub := &NatsPublisher{conn: conn, subject: cfg.NATSSubject}
	return pub, conn.Drain, nil
}

func (p *NatsPublisher) PublishFrame(frame service.IngestedFrame) error {
	payload, err := service.EncodeFrameForBus(frame, p.subject)
	if err != nil {
		return err
	}
	return p.conn.Publish(p.subject, payload)
}

func (p *NatsPublisher) Health() error {
	if !p.conn.IsConnected() {
		return fmt.Errorf("nats no disponible")
	}
	return nil
}

func (p *NatsPublisher) Close() error {
	p.conn.Close()
	return nil
}
