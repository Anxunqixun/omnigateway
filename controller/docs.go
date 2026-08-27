package controller

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/docs_setting"
	"github.com/gin-gonic/gin"
)

type docsCatalogItem struct {
	Id       string `json:"id"`
	Title    string `json:"title"`
	Category string `json:"category"`
	Kind     string `json:"kind"`
	Model    string `json:"model,omitempty"`
}

type docsPage struct {
	docsCatalogItem
	Markdown string `json:"markdown"`
}

func GetDocsCatalog(c *gin.Context) {
	items := make([]docsCatalogItem, 0)
	for _, page := range docs_setting.GetHandbook() {
		if !page.Published {
			continue
		}
		items = append(items, docsCatalogItem{
			Id:       page.Id,
			Title:    page.Title,
			Category: page.Category,
			Kind:     "handbook",
		})
	}
	models, err := model.ListPublishedModelDocs()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	for _, m := range models {
		items = append(items, docsCatalogItem{
			Id:       "model:" + m.ModelName,
			Title:    m.ModelName,
			Category: "models",
			Kind:     "model",
			Model:    m.ModelName,
		})
	}
	common.ApiSuccess(c, gin.H{
		"items":      items,
		"templates":  gin.H{"chat": "chat", "image": "image", "video": "video"},
		"base_url":   publicBaseURL(c),
	})
}

func GetDocsPage(c *gin.Context) {
	slug := strings.TrimSpace(c.Param("slug"))
	base := publicBaseURL(c)
	if strings.HasPrefix(slug, "model:") {
		name := strings.TrimPrefix(slug, "model:")
		m, err := model.GetPublishedModelDoc(name)
		if err != nil || m == nil {
			common.ApiErrorMsg(c, "document not found")
			return
		}
		common.ApiSuccess(c, docsPage{
			docsCatalogItem: docsCatalogItem{
				Id:       "model:" + m.ModelName,
				Title:    m.ModelName,
				Category: "models",
				Kind:     "model",
				Model:    m.ModelName,
			},
			Markdown: renderDocsPlaceholders(m.DocsMarkdown, m.ModelName, base),
		})
		return
	}
	page, ok := docs_setting.GetHandbookPage(slug)
	if !ok {
		common.ApiErrorMsg(c, "document not found")
		return
	}
	common.ApiSuccess(c, docsPage{
		docsCatalogItem: docsCatalogItem{
			Id:       page.Id,
			Title:    page.Title,
			Category: page.Category,
			Kind:     "handbook",
		},
		Markdown: renderDocsPlaceholders(page.Markdown, "", base),
	})
}

func GetDocsTemplate(c *gin.Context) {
	kind := c.DefaultQuery("kind", "chat")
	modelName := c.DefaultQuery("model", "{{MODEL_NAME}}")
	common.ApiSuccess(c, gin.H{
		"kind":     kind,
		"markdown": renderDocsPlaceholders(docs_setting.TemplateMarkdown(kind), modelName, publicBaseURL(c)),
	})
}

func publicBaseURL(c *gin.Context) string {
	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	return scheme + "://" + c.Request.Host
}

func renderDocsPlaceholders(markdown, modelName, baseURL string) string {
	out := strings.ReplaceAll(markdown, "{{BASE_URL}}", baseURL)
	if modelName != "" {
		out = strings.ReplaceAll(out, "{{MODEL_NAME}}", modelName)
	}
	return out
}
