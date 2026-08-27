package docs_setting

import (
	"strings"

	"github.com/QuantumNous/new-api/setting/config"
)

type HandbookPage struct {
	Id        string `json:"id"`
	Title     string `json:"title"`
	Category  string `json:"category"`
	Markdown  string `json:"markdown"`
	Published bool   `json:"published"`
}

type DocsSetting struct {
	Handbook []HandbookPage `json:"handbook"`
}

var docsSetting = DocsSetting{
	Handbook: defaultHandbook(),
}

func init() {
	config.GlobalConfig.Register("docs_setting", &docsSetting)
}

func GetHandbook() []HandbookPage {
	if len(docsSetting.Handbook) == 0 {
		return defaultHandbook()
	}
	out := make([]HandbookPage, 0, len(docsSetting.Handbook))
	for _, page := range docsSetting.Handbook {
		if !page.Published && page.Markdown == "" {
			continue
		}
		out = append(out, page)
	}
	if len(out) == 0 {
		return defaultHandbook()
	}
	return out
}

func GetHandbookPage(id string) (HandbookPage, bool) {
	id = strings.TrimSpace(id)
	for _, page := range GetHandbook() {
		if page.Id == id && page.Published {
			return page, true
		}
	}
	return HandbookPage{}, false
}

func TemplateMarkdown(kind string) string {
	switch strings.TrimSpace(kind) {
	case "image":
		return imageTemplate
	case "video", "video_task":
		return videoTemplate
	default:
		return chatTemplate
	}
}

func defaultHandbook() []HandbookPage {
	return []HandbookPage{
		{Id: "getting-started", Title: "Getting Started", Category: "getting-started", Published: true, Markdown: gettingStartedDoc},
		{Id: "api-reference", Title: "API Reference", Category: "api", Published: true, Markdown: apiReferenceDoc},
		{Id: "billing", Title: "Billing", Category: "billing", Published: true, Markdown: billingDoc},
	}
}

const gettingStartedDoc = `# Getting Started

## Create an API Key

Open **API Keys** in the console, create a key, and keep it secret.

## Base URL

Use this site as the OpenAI-compatible base:

` + "```" + `
{{BASE_URL}}
` + "```" + `

## First request

` + "```bash" + `
curl {{BASE_URL}}/v1/chat/completions \
  -H "Authorization: Bearer $NEW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hello"}]}'
` + "```" + `

## Common errors

| Code | Meaning |
| --- | --- |
| 401 | Invalid or missing API key |
| 403 | Group or model not allowed |
| 429 | Rate limited or insufficient quota |
`

const apiReferenceDoc = `# API Reference

This gateway keeps the official New API endpoints.

## Chat

` + "`POST /v1/chat/completions`" + ` — OpenAI chat, including stream.

## Images

` + "`POST /v1/images/generations`" + `

## Video / async tasks

Submit a task, then poll ` + "`GET /v1/videos/{id}`" + ` or the matching task query API. Do not call the upstream provider directly.

## Audio

` + "`POST /v1/audio/speech`" + ` and transcription endpoints follow the official New API surface.
`

const billingDoc = `# Billing

Prices shown in **Model Square** are **sell prices** for your group.

- Request-time prices (per token / per call / per second from request fields) are final when the formula only reads ` + "`param()`" + `.
- Response or polling models are marked **estimated**; settlement uses the same formula after usage or the final task JSON arrives.
- Failed async tasks refund the pre-consumed quota.

Cost and profit are admin-only and never appear on this page.
`

const chatTemplate = `# {{MODEL_NAME}}

## Capabilities

Chat completions with optional streaming.

## Parameters

| Field | Description |
| --- | --- |
| model | ` + "`{{MODEL_NAME}}`" + ` |
| messages | OpenAI chat messages |
| stream | Optional SSE stream |

## Billing

See Model Square. Group discounts apply to the sell price.

## Example

` + "```bash" + `
curl {{BASE_URL}}/v1/chat/completions \
  -H "Authorization: Bearer $NEW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"{{MODEL_NAME}}","messages":[{"role":"user","content":"hello"}]}'
` + "```" + `
`

const imageTemplate = `# {{MODEL_NAME}}

## Capabilities

Image generation.

## Parameters

| Field | Description |
| --- | --- |
| model | ` + "`{{MODEL_NAME}}`" + ` |
| prompt | Text prompt |
| size / quality | Provider-specific, if supported |

## Billing

Priced from the request fields configured for this model.

## Example

` + "```bash" + `
curl {{BASE_URL}}/v1/images/generations \
  -H "Authorization: Bearer $NEW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"{{MODEL_NAME}}","prompt":"a red balloon"}'
` + "```" + `
`

const videoTemplate = `# {{MODEL_NAME}}

## Capabilities

Async video generation. Submit a task, then poll until it succeeds or fails.

## Parameters

| Field | Description |
| --- | --- |
| model | ` + "`{{MODEL_NAME}}`" + ` |
| seconds / duration | Length used by billing when configured |
| prompt | Scene description |

## Billing

Quota is pre-consumed on submit and settled from the final poll JSON. Failures refund the pre-consume.

## Example

Submit through the gateway video/task endpoint, then poll ` + "`/v1/videos/{id}`" + `.
`
