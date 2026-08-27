package helper

import (
	"encoding/json"
	"mime"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

// NormalizeBillingView merges JSON and form/multipart fields into one JSON
// document so param() can read seconds/duration/n regardless of content type.
func NormalizeBillingView(c *gin.Context, raw []byte) []byte {
	view := raw
	if len(view) == 0 || !gjson.ValidBytes(view) {
		view = []byte("{}")
	}

	if c == nil || c.Request == nil {
		return aliasBillingFields(view)
	}

	contentType, _, _ := mime.ParseMediaType(c.Request.Header.Get("Content-Type"))
	if strings.HasPrefix(contentType, "application/json") {
		return aliasBillingFields(view)
	}

	_ = c.Request.ParseMultipartForm(32 << 20)
	_ = c.Request.ParseForm()
	merged := view
	form := url.Values{}
	if c.Request.MultipartForm != nil {
		form = c.Request.MultipartForm.Value
	}
	if c.Request.PostForm != nil {
		for k, vs := range c.Request.PostForm {
			if _, ok := form[k]; !ok {
				form[k] = vs
			}
		}
	}
	for key, values := range form {
		if len(values) == 0 {
			continue
		}
		merged, _ = sjson.SetBytes(merged, key, coerceFormValue(values[0]))
	}
	return aliasBillingFields(merged)
}

func aliasBillingFields(view []byte) []byte {
	out := view
	if seconds := firstExisting(view, "seconds", "duration", "durationSeconds", "metadata.durationSeconds"); seconds != "" {
		out, _ = sjson.SetBytes(out, "seconds", coerceFormValue(seconds))
	}
	if duration := firstExisting(view, "duration", "seconds", "durationSeconds"); duration != "" {
		out, _ = sjson.SetBytes(out, "duration", coerceFormValue(duration))
	}
	return out
}

func firstExisting(body []byte, paths ...string) string {
	for _, path := range paths {
		res := gjson.GetBytes(body, path)
		if res.Exists() && res.String() != "" {
			return res.String()
		}
	}
	return ""
}

func coerceFormValue(raw string) interface{} {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if raw == "true" {
		return true
	}
	if raw == "false" {
		return false
	}
	if f, err := json.Number(raw).Float64(); err == nil {
		return f
	}
	return raw
}
