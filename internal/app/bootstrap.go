package app

import (
	"context"
	"fmt"
	"strings"
)

const moltenHubTokenEnvVar = "MOLTEN_HUB_TOKEN"

func (s *Service) BindFromEnvIfNeeded(ctx context.Context) error {
	token, ok := envValue(moltenHubTokenEnvVar)
	if !ok {
		return nil
	}

	state := s.store.Snapshot()
	if strings.TrimSpace(state.Session.AgentToken) != "" {
		return nil
	}

	mode, bindToken, agentToken := NormalizeOnboardingTokens("", token, "")
	if err := s.BindAndRegister(ctx, BindProfile{
		AgentMode:  mode,
		BindToken:  bindToken,
		AgentToken: agentToken,
	}); err != nil {
		err = fmt.Errorf("automatic hub binding from %s failed: %w", moltenHubTokenEnvVar, err)
		_ = s.SetFlash("error", err.Error())
		_ = s.logEvent("error", "Automatic bind failed", err.Error(), "", "")
		return err
	}

	message := "Agent bound from " + moltenHubTokenEnvVar + "."
	if mode == OnboardingModeExisting {
		message = "Existing agent connected from " + moltenHubTokenEnvVar + "."
	}
	_ = s.SetFlash("info", message)
	return nil
}
