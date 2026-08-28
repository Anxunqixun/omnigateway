package service

import (
	"net/url"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/setting/docs_setting"
)

const (
	DocsKindBuiltin    = "builtin"
	DocsKindModel      = "model"
	DocsKindRelated    = "related"
	DocsKindStandalone = "standalone"
	DocsKindArticle    = "article"

	DocsCategoryQuickstart = "quickstart"
	DocsCategoryText       = "text"
	DocsCategoryImage      = "image"
	DocsCategoryVideo      = "video"
	DocsCategoryAudio      = "audio"
	DocsCategoryTools      = "tools"
)

type PublicDocsRelatedLink struct {
	Id          string `json:"id"`
	Method      string `json:"method"`
	Path        string `json:"path"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
}

type PublicDocsEndpoint struct {
	Id                string                   `json:"id"`
	Kind              string                   `json:"kind"`
	Method            string                   `json:"method"`
	Path              string                   `json:"path"`
	Title             string                   `json:"title"`
	Model             string                   `json:"model,omitempty"`
	Category          string                   `json:"category"`
	Description       string                   `json:"description,omitempty"`
	TryIt             bool                     `json:"try_it"`
	Async             bool                     `json:"async,omitempty"`
	Related           []PublicDocsRelatedLink  `json:"related,omitempty"`
	Capabilities      []dto.ChannelApiDocTag   `json:"capabilities,omitempty"`
	RequiredParams    []dto.ChannelApiDocParam `json:"required_params,omitempty"`
	OptionalParams    []dto.ChannelApiDocParam `json:"optional_params,omitempty"`
	RequestExample    string                   `json:"request_example,omitempty"`
	ResponseExample   string                   `json:"response_example,omitempty"`
	AuthScheme        string                   `json:"auth_scheme"`
}

func BuiltinModelsListEndpoint() PublicDocsEndpoint {
	return PublicDocsEndpoint{
		Id:          "models",
		Kind:        DocsKindBuiltin,
		Method:      "GET",
		Path:        "/v1/models",
		Title:       "Model list",
		Category:    DocsCategoryQuickstart,
		Description: "Query the models currently available to your API key and use the returned IDs exactly as shown.",
		TryIt:       true,
		AuthScheme:  "bearer",
		RequestExample: "curl '{{BASE_URL}}/v1/models' \\\n  -H 'Authorization: Bearer $API_KEY'",
		ResponseExample: `{
  "object": "list",
  "data": [
    {
      "id": "gpt-4o-mini",
      "object": "model"
    }
  ]
}`,
	}
}

func BuildPublicDocsCatalog(channels []*model.Channel) []PublicDocsEndpoint {
	items := []PublicDocsEndpoint{BuiltinModelsListEndpoint()}
	seenModels := map[string]struct{}{}
	seenRelated := map[string]struct{}{}

	sorted := append([]*model.Channel(nil), channels...)
	sort.SliceStable(sorted, func(i, j int) bool {
		pi, pj := channelPriority(sorted[i]), channelPriority(sorted[j])
		if pi != pj {
			return pi > pj
		}
		wi, wj := channelWeight(sorted[i]), channelWeight(sorted[j])
		if wi != wj {
			return wi > wj
		}
		return sorted[i].Id < sorted[j].Id
	})

	for _, channel := range sorted {
		if channel == nil || channel.Status != common.ChannelStatusEnabled {
			continue
		}
		channelDocs := channel.GetOtherSettings().ApiDocs
		if channelDocs == nil || !channelDocs.Published {
			continue
		}
		for _, modelName := range splitChannelModels(channel.Models) {
			if _, exists := seenModels[modelName]; exists {
				continue
			}
			docs := channelDocs.ForModel(modelName)
			if docs == nil {
				continue
			}
			method := normalizeDocsMethod(docs.Method)
			path := strings.TrimSpace(docs.Path)
			if !docs_setting.ValidDocsEndpointPath(path) {
				continue
			}
			category := normalizeDocsCategory(docs.Category)
			relatedList := resolveDocsRelated(docs, category)
			relatedLinks := make([]PublicDocsRelatedLink, 0, len(relatedList))
			for _, related := range relatedList {
				relatedMethod := normalizeDocsMethod(related.Method)
				relatedPath := strings.TrimSpace(related.Path)
				if !docs_setting.ValidDocsEndpointPath(relatedPath) {
					continue
				}
				title := strings.TrimSpace(related.Title)
				if title == "" {
					title = relatedMethod + " " + relatedPath
				}
				relatedLinks = append(relatedLinks, PublicDocsRelatedLink{
					Id:          relatedDocsID(relatedMethod, relatedPath),
					Method:      relatedMethod,
					Path:        relatedPath,
					Title:       title,
					Description: strings.TrimSpace(related.Description),
				})
			}
			seenModels[modelName] = struct{}{}
			items = append(items, enrichPublicDocsEndpoint(PublicDocsEndpoint{
				Id:              "model:" + modelName,
				Kind:            DocsKindModel,
				Method:          method,
				Path:            path,
				Title:           strings.TrimSpace(docs.Title),
				Model:           modelName,
				Category:        category,
				Description:     strings.TrimSpace(docs.Description),
				TryIt:           docs.TryIt,
				Async:           category == DocsCategoryVideo || len(relatedLinks) > 0,
				Related:         cloneDocsRelatedLinks(relatedLinks),
				Capabilities:    cloneDocTags(docs.Capabilities),
				RequiredParams:  cloneDocParams(docs.RequiredParams),
				OptionalParams:  cloneDocParams(docs.OptionalParams),
				RequestExample:  docs.RequestExample,
				ResponseExample: docs.ResponseExample,
				AuthScheme:      "bearer",
			}))
			for _, related := range relatedList {
				relatedMethod := normalizeDocsMethod(related.Method)
				relatedPath := strings.TrimSpace(related.Path)
				if !docs_setting.ValidDocsEndpointPath(relatedPath) {
					continue
				}
				relatedID := relatedDocsID(relatedMethod, relatedPath)
				if _, exists := seenRelated[relatedID]; exists {
					continue
				}
				seenRelated[relatedID] = struct{}{}
				title := strings.TrimSpace(related.Title)
				if title == "" {
					title = relatedMethod + " " + relatedPath
				}
				items = append(items, enrichPublicDocsEndpoint(PublicDocsEndpoint{
					Id:              relatedID,
					Kind:            DocsKindRelated,
					Method:          relatedMethod,
					Path:            relatedPath,
					Title:           title,
					Category:        category,
					Description:     strings.TrimSpace(related.Description),
					TryIt:           docs.TryIt && related.TryIt,
					Async:           true,
					RequestExample:  related.RequestExample,
					ResponseExample: related.ResponseExample,
					AuthScheme:      "bearer",
				}))
			}
		}
	}
	return appendStandalonePublicDocs(items)
}

func appendStandalonePublicDocs(items []PublicDocsEndpoint) []PublicDocsEndpoint {
	seen := map[string]struct{}{}
	for _, item := range items {
		seen[item.Id] = struct{}{}
	}
	for _, doc := range docs_setting.PublishedStandalone() {
		if _, exists := seen[doc.Id]; exists {
			continue
		}
		if doc.Kind == docs_setting.StandaloneKindArticle {
			items = append(items, enrichPublicDocsEndpoint(PublicDocsEndpoint{
				Id:          doc.Id,
				Kind:        DocsKindArticle,
				Title:       doc.Title,
				Category:    normalizeDocsCategory(doc.Category),
				Description: doc.Description,
				AuthScheme:  "",
			}))
			seen[doc.Id] = struct{}{}
			continue
		}
		method := normalizeDocsMethod(doc.Method)
		path := strings.TrimSpace(doc.Path)
		if !docs_setting.ValidDocsEndpointPath(path) {
			continue
		}
		category := normalizeDocsCategory(doc.Category)
		relatedList := resolveDocsRelated(&dto.ChannelApiDocs{
			RelatedEndpoints: doc.RelatedEndpoints,
		}, category)
		relatedLinks := make([]PublicDocsRelatedLink, 0, len(relatedList))
		for _, related := range relatedList {
			relatedMethod := normalizeDocsMethod(related.Method)
			relatedPath := strings.TrimSpace(related.Path)
			if !docs_setting.ValidDocsEndpointPath(relatedPath) {
				continue
			}
			title := strings.TrimSpace(related.Title)
			if title == "" {
				title = relatedMethod + " " + relatedPath
			}
			relatedLinks = append(relatedLinks, PublicDocsRelatedLink{
				Id:          relatedDocsID(relatedMethod, relatedPath),
				Method:      relatedMethod,
				Path:        relatedPath,
				Title:       title,
				Description: strings.TrimSpace(related.Description),
			})
		}
		items = append(items, enrichPublicDocsEndpoint(PublicDocsEndpoint{
			Id:              doc.Id,
			Kind:            DocsKindStandalone,
			Method:          method,
			Path:            path,
			Title:           doc.Title,
			Category:        category,
			Description:     doc.Description,
			TryIt:           doc.TryIt,
			Async:           category == DocsCategoryVideo || len(relatedLinks) > 0,
			Related:         cloneDocsRelatedLinks(relatedLinks),
			Capabilities:    cloneDocTags(doc.Capabilities),
			RequiredParams:  cloneDocParams(doc.RequiredParams),
			OptionalParams:  cloneDocParams(doc.OptionalParams),
			RequestExample:  doc.RequestExample,
			ResponseExample: doc.ResponseExample,
			AuthScheme:      "bearer",
		}))
		seen[doc.Id] = struct{}{}
	}
	return items
}

func RenderPublicDocsEndpoint(item PublicDocsEndpoint, baseURL string) PublicDocsEndpoint {
	modelName := item.Model
	// Keep {{MODEL_NAME}} in the description so the public page can translate
	// the English key first, then substitute the model id.
	item.Description = strings.ReplaceAll(item.Description, "{{BASE_URL}}", baseURL)
	item.RequestExample = renderDocsPlaceholders(item.RequestExample, modelName, baseURL)
	item.ResponseExample = renderDocsPlaceholders(item.ResponseExample, modelName, baseURL)
	item.Path = renderDocsPlaceholders(item.Path, modelName, baseURL)
	for i := range item.RequiredParams {
		item.RequiredParams[i].Default = renderDocsPlaceholders(item.RequiredParams[i].Default, modelName, baseURL)
		item.RequiredParams[i].Description = renderDocsPlaceholders(item.RequiredParams[i].Description, modelName, baseURL)
		item.RequiredParams[i].Range = renderDocsPlaceholders(item.RequiredParams[i].Range, modelName, baseURL)
	}
	for i := range item.OptionalParams {
		item.OptionalParams[i].Default = renderDocsPlaceholders(item.OptionalParams[i].Default, modelName, baseURL)
		item.OptionalParams[i].Description = renderDocsPlaceholders(item.OptionalParams[i].Description, modelName, baseURL)
		item.OptionalParams[i].Range = renderDocsPlaceholders(item.OptionalParams[i].Range, modelName, baseURL)
	}
	for i := range item.Related {
		item.Related[i].Title = renderDocsPlaceholders(item.Related[i].Title, modelName, baseURL)
		item.Related[i].Description = renderDocsPlaceholders(item.Related[i].Description, modelName, baseURL)
		item.Related[i].Path = renderDocsPlaceholders(item.Related[i].Path, modelName, baseURL)
	}
	return item
}

func FindPublicDocsEndpoint(items []PublicDocsEndpoint, id string) (PublicDocsEndpoint, bool) {
	id = strings.TrimSpace(id)
	if id == "" {
		if len(items) == 0 {
			return PublicDocsEndpoint{}, false
		}
		return items[0], true
	}
	for _, item := range items {
		if item.Id == id {
			return item, true
		}
	}
	unescaped, err := url.PathUnescape(id)
	if err == nil && unescaped != id {
		for _, item := range items {
			if item.Id == unescaped {
				return item, true
			}
		}
	}
	return PublicDocsEndpoint{}, false
}

func relatedDocsID(method, path string) string {
	safePath := strings.NewReplacer("/", "~", "{", "_", "}", "_").Replace(path)
	return "related:" + method + ":" + safePath
}

func splitChannelModels(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	seen := map[string]struct{}{}
	for _, part := range parts {
		name := strings.TrimSpace(part)
		if name == "" {
			continue
		}
		if _, exists := seen[name]; exists {
			continue
		}
		seen[name] = struct{}{}
		out = append(out, name)
	}
	return out
}

func normalizeDocsMethod(method string) string {
	method = strings.ToUpper(strings.TrimSpace(method))
	if method == "GET" {
		return "GET"
	}
	return "POST"
}

func normalizeDocsCategory(category string) string {
	switch strings.ToLower(strings.TrimSpace(category)) {
	case DocsCategoryQuickstart:
		return DocsCategoryQuickstart
	case DocsCategoryImage:
		return DocsCategoryImage
	case DocsCategoryVideo:
		return DocsCategoryVideo
	case DocsCategoryAudio:
		return DocsCategoryAudio
	case DocsCategoryTools:
		return DocsCategoryTools
	default:
		return DocsCategoryText
	}
}

func channelPriority(channel *model.Channel) int64 {
	if channel == nil || channel.Priority == nil {
		return 0
	}
	return *channel.Priority
}

func channelWeight(channel *model.Channel) uint {
	if channel == nil || channel.Weight == nil {
		return 0
	}
	return *channel.Weight
}

func cloneDocTags(tags []dto.ChannelApiDocTag) []dto.ChannelApiDocTag {
	if len(tags) == 0 {
		return nil
	}
	out := make([]dto.ChannelApiDocTag, 0, len(tags))
	for _, tag := range tags {
		label := strings.TrimSpace(tag.Label)
		value := strings.TrimSpace(tag.Value)
		if label == "" && value == "" {
			continue
		}
		out = append(out, dto.ChannelApiDocTag{Label: label, Value: value})
	}
	return out
}

func cloneDocParams(params []dto.ChannelApiDocParam) []dto.ChannelApiDocParam {
	if len(params) == 0 {
		return nil
	}
	out := make([]dto.ChannelApiDocParam, 0, len(params))
	for _, param := range params {
		name := strings.TrimSpace(param.Name)
		if name == "" {
			continue
		}
		out = append(out, dto.ChannelApiDocParam{
			Name:        name,
			Type:        strings.TrimSpace(param.Type),
			Default:     strings.TrimSpace(param.Default),
			Range:       strings.TrimSpace(param.Range),
			Description: strings.TrimSpace(param.Description),
		})
	}
	return out
}

func renderDocsPlaceholders(value, modelName, baseURL string) string {
	out := strings.ReplaceAll(value, "{{BASE_URL}}", baseURL)
	if modelName != "" {
		out = strings.ReplaceAll(out, "{{MODEL_NAME}}", modelName)
	}
	return out
}

func PublicBaseURL(scheme, host string) string {
	if scheme == "" {
		scheme = "http"
	}
	return scheme + "://" + host
}

func DefaultVideoPollRelated() dto.ChannelApiDocRelated {
	return dto.ChannelApiDocRelated{
		Method: "GET",
		Path:   "/v1/videos/{id}",
		Title:  "Query video task",
		Description: "Poll this gateway path with the task id from the submit response. Do not call the upstream vendor.",
		TryIt:  true,
		RequestExample: "curl '{{BASE_URL}}/v1/videos/{id}' \\\n  -H 'Authorization: Bearer $API_KEY'",
		ResponseExample: `{
  "id": "task_xxx",
  "status": "completed"
}`,
	}
}

func resolveDocsRelated(docs *dto.ChannelApiDocs, category string) []dto.ChannelApiDocRelated {
	if docs == nil {
		return nil
	}
	related := append([]dto.ChannelApiDocRelated(nil), docs.RelatedEndpoints...)
	if category == DocsCategoryVideo && !hasVideoPollRelated(related) {
		related = append(related, DefaultVideoPollRelated())
	}
	if category == DocsCategoryVideo && !hasVideoResultRelated(related) {
		related = append(related, DefaultVideoResultRelated())
	}
	return related
}

func hasVideoPollRelated(related []dto.ChannelApiDocRelated) bool {
	for _, item := range related {
		path := strings.ReplaceAll(strings.TrimSpace(item.Path), " ", "")
		if normalizeDocsMethod(item.Method) != "GET" {
			continue
		}
		if strings.Contains(path, "/videos/{id}") && !strings.Contains(path, "/content") {
			return true
		}
	}
	return false
}

func cloneDocsRelatedLinks(links []PublicDocsRelatedLink) []PublicDocsRelatedLink {
	if len(links) == 0 {
		return nil
	}
	out := make([]PublicDocsRelatedLink, len(links))
	copy(out, links)
	return out
}
