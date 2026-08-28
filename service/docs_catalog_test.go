package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildPublicDocsCatalogExpandsChannelModelsWithoutChannelName(t *testing.T) {
	priority := int64(10)
	channels := []*model.Channel{
		{
			Id:     2,
			Status: common.ChannelStatusEnabled,
			Models: "ad-seedance-2.0-480p, ad-seedance-2.0-720p",
			OtherSettings: marshalChannelApiDocs(t, &dto.ChannelApiDocs{
				Published:   true,
				TryIt:       true,
				Category:    "video",
				Method:      "POST",
				Path:        "/v1/videos",
				Description: "Per-second 480p billing",
				RequiredParams: []dto.ChannelApiDocParam{
					{Name: "model", Type: "string", Description: "{{MODEL_NAME}}"},
					{Name: "prompt", Type: "string"},
				},
				RelatedEndpoints: []dto.ChannelApiDocRelated{
					{
						Method: "GET",
						Path:   "/v1/videos/{id}",
						Title:  "Video task query",
						TryIt:  true,
					},
				},
			}),
			Priority: &priority,
		},
		{
			Id:     1,
			Status: common.ChannelStatusEnabled,
			Name:   "hidden-channel",
			Models: "ad-seedance-2.0-480p,later-duplicate",
			OtherSettings: marshalChannelApiDocs(t, &dto.ChannelApiDocs{
				Published: true,
				Category:  "video",
				Method:    "POST",
				Path:      "/v1/videos",
			}),
		},
	}

	items := BuildPublicDocsCatalog(channels)
	require.GreaterOrEqual(t, len(items), 4)
	assert.Equal(t, "models", items[0].Id)
	assert.Equal(t, DocsKindBuiltin, items[0].Kind)
	assert.Equal(t, DocsCategoryQuickstart, items[0].Category)

	modelIDs := collectIDs(items, DocsKindModel)
	assert.Equal(t, []string{
		"model:ad-seedance-2.0-480p",
		"model:ad-seedance-2.0-720p",
		"model:later-duplicate",
	}, modelIDs)
	firstModel, ok := FindPublicDocsEndpoint(items, "model:ad-seedance-2.0-480p")
	require.True(t, ok)
	assert.True(t, firstModel.TryIt)
	assert.Equal(t, "/v1/videos", firstModel.Path)
	for _, item := range items {
		assert.NotContains(t, item.Title, "hidden-channel")
		assert.NotContains(t, item.Description, "hidden-channel")
	}

	related, ok := FindPublicDocsEndpoint(items, "related:GET:~v1~videos~_id_")
	require.True(t, ok)
	assert.Equal(t, DocsKindRelated, related.Kind)
	assert.True(t, related.TryIt)
	assert.Equal(t, "/v1/videos/{id}", related.Path)
	assert.NotContains(t, related.Id, "/")

	page := RenderPublicDocsEndpoint(items[1], "https://example.com")
	assert.Equal(t, "ad-seedance-2.0-480p", page.Model)
	assert.Equal(t, "ad-seedance-2.0-480p", page.RequiredParams[0].Description)
}

func TestBuildPublicDocsCatalogSkipsUnpublishedAndDisabledChannels(t *testing.T) {
	channels := []*model.Channel{
		{
			Id:            1,
			Status:        common.ChannelStatusEnabled,
			Models:        "gpt-4o",
			OtherSettings: marshalChannelApiDocs(t, &dto.ChannelApiDocs{Published: false, Path: "/v1/chat/completions"}),
		},
		{
			Id:            2,
			Status:        common.ChannelStatusAutoDisabled,
			Models:        "gpt-4o-mini",
			OtherSettings: marshalChannelApiDocs(t, &dto.ChannelApiDocs{Published: true, Path: "/v1/chat/completions"}),
		},
	}
	items := BuildPublicDocsCatalog(channels)
	require.GreaterOrEqual(t, len(items), 1)
	assert.Equal(t, "models", items[0].Id)
	for _, item := range items {
		assert.NotEqual(t, "model:gpt-4o", item.Id)
		assert.NotEqual(t, "model:gpt-4o-mini", item.Id)
	}
}

func TestBuildPublicDocsCatalogTryItOnlyWhenChannelEnablesIt(t *testing.T) {
	channels := []*model.Channel{
		{
			Id:     1,
			Status: common.ChannelStatusEnabled,
			Models: "ad-seedance-2.0-480p",
			OtherSettings: marshalChannelApiDocs(t, &dto.ChannelApiDocs{
				Published: true,
				TryIt:     false,
				Category:  "video",
				Method:    "POST",
				Path:      "/v1/videos",
				RelatedEndpoints: []dto.ChannelApiDocRelated{
					{Method: "GET", Path: "/v1/videos/{id}", Title: "Video task query", TryIt: true},
				},
			}),
		},
		{
			Id:     2,
			Status: common.ChannelStatusEnabled,
			Models: "ad-seedance-2.0-720p",
			OtherSettings: marshalChannelApiDocs(t, &dto.ChannelApiDocs{
				Published: true,
				TryIt:     true,
				Category:  "video",
				Method:    "POST",
				Path:      "/v1/videos",
			}),
		},
	}

	items := BuildPublicDocsCatalog(channels)
	listed, ok := FindPublicDocsEndpoint(items, "model:ad-seedance-2.0-480p")
	require.True(t, ok)
	assert.False(t, listed.TryIt)

	related, ok := FindPublicDocsEndpoint(items, "related:GET:~v1~videos~_id_")
	require.True(t, ok)
	assert.False(t, related.TryIt)

	tryable, ok := FindPublicDocsEndpoint(items, "model:ad-seedance-2.0-720p")
	require.True(t, ok)
	assert.True(t, tryable.TryIt)
	assert.True(t, tryable.Async)
	require.NotEmpty(t, tryable.Related)
	assert.Equal(t, "/v1/videos/{id}", tryable.Related[0].Path)
}

func TestBuildPublicDocsCatalogInjectsVideoPollAndKeepsCustomerFacingIds(t *testing.T) {
	channels := []*model.Channel{
		{
			Id:     1,
			Status: common.ChannelStatusEnabled,
			Models: "ad-seedance-2.0-480p",
			OtherSettings: marshalChannelApiDocs(t, &dto.ChannelApiDocs{
				Published: true,
				TryIt:     true,
				Category:  "video",
				Method:    "POST",
				Path:      "/v1/videos",
			}),
		},
	}

	items := BuildPublicDocsCatalog(channels)
	modelItem, ok := FindPublicDocsEndpoint(items, "model:ad-seedance-2.0-480p")
	require.True(t, ok)
	assert.True(t, modelItem.Async)
	require.Len(t, modelItem.Related, 2)
	assert.Equal(t, "related:GET:~v1~videos~_id_", modelItem.Related[0].Id)
	assert.Equal(t, "/v1/videos/{id}", modelItem.Related[0].Path)
	assert.Equal(t, "/v1/videos/{id}/content", modelItem.Related[1].Path)
	assert.NotContains(t, modelItem.Related[0].Title, "channel")

	related, ok := FindPublicDocsEndpoint(items, "related:GET:~v1~videos~_id_")
	require.True(t, ok)
	assert.True(t, related.Async)
	assert.Equal(t, "/v1/videos/{id}", related.Path)
	assert.True(t, related.TryIt)

	result, ok := FindPublicDocsEndpoint(items, "related:GET:~v1~videos~_id_~content")
	require.True(t, ok)
	assert.Equal(t, "/v1/videos/{id}/content", result.Path)
	assert.Equal(t, "Get video result", result.Title)
}

func TestBuildPublicDocsCatalogKeepsChannelFilledParams(t *testing.T) {
	channels := []*model.Channel{
		{
			Id:     1,
			Status: common.ChannelStatusEnabled,
			Models: "gpt-image-2",
			OtherSettings: marshalChannelApiDocs(t, &dto.ChannelApiDocs{
				Published: true,
				TryIt:     true,
				Category:  "image",
				Method:    "POST",
				Path:      "/v1/images/generations",
				Title:     "gpt-image-2 · 图片生成",
				RequiredParams: []dto.ChannelApiDocParam{
					{Name: "count", Type: "int", Default: "1"},
				},
				OptionalParams: []dto.ChannelApiDocParam{
					{Name: "quality", Type: "string", Range: "2k,4k,1080P"},
				},
				Capabilities: []dto.ChannelApiDocTag{
					{Label: "web-serach", Value: "True"},
				},
			}),
		},
	}

	items := BuildPublicDocsCatalog(channels)
	generate, ok := FindPublicDocsEndpoint(items, "model:gpt-image-2")
	require.True(t, ok)
	assert.Equal(t, "gpt-image-2 · 图片生成", generate.Title)
	require.Len(t, generate.RequiredParams, 1)
	assert.Equal(t, "count", generate.RequiredParams[0].Name)
	require.Len(t, generate.OptionalParams, 1)
	assert.Equal(t, "quality", generate.OptionalParams[0].Name)
	assert.Equal(t, "2k,4k,1080P", generate.OptionalParams[0].Range)
	require.Len(t, generate.Capabilities, 1)
	assert.Equal(t, "web-serach", generate.Capabilities[0].Label)
	assert.Equal(t, "True", generate.Capabilities[0].Value)
	_, editExists := FindPublicDocsEndpoint(items, "model:gpt-image-2:edits")
	assert.False(t, editExists)
}

func TestBuildPublicDocsCatalogUsesPerModelDescription(t *testing.T) {
	channels := []*model.Channel{
		{
			Id:     1,
			Status: common.ChannelStatusEnabled,
			Models: "gpt-image-2, gpt-image-2-hd",
			OtherSettings: marshalChannelApiDocs(t, &dto.ChannelApiDocs{
				Published:   true,
				Category:    "image",
				Method:      "POST",
				Path:        "/v1/images/generations",
				Description: "Shared fallback",
				Models: map[string]*dto.ChannelApiDocs{
					"gpt-image-2": {
						Description: "Standard image docs",
					},
					"gpt-image-2-hd": {
						Description: "HD image extra fee",
					},
				},
			}),
		},
	}

	items := BuildPublicDocsCatalog(channels)
	standard, ok := FindPublicDocsEndpoint(items, "model:gpt-image-2")
	require.True(t, ok)
	assert.Equal(t, "Standard image docs", standard.Description)

	hd, ok := FindPublicDocsEndpoint(items, "model:gpt-image-2-hd")
	require.True(t, ok)
	assert.Equal(t, "HD image extra fee", hd.Description)
}

func TestBuildPublicDocsCatalogIncludesPublishedStandaloneArticle(t *testing.T) {
	items := BuildPublicDocsCatalog(nil)
	article, ok := FindPublicDocsEndpoint(items, "billing-formula")
	require.True(t, ok)
	assert.Equal(t, DocsKindArticle, article.Kind)
	assert.Equal(t, DocsCategoryQuickstart, article.Category)
	assert.False(t, article.TryIt)
	assert.Contains(t, article.Description, "v2:")
}

func marshalChannelApiDocs(t *testing.T, docs *dto.ChannelApiDocs) string {
	t.Helper()
	raw, err := common.Marshal(dto.ChannelOtherSettings{ApiDocs: docs})
	require.NoError(t, err)
	return string(raw)
}

func collectIDs(items []PublicDocsEndpoint, kind string) []string {
	ids := make([]string, 0)
	for _, item := range items {
		if item.Kind == kind {
			ids = append(ids, item.Id)
		}
	}
	return ids
}
