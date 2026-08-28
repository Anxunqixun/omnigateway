package helper

import (
	"strings"

	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

const (
	billingOnlyInputSeconds     = "input_seconds"
	defaultReferenceVideoSeconds = 15
)

func applyBillingOnlyInputSeconds(view []byte) []byte {
	if !hasReferenceVideo(view) {
		out, _ := sjson.SetBytes(view, billingOnlyInputSeconds, 0)
		return out
	}
	raw := firstExisting(view, billingOnlyInputSeconds, "metadata."+billingOnlyInputSeconds)
	if strings.TrimSpace(raw) == "" {
		out, _ := sjson.SetBytes(view, billingOnlyInputSeconds, defaultReferenceVideoSeconds)
		return out
	}
	seconds := coerceFormValue(raw)
	n, ok := seconds.(float64)
	if !ok {
		out, _ := sjson.SetBytes(view, billingOnlyInputSeconds, defaultReferenceVideoSeconds)
		return out
	}
	if n < 0 {
		n = 0
	}
	if n > float64(relaycommon.MaxTaskDurationSeconds) {
		n = float64(relaycommon.MaxTaskDurationSeconds)
	}
	out, _ := sjson.SetBytes(view, billingOnlyInputSeconds, n)
	return out
}

func hasReferenceVideo(body []byte) bool {
	if stringFieldPresent(body, "video_url") || stringFieldPresent(body, "metadata.video_url") {
		return true
	}
	if videos := gjson.GetBytes(body, "videos"); videos.IsArray() && len(videos.Array()) > 0 {
		return true
	}
	for _, path := range []string{"content", "metadata.content"} {
		items := gjson.GetBytes(body, path)
		if !items.IsArray() {
			continue
		}
		for _, item := range items.Array() {
			if item.Get("type").String() == "video_url" {
				return true
			}
			if strings.TrimSpace(item.Get("video_url").String()) != "" || strings.TrimSpace(item.Get("video_url.url").String()) != "" {
				return true
			}
		}
	}
	return false
}

func stringFieldPresent(body []byte, path string) bool {
	return strings.TrimSpace(gjson.GetBytes(body, path).String()) != ""
}

func StripBillingOnlyJSON(body []byte) []byte {
	if len(body) == 0 || !gjson.ValidBytes(body) {
		return body
	}
	out := body
	out, _ = sjson.DeleteBytes(out, billingOnlyInputSeconds)
	out, _ = sjson.DeleteBytes(out, "metadata."+billingOnlyInputSeconds)
	return out
}

func CopyMetadataWithoutBillingOnly(metadata map[string]any) map[string]any {
	if metadata == nil {
		return nil
	}
	out := make(map[string]any, len(metadata))
	for key, value := range metadata {
		if key == billingOnlyInputSeconds {
			continue
		}
		out[key] = value
	}
	return out
}
