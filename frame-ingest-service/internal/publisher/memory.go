package publisher

import (
	"sync"

	"frame-ingest-service/internal/service"
)

type MemoryPublisher struct {
	mu     sync.Mutex
	frames []service.IngestedFrame
}

func NewMemoryPublisher() *MemoryPublisher {
	return &MemoryPublisher{frames: make([]service.IngestedFrame, 0)}
}

func (p *MemoryPublisher) PublishFrame(frame service.IngestedFrame) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.frames = append(p.frames, frame)
	return nil
}

func (p *MemoryPublisher) Health() error {
	return nil
}

func (p *MemoryPublisher) Close() error {
	return nil
}

func (p *MemoryPublisher) Snapshot() []service.IngestedFrame {
	p.mu.Lock()
	defer p.mu.Unlock()

	result := make([]service.IngestedFrame, len(p.frames))
	copy(result, p.frames)
	return result
}
