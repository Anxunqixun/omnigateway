package docs_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeStandaloneRejectsReservedAndBadSlug(t *testing.T) {
	_, err := NormalizeStandalone([]StandaloneDoc{{
		Id:    "models",
		Kind:  StandaloneKindArticle,
		Title: "Nope",
	}})
	require.Error(t, err)

	_, err = NormalizeStandalone([]StandaloneDoc{{
		Id:    "Bad Slug",
		Kind:  StandaloneKindArticle,
		Title: "Nope",
	}})
	require.Error(t, err)
}

func TestNormalizeStandaloneArticleAndEndpoint(t *testing.T) {
	items, err := NormalizeStandalone([]StandaloneDoc{
		{
			Id:          "billing-formula",
			Kind:        StandaloneKindArticle,
			Published:   true,
			Category:    "quickstart",
			Title:       "Billing formula guide",
			Description: "body",
			Path:        "/should-ignore",
			TryIt:       true,
		},
		{
			Id:        "materials",
			Kind:      StandaloneKindEndpoint,
			Published: true,
			Category:  "tools",
			Method:    "post",
			Path:      "/v1/materials",
			Title:     "Upload",
		},
	})
	require.NoError(t, err)
	require.Len(t, items, 2)
	assert.Equal(t, StandaloneKindArticle, items[0].Kind)
	assert.Empty(t, items[0].Path)
	assert.False(t, items[0].TryIt)
	assert.Equal(t, "POST", items[1].Method)
	assert.Equal(t, "/v1/materials", items[1].Path)
}

func TestNormalizeStandaloneAcceptsAbsoluteHTTPURL(t *testing.T) {
	items, err := NormalizeStandalone([]StandaloneDoc{{
		Id:        "materials",
		Kind:      StandaloneKindEndpoint,
		Published: true,
		Category:  "tools",
		Method:    "POST",
		Path:      "https://mjnewapi.diwdiw.cn/v1/materials",
		Title:     "Upload",
	}})
	require.NoError(t, err)
	require.Len(t, items, 1)
	assert.Equal(t, "https://mjnewapi.diwdiw.cn/v1/materials", items[0].Path)
}

func TestNormalizeStandaloneRejectsNonHTTPPath(t *testing.T) {
	_, err := NormalizeStandalone([]StandaloneDoc{{
		Id:    "materials",
		Kind:  StandaloneKindEndpoint,
		Title: "Upload",
		Path:  "v1/materials",
	}})
	require.Error(t, err)

	_, err = NormalizeStandalone([]StandaloneDoc{{
		Id:    "materials",
		Kind:  StandaloneKindEndpoint,
		Title: "Upload",
		Path:  "javascript:alert(1)",
	}})
	require.Error(t, err)

	_, err = NormalizeStandalone([]StandaloneDoc{{
		Id:    "materials",
		Kind:  StandaloneKindEndpoint,
		Title: "Upload",
		Path:  "//evil.example/v1",
	}})
	require.Error(t, err)
}

func TestGetStandaloneFallsBackWhenUnset(t *testing.T) {
	original := docsSetting.Standalone
	t.Cleanup(func() { docsSetting.Standalone = original })

	docsSetting.Standalone = nil
	items := GetStandalone()
	require.NotEmpty(t, items)
	assert.Equal(t, StandaloneFormulaGuideID, items[0].Id)

	docsSetting.Standalone = []StandaloneDoc{}
	assert.Empty(t, GetStandalone())
}

func TestDefaultStandaloneIncludesFormulaGuide(t *testing.T) {
	items := defaultStandalone()
	require.NotEmpty(t, items)
	assert.Equal(t, StandaloneFormulaGuideID, items[0].Id)
	assert.Equal(t, StandaloneKindArticle, items[0].Kind)
	assert.Contains(t, items[0].Description, "v2:")
	assert.Contains(t, items[0].Description, "input_seconds")
}
