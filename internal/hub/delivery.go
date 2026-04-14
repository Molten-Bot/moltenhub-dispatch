package hub

import (
	"encoding/json"
	"fmt"
	"strings"
)

type deliveryPayload struct {
	Delivery struct {
		DeliveryID string `json:"delivery_id"`
	} `json:"delivery"`
	DeliveryID      string          `json:"delivery_id"`
	MessageID       string          `json:"message_id"`
	FromAgentUUID   string          `json:"from_agent_uuid"`
	FromAgentURI    string          `json:"from_agent_uri"`
	ToAgentUUID     string          `json:"to_agent_uuid"`
	ToAgentURI      string          `json:"to_agent_uri"`
	Message         OpenClawMessage `json:"message"`
	OpenClawMessage OpenClawMessage `json:"openclaw_message"`
}

func decodePullResponsePayload(raw json.RawMessage, source string) (PullResponse, error) {
	var delivery deliveryPayload
	if err := json.Unmarshal(raw, &delivery); err != nil {
		if strings.TrimSpace(source) == "" {
			source = "pull response"
		}
		return PullResponse{}, fmt.Errorf("decode %s: %w", source, err)
	}

	message := delivery.OpenClawMessage
	if message.Kind == "" && message.Type == "" {
		message = delivery.Message
	}

	deliveryID := strings.TrimSpace(delivery.Delivery.DeliveryID)
	if deliveryID == "" {
		deliveryID = strings.TrimSpace(delivery.DeliveryID)
	}

	return PullResponse{
		DeliveryID:      deliveryID,
		MessageID:       strings.TrimSpace(delivery.MessageID),
		FromAgentUUID:   strings.TrimSpace(delivery.FromAgentUUID),
		FromAgentURI:    strings.TrimSpace(delivery.FromAgentURI),
		ToAgentUUID:     strings.TrimSpace(delivery.ToAgentUUID),
		ToAgentURI:      strings.TrimSpace(delivery.ToAgentURI),
		OpenClawMessage: message,
	}, nil
}
