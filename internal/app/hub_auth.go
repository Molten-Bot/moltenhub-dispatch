package app

import (
	"errors"
	"net/http"
	"strings"

	"github.com/moltenbot000/moltenhub-dispatch/internal/hub"
)

const hubAuthReconnectMessage = "Molten Hub authentication is missing or invalid. Enter an existing bearer token or a bind token to reconnect."

func IsHubAuthFailure(err error) bool {
	if err == nil {
		return false
	}
	var apiErr *hub.APIError
	if !errors.As(err, &apiErr) {
		return false
	}
	if apiErr.StatusCode != http.StatusUnauthorized {
		return false
	}

	code := strings.ToLower(strings.TrimSpace(apiErr.Code))
	message := strings.ToLower(strings.TrimSpace(apiErr.Message))
	if code == "unauthorized" {
		return true
	}
	return strings.Contains(message, "missing or invalid bearer token") || strings.Contains(message, "bearer token")
}

func HubAuthReconnectMessage() string {
	return hubAuthReconnectMessage
}
