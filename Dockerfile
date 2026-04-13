FROM golang:1.26 AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/moltenhub-dispatch ./cmd/moltenhub-dispatch

RUN mkdir -p /out/data

FROM gcr.io/distroless/base-debian12:nonroot

WORKDIR /app

ENV LISTEN_ADDR=:8080
ENV APP_DATA_DIR=/data

COPY --from=build /out/moltenhub-dispatch /app/moltenhub-dispatch
COPY --from=build --chown=nonroot:nonroot /out/data /data

EXPOSE 8080

ENTRYPOINT ["/app/moltenhub-dispatch"]
