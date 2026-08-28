package service

import (
	"strings"

	"github.com/QuantumNous/new-api/relaykit/dto"
)

func enrichPublicDocsEndpoint(item PublicDocsEndpoint) PublicDocsEndpoint {
	if strings.TrimSpace(item.Title) == "" {
		item.Title = item.Model
	}
	return item
}

func DefaultVideoResultRelated() dto.ChannelApiDocRelated {
	return dto.ChannelApiDocRelated{
		Method:      "GET",
		Path:        "/v1/videos/{id}/content",
		Title:       "Get video result",
		Description: "Download the finished video from this gateway after the task succeeds.",
		TryIt:       true,
		RequestExample: "curl '{{BASE_URL}}/v1/videos/{id}/content' \\\n  -H 'Authorization: Bearer $API_KEY' \\\n  -o result.mp4",
	}
}

func hasVideoResultRelated(related []dto.ChannelApiDocRelated) bool {
	for _, item := range related {
		path := strings.ReplaceAll(strings.TrimSpace(item.Path), " ", "")
		if normalizeDocsMethod(item.Method) == "GET" && strings.Contains(path, "/videos/{id}/content") {
			return true
		}
	}
	return false
}
