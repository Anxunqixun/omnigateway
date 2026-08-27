package service

import (
	"encoding/json"

	"github.com/QuantumNous/new-api/pkg/billingexpr"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
)

// AttachSettledUsageView copies the official last-chunk / mapped Usage onto the
// billing request so resp() and usage() can read standard token paths.
func AttachSettledUsageView(relayInfo *relaycommon.RelayInfo, usage *dto.Usage) {
	if relayInfo == nil || usage == nil {
		return
	}
	if relayInfo.BillingRequestInput == nil {
		relayInfo.BillingRequestInput = &billingexpr.RequestInput{}
	}
	if len(relayInfo.BillingRequestInput.ResponseBody) > 0 {
		return
	}
	payload := map[string]any{
		"usage": map[string]any{
			"prompt_tokens":     usage.PromptTokens,
			"completion_tokens": usage.CompletionTokens,
			"total_tokens":      usage.TotalTokens,
			"input_tokens":      usage.PromptTokens,
			"output_tokens":     usage.CompletionTokens,
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return
	}
	relayInfo.BillingRequestInput.ResponseBody = body
}
