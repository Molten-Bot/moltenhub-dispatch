package app

import (
	"net/http"
	"testing"

	"github.com/moltenbot000/moltenhub-dispatch/internal/hub"
)

func TestIsHubAuthFailure(t *testing.T) {
	t.Parallel()

	if !IsHubAuthFailure(&hub.APIError{
		StatusCode: http.StatusUnauthorized,
		Code:       "unauthorized",
		Message:    "missing or invalid bearer token",
	}) {
		t.Fatal("expected unauthorized bearer-token error to be treated as auth failure")
	}

	if IsHubAuthFailure(&hub.APIError{
		StatusCode: http.StatusConflict,
		Code:       "agent_exists",
		Message:    "handle already claimed",
	}) {
		t.Fatal("did not expect non-auth API error to be treated as auth failure")
	}
}
