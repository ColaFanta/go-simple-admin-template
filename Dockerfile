# Build stage
FROM golang:1.27-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the application
# Disable CGO for static binary
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/admin

# Final stage
FROM alpine:latest

WORKDIR /app

# Install necessary runtime dependencies (e.g. ca-certificates for HTTPS)
RUN apk add --no-cache ca-certificates

# Copy the binary from builder
COPY --from=builder /app/main .

# Expose the application port
EXPOSE 3000

# Run the application
CMD ["./main"]
