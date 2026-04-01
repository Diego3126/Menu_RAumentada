package httpapi

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gorilla/websocket"

	"frame-ingest-service/internal/config"
	"frame-ingest-service/internal/service"
)

type Handler struct {
	service *service.FrameIngestService
	cfg     config.Config
	upgrader websocket.Upgrader
}

func NewHandler(ingestService *service.FrameIngestService, cfg config.Config) *Handler {
	allowedOrigins := cfg.CORSOrigins
	if len(allowedOrigins) == 1 && allowedOrigins[0] == "*" {
		allowedOrigins = nil
	}

	return &Handler{
		service: ingestService,
		cfg:     cfg,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				if len(allowedOrigins) == 0 {
					return true
				}
				origin := r.Header.Get("Origin")
				for _, allowed := range allowedOrigins {
					if origin == allowed {
						return true
					}
				}
				return false
			},
		},
	}
}

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", h.health)
	mux.HandleFunc("/ready", h.ready)
	mux.HandleFunc("/frames", h.frames)
	mux.HandleFunc("/ws/frames", h.wsFrames)
	return h.withMiddleware(mux)
}

func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"service": "frame-ingest-service",
	})
}

func (h *Handler) ready(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if err := h.servicePublisherHealth(); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status":  "not_ready",
			"service": "frame-ingest-service",
			"error":   err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "ready",
		"service": "frame-ingest-service",
	})
}

func (h *Handler) frames(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	defer r.Body.Close()
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, h.cfg.MaxFrameBytes*2))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "message": "no se pudo leer el frame"})
		return
	}

	var request service.FrameRequest
	if err := json.Unmarshal(body, &request); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "message": "json invalido", "error": err.Error()})
		return
	}

	frame, err := h.service.Ingest(r.Context(), request)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "message": err.Error()})
		return
	}

	writeJSON(w, http.StatusAccepted, map[string]any{
		"success": true,
		"message": "frame encolado correctamente",
		"data": map[string]any{
			"frameId":   frame.FrameID,
			"timestamp":  frame.Timestamp,
			"source":     frame.Source,
			"mimeType":   frame.MimeType,
			"sequence":   frame.Sequence,
			"payloadSize": len(frame.Payload),
		},
	})
}

func (h *Handler) wsFrames(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return
		}

		var request service.FrameRequest
		if err := json.Unmarshal(msg, &request); err != nil {
			_ = conn.WriteJSON(map[string]any{"success": false, "message": "json invalido", "error": err.Error()})
			continue
		}

		frame, err := h.service.Ingest(r.Context(), request)
		if err != nil {
			_ = conn.WriteJSON(map[string]any{"success": false, "message": err.Error()})
			continue
		}

		_ = conn.WriteJSON(map[string]any{
			"success": true,
			"message": "frame recibido por websocket",
			"data": map[string]any{
				"frameId":   frame.FrameID,
				"timestamp":  frame.Timestamp,
				"sequence":   frame.Sequence,
				"payloadSize": len(frame.Payload),
			},
		})
	}
}

func (h *Handler) servicePublisherHealth() error {
	return h.service.Publisher().Health()
}

func (h *Handler) withMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
