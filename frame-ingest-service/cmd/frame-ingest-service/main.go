package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"frame-ingest-service/internal/config"
	"frame-ingest-service/internal/httpapi"
	"frame-ingest-service/internal/publisher"
	"frame-ingest-service/internal/service"
)

func main() {
	cfg := config.Load()

	pub, closePublisher, err := publisher.New(cfg)
	if err != nil {
		log.Fatalf("no se pudo inicializar el publisher: %v", err)
	}
	defer closePublisher()

	ingestService := service.NewFrameIngestService(pub, cfg)
	handler := httpapi.NewHandler(ingestService, cfg)

	srv := &http.Server{
		Addr:    cfg.ListenAddr(),
		Handler: handler.Routes(),
	}

	shutdownCh := make(chan os.Signal, 1)
	signal.Notify(shutdownCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("frame-ingest-service escuchando en %s", cfg.ListenAddr())
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("error iniciando servidor: %v", err)
		}
	}()

	<-shutdownCh
	log.Println("apagando frame-ingest-service")
	_ = srv.Close()
}
