package tests

import (
	"context"
	"encoding/base64"
	"testing"
	"time"

	"frame-ingest-service/internal/config"
	"frame-ingest-service/internal/publisher"
	"frame-ingest-service/internal/service"
)

func TestIngestPublishesDecodedFrame(t *testing.T) {
	cfg := config.Config{MaxFrameBytes: 1024 * 1024, NATSSubject: "frames.raw", CORSOrigins: []string{"*"}}
	mem := publisher.NewMemoryPublisher()
	ingest := service.NewFrameIngestService(mem, cfg)

	payload := base64.StdEncoding.EncodeToString([]byte{0x01, 0x02, 0x03, 0x04})
	frame, err := ingest.Ingest(context.Background(), service.FrameRequest{
		Source:        "android",
		MimeType:      "image/jpeg",
		PayloadBase64: payload,
		Timestamp:     time.Now().UTC().Format(time.RFC3339Nano),
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if frame.FrameID == "" {
		t.Fatal("expected generated frame id")
	}

	if len(mem.Snapshot()) != 1 {
		t.Fatalf("expected 1 published frame, got %d", len(mem.Snapshot()))
	}

	if got := mem.Snapshot()[0].MimeType; got != "image/jpeg" {
		t.Fatalf("unexpected mime type: %s", got)
	}
}

func TestIngestRejectsInvalidBase64(t *testing.T) {
	cfg := config.Config{MaxFrameBytes: 1024 * 1024, NATSSubject: "frames.raw", CORSOrigins: []string{"*"}}
	mem := publisher.NewMemoryPublisher()
	ingest := service.NewFrameIngestService(mem, cfg)

	_, err := ingest.Ingest(context.Background(), service.FrameRequest{PayloadBase64: "not-base64"})
	if err == nil {
		t.Fatal("expected error for invalid base64")
	}
}
