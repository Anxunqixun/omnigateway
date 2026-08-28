package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/setting/docs_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildAdminDocsItemsIncludesStandaloneAndChannelDocs(t *testing.T) {
	channels := []*model.Channel{
		{
			Id:     5,
			Name:   "seedance",
			Status: 1,
			OtherSettings: marshalChannelApiDocs(t, &dto.ChannelApiDocs{
				Published:   true,
				TryIt:       true,
				Category:    "video",
				Method:      "POST",
				Path:        "/v1/videos",
				Title:       "Seedance video",
				Description: "channel body",
				Models: map[string]*dto.ChannelApiDocs{
					"ad-seedance-2.0-720p": {
						Path:  "https://mjnewapi.diwdiw.cn/v1/videos",
						Title: "720p override",
					},
				},
			}),
		},
		{
			Id:            6,
			Name:          "empty",
			OtherSettings: "{}",
		},
	}

	items := BuildAdminDocsItems(channels, []docs_setting.StandaloneDoc{{
		Id:        "billing-formula",
		Kind:      docs_setting.StandaloneKindArticle,
		Published: true,
		Title:     "Billing formula guide",
		Category:  "quickstart",
	}})

	require.Len(t, items, 3)
	assert.Equal(t, DocsSourceStandalone, items[0].Source)
	assert.Equal(t, "billing-formula", items[0].Id)
	assert.Equal(t, DocsSourceChannel, items[1].Source)
	assert.Equal(t, "channel:5", items[1].Id)
	assert.Equal(t, 5, items[1].ChannelId)
	assert.Equal(t, "seedance", items[1].ChannelName)
	assert.Equal(t, 1, items[1].ChannelStatus)
	assert.Equal(t, "/v1/videos", items[1].Path)
	assert.Equal(t, "channel:5:model:ad-seedance-2.0-720p", items[2].Id)
	assert.Equal(t, "ad-seedance-2.0-720p", items[2].Model)
	assert.Equal(t, "https://mjnewapi.diwdiw.cn/v1/videos", items[2].Path)
	assert.Equal(t, "720p override", items[2].Title)
	assert.True(t, items[2].Published)
}

func TestApplyChannelAdminDocUpdatesDefaultWithoutDroppingOverrides(t *testing.T) {
	existing := &dto.ChannelApiDocs{
		Published: true,
		Path:      "/v1/videos",
		Title:     "Old",
		Models: map[string]*dto.ChannelApiDocs{
			"ad-720p": {Title: "keep me"},
		},
		RelatedEndpoints: []dto.ChannelApiDocRelated{{Path: "/v1/videos/{id}"}},
	}

	next, err := ApplyChannelAdminDoc(existing, "", AdminDocsItem{
		Published: true,
		TryIt:     true,
		Category:  "video",
		Method:    "POST",
		Path:      "https://mjnewapi.diwdiw.cn/v1/videos",
		Title:     "New title",
		Description: "updated",
	})
	require.NoError(t, err)
	assert.Equal(t, "https://mjnewapi.diwdiw.cn/v1/videos", next.Path)
	assert.Equal(t, "New title", next.Title)
	assert.True(t, next.TryIt)
	require.NotNil(t, next.Models["ad-720p"])
	assert.Equal(t, "keep me", next.Models["ad-720p"].Title)
	require.Len(t, next.RelatedEndpoints, 1)
	assert.Equal(t, "/v1/videos/{id}", next.RelatedEndpoints[0].Path)
}

func TestApplyChannelAdminDocWritesModelOverride(t *testing.T) {
	existing := &dto.ChannelApiDocs{
		Published: true,
		Path:      "/v1/videos",
		Title:     "Default",
	}
	next, err := ApplyChannelAdminDoc(existing, "ad-720p", AdminDocsItem{
		Published: true,
		Category:  "video",
		Method:    "POST",
		Path:      "/v1/videos",
		Title:     "720p",
	})
	require.NoError(t, err)
	assert.Equal(t, "Default", next.Title)
	require.NotNil(t, next.Models["ad-720p"])
	assert.Equal(t, "720p", next.Models["ad-720p"].Title)
}

func TestRemoveChannelAdminDoc(t *testing.T) {
	existing := &dto.ChannelApiDocs{
		Title: "Default",
		Models: map[string]*dto.ChannelApiDocs{
			"ad-720p": {Title: "720p"},
		},
	}
	assert.Nil(t, RemoveChannelAdminDoc(existing, ""))
	kept := RemoveChannelAdminDoc(existing, "ad-720p")
	require.NotNil(t, kept)
	assert.Equal(t, "Default", kept.Title)
	assert.Nil(t, kept.Models)
}

func TestApplyChannelAdminDocRejectsBadPath(t *testing.T) {
	_, err := ApplyChannelAdminDoc(nil, "", AdminDocsItem{
		Title: "Nope",
		Path:  "v1/videos",
	})
	require.Error(t, err)
}

func TestBuildAdminDocsItemsSkipsNilDocs(t *testing.T) {
	items := BuildAdminDocsItems([]*model.Channel{{
		Id:            1,
		Name:          "plain",
		OtherSettings: marshalChannelOther(t, dto.ChannelOtherSettings{}),
	}}, nil)
	assert.Empty(t, items)
}

func marshalChannelOther(t *testing.T, settings dto.ChannelOtherSettings) string {
	t.Helper()
	raw, err := common.Marshal(settings)
	require.NoError(t, err)
	return string(raw)
}
