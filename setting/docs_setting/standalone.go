package docs_setting

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/QuantumNous/new-api/relaykit/dto"
)

const (
	StandaloneKindEndpoint = "endpoint"
	StandaloneKindArticle  = "article"

	StandaloneFormulaGuideID = "billing-formula"
)

var standaloneSlugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

var reservedStandaloneIDs = map[string]struct{}{
	"models": {},
	"admin":  {},
}

type StandaloneDoc struct {
	Id                string                   `json:"id"`
	Kind              string                   `json:"kind"`
	Published         bool                     `json:"published,omitempty"`
	TryIt             bool                     `json:"try_it,omitempty"`
	Category          string                   `json:"category,omitempty"`
	Method            string                   `json:"method,omitempty"`
	Path              string                   `json:"path,omitempty"`
	Title             string                   `json:"title,omitempty"`
	Description       string                   `json:"description,omitempty"`
	Capabilities      []dto.ChannelApiDocTag   `json:"capabilities,omitempty"`
	RequiredParams    []dto.ChannelApiDocParam `json:"required_params,omitempty"`
	OptionalParams    []dto.ChannelApiDocParam `json:"optional_params,omitempty"`
	RequestExample    string                   `json:"request_example,omitempty"`
	ResponseExample   string                   `json:"response_example,omitempty"`
	RelatedEndpoints  []dto.ChannelApiDocRelated `json:"related_endpoints,omitempty"`
}

func GetStandalone() []StandaloneDoc {
	if docsSetting.Standalone == nil {
		return defaultStandalone()
	}
	return cloneStandalone(docsSetting.Standalone)
}

func NormalizeStandalone(items []StandaloneDoc) ([]StandaloneDoc, error) {
	if items == nil {
		return []StandaloneDoc{}, nil
	}
	out := make([]StandaloneDoc, 0, len(items))
	seen := map[string]struct{}{}
	for _, item := range items {
		normalized, err := normalizeStandaloneDoc(item)
		if err != nil {
			return nil, err
		}
		if _, exists := seen[normalized.Id]; exists {
			return nil, fmt.Errorf("duplicate document id: %s", normalized.Id)
		}
		seen[normalized.Id] = struct{}{}
		out = append(out, normalized)
	}
	return out, nil
}

func PublishedStandalone() []StandaloneDoc {
	out := make([]StandaloneDoc, 0)
	for _, item := range GetStandalone() {
		if item.Published {
			out = append(out, item)
		}
	}
	return out
}

func defaultStandalone() []StandaloneDoc {
	return []StandaloneDoc{
		{
			Id:          StandaloneFormulaGuideID,
			Kind:        StandaloneKindArticle,
			Published:   true,
			Category:    "quickstart",
			Title:       "Billing formula guide",
			Description: formulaGuideMarkdown,
		},
	}
}

func cloneStandalone(items []StandaloneDoc) []StandaloneDoc {
	if items == nil {
		return nil
	}
	out := make([]StandaloneDoc, len(items))
	copy(out, items)
	return out
}

func normalizeStandaloneDoc(item StandaloneDoc) (StandaloneDoc, error) {
	id := strings.ToLower(strings.TrimSpace(item.Id))
	if !standaloneSlugPattern.MatchString(id) || len(id) > 64 {
		return StandaloneDoc{}, fmt.Errorf("invalid document id")
	}
	if _, reserved := reservedStandaloneIDs[id]; reserved {
		return StandaloneDoc{}, fmt.Errorf("document id %s is reserved", id)
	}
	kind := strings.ToLower(strings.TrimSpace(item.Kind))
	if kind == "" {
		kind = StandaloneKindEndpoint
	}
	if kind != StandaloneKindEndpoint && kind != StandaloneKindArticle {
		return StandaloneDoc{}, fmt.Errorf("invalid document kind")
	}
	title := strings.TrimSpace(item.Title)
	if title == "" {
		return StandaloneDoc{}, fmt.Errorf("document title is required")
	}
	normalized := StandaloneDoc{
		Id:          id,
		Kind:        kind,
		Published:   item.Published,
		Category:    strings.TrimSpace(item.Category),
		Title:       title,
		Description: strings.TrimSpace(item.Description),
	}
	if kind == StandaloneKindArticle {
		return normalized, nil
	}
	path := strings.TrimSpace(item.Path)
	if !ValidDocsEndpointPath(path) {
		return StandaloneDoc{}, fmt.Errorf("endpoint path must be a /path or an http(s) URL")
	}
	method := strings.ToUpper(strings.TrimSpace(item.Method))
	if method != "GET" {
		method = "POST"
	}
	normalized.TryIt = item.TryIt
	normalized.Method = method
	normalized.Path = path
	normalized.Capabilities = item.Capabilities
	normalized.RequiredParams = item.RequiredParams
	normalized.OptionalParams = item.OptionalParams
	normalized.RequestExample = item.RequestExample
	normalized.ResponseExample = item.ResponseExample
	normalized.RelatedEndpoints = item.RelatedEndpoints
	return normalized, nil
}

func ValidDocsEndpointPath(path string) bool {
	if path == "" {
		return false
	}
	if strings.HasPrefix(path, "/") {
		return !strings.HasPrefix(path, "//")
	}
	parsed, err := url.Parse(path)
	if err != nil || parsed.Host == "" {
		return false
	}
	scheme := strings.ToLower(parsed.Scheme)
	return scheme == "http" || scheme == "https"
}
