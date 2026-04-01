FROM golang:1.22-alpine AS builder

WORKDIR /src
RUN apk add --no-cache ca-certificates tzdata

COPY go.mod .
RUN go mod download
COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/frame-ingest-service ./cmd/frame-ingest-service

FROM alpine:3.21 AS runtime

RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /out/frame-ingest-service ./frame-ingest-service

EXPOSE 5301
ENTRYPOINT ["/app/frame-ingest-service"]
