package service

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"time"
)

type FrameRequest struct {
	FrameID       string         `json:"frameId,omitempty"`
	Timestamp     string         `json:"timestamp,omitempty"`
	Source        string         `json:"source,omitempty"`
	MimeType      string         `json:"mimeType,omitempty"`
	Sequence      int64          `json:"sequence,omitempty"`
	PayloadBase64 string         `json:"payloadBase64"`
	Metadata      map[string]any `json:"metadata,omitempty"`
}

type IngestedFrame struct {
	FrameID   string         `json:"frameId"`
	Timestamp time.Time      `json:"timestamp"`
	Source    string         `json:"source,omitempty"`
	MimeType  string         `json:"mimeType,omitempty"`
	Sequence  int64          `json:"sequence,omitempty"`
	Payload   []byte         `json:"payload"`
	Metadata  map[string]any `json:"metadata,omitempty"`
}

type FrameEnvelope struct {
	Topic  string        `json:"topic"`
	Frame  IngestedFrame `json:"frame"`
	Schema string        `json:"schema"`
}

type FramePublisher interface {
	PublishFrame(frame IngestedFrame) error
	Health() error
	Close() error
}

func decodeFramePayload(payloadBase64 string) ([]byte, error) {
	if payloadBase64 == "" {
		return nil, errors.New("payloadBase64 es requerido")
	}

	decoded, err := base64.StdEncoding.DecodeString(payloadBase64)
	if err != nil {
		return nil, err
	}
	return decoded, nil
}

func encodeEnvelope(frame IngestedFrame, topic string) ([]byte, error) {
	envelope := FrameEnvelope{
		Topic:  topic,
		Frame:  frame,
		Schema: "frame.ingest.v1",
	}
	return json.Marshal(envelope)
}
