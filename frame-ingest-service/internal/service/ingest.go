package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"frame-ingest-service/internal/config"
)

type FrameIngestService struct {
	publisher FramePublisher
	cfg       config.Config
}

func NewFrameIngestService(publisher FramePublisher, cfg config.Config) *FrameIngestService {
	return &FrameIngestService{publisher: publisher, cfg: cfg}
}

func (s *FrameIngestService) Ingest(ctx context.Context, request FrameRequest) (IngestedFrame, error) {
	payload, err := decodeFramePayload(request.PayloadBase64)
	if err != nil {
		return IngestedFrame{}, fmt.Errorf("payload invalido: %w", err)
	}

	if int64(len(payload)) > s.cfg.MaxFrameBytes {
		return IngestedFrame{}, fmt.Errorf("el frame excede el maximo permitido de %d bytes", s.cfg.MaxFrameBytes)
	}

	timestamp := time.Now().UTC()
	if request.Timestamp != "" {
		parsed, parseErr := time.Parse(time.RFC3339Nano, request.Timestamp)
		if parseErr != nil {
			return IngestedFrame{}, fmt.Errorf("timestamp invalido: %w", parseErr)
		}
		timestamp = parsed.UTC()
	}

	frame := IngestedFrame{
		FrameID:   normalizeFrameID(request.FrameID),
		Timestamp: timestamp,
		Source:    strings.TrimSpace(request.Source),
		MimeType:  strings.TrimSpace(request.MimeType),
		Sequence:  request.Sequence,
		Payload:   payload,
		Metadata:  request.Metadata,
	}

	if frame.MimeType == "" {
		frame.MimeType = "application/octet-stream"
	}

	if err := s.publisher.PublishFrame(frame); err != nil {
		return IngestedFrame{}, err
	}

	return frame, nil
}

func (s *FrameIngestService) PublishStream(ctx context.Context, frame IngestedFrame) error {
	if len(frame.Payload) == 0 {
		return errors.New("frame vacio")
	}
	if frame.FrameID == "" {
		frame.FrameID = normalizeFrameID("")
	}
	if frame.Timestamp.IsZero() {
		frame.Timestamp = time.Now().UTC()
	}
	return s.publisher.PublishFrame(frame)
}

func normalizeFrameID(frameID string) string {
	trimmed := strings.TrimSpace(frameID)
	if trimmed != "" {
		return trimmed
	}

	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err == nil {
		return hex.EncodeToString(bytes)
	}

	return fmt.Sprintf("frame-%d", time.Now().UnixNano())
}
