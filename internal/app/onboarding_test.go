package app

import (
	"errors"
	"testing"
)

func TestDefaultOnboardingSteps(t *testing.T) {
	t.Parallel()

	steps := DefaultOnboardingSteps()
	if len(steps) != 4 {
		t.Fatalf("expected 4 onboarding steps, got %d", len(steps))
	}
	if steps[0].ID != OnboardingStepBind ||
		steps[1].ID != OnboardingStepWorkBind ||
		steps[2].ID != OnboardingStepProfileSet ||
		steps[3].ID != OnboardingStepWorkActivate {
		t.Fatalf("unexpected step order: %#v", steps)
	}
	if got, want := steps[0].Detail, "Exchange the bind token for an agent credential."; got != want {
		t.Fatalf("bind detail = %q, want %q", got, want)
	}
	if got, want := steps[2].Detail, "Persist the agent profile in Molten Hub."; got != want {
		t.Fatalf("profile detail = %q, want %q", got, want)
	}
}

func TestDefaultOnboardingStepsForModeExisting(t *testing.T) {
	t.Parallel()

	steps := DefaultOnboardingStepsForMode(OnboardingModeExisting)
	if len(steps) != 4 {
		t.Fatalf("expected 4 onboarding steps, got %d", len(steps))
	}
	if got, want := steps[0].Detail, "Verify the existing Molten Hub agent credential."; got != want {
		t.Fatalf("bind detail = %q, want %q", got, want)
	}
	if got, want := steps[2].Detail, "Persist the agent profile in Molten Hub."; got != want {
		t.Fatalf("profile detail = %q, want %q", got, want)
	}
}

func TestOnboardingStageFromError(t *testing.T) {
	t.Parallel()

	err := WrapOnboardingError(OnboardingStepProfileSet, errors.New("boom"))
	if got := OnboardingStageFromError(err); got != OnboardingStepProfileSet {
		t.Fatalf("stage = %q, want %q", got, OnboardingStepProfileSet)
	}
	if got := OnboardingStageFromError(errors.New("generic")); got != OnboardingStepBind {
		t.Fatalf("stage = %q, want %q", got, OnboardingStepBind)
	}
	if got := OnboardingStageFromError(nil); got != "" {
		t.Fatalf("stage = %q, want empty", got)
	}
}

func TestNormalizeOnboardingMode(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		mode       string
		bindToken  string
		agentToken string
		want       string
	}{
		{
			name: "explicit new mode wins",
			mode: "new",
			want: OnboardingModeNew,
		},
		{
			name: "explicit existing mode wins",
			mode: "existing",
			want: OnboardingModeExisting,
		},
		{
			name:      "bind token without agent token infers new",
			bindToken: "bind-123",
			want:      OnboardingModeNew,
		},
		{
			name:       "agent token defaults to existing",
			agentToken: "agent-123",
			want:       OnboardingModeExisting,
		},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			if got := NormalizeOnboardingMode(test.mode, test.bindToken, test.agentToken); got != test.want {
				t.Fatalf("NormalizeOnboardingMode(%q, %q, %q) = %q, want %q", test.mode, test.bindToken, test.agentToken, got, test.want)
			}
		})
	}
}
