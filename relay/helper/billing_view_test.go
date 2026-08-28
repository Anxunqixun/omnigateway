package helper

import (
	"bytes"
	"mime/multipart"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"
)

func TestNormalizeBillingViewJSONAlias(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("POST", "/", bytes.NewBufferString(`{"duration":8}`))
	c.Request.Header.Set("Content-Type", "application/json")
	view := NormalizeBillingView(c, []byte(`{"duration":8}`))
	if gjson.GetBytes(view, "seconds").Num != 8 {
		t.Fatalf("seconds alias = %s", view)
	}
}

func TestNormalizeBillingViewForm(t *testing.T) {
	gin.SetMode(gin.TestMode)
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	_ = w.WriteField("seconds", "6")
	_ = w.WriteField("size", "1080p")
	_ = w.Close()
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("POST", "/", &buf)
	c.Request.Header.Set("Content-Type", w.FormDataContentType())
	view := NormalizeBillingView(c, nil)
	if gjson.GetBytes(view, "seconds").Num != 6 {
		t.Fatalf("form seconds = %s", view)
	}
	if gjson.GetBytes(view, "size").String() != "1080p" {
		t.Fatalf("form size = %s", view)
	}
}

func TestNormalizeBillingViewInputSecondsDefaults(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("POST", "/", bytes.NewBufferString(`{"duration":6}`))
	c.Request.Header.Set("Content-Type", "application/json")

	noVideo := NormalizeBillingView(c, []byte(`{"duration":6}`))
	if gjson.GetBytes(noVideo, "input_seconds").Num != 0 {
		t.Fatalf("no video input_seconds = %s", noVideo)
	}

	withVideo := NormalizeBillingView(c, []byte(`{"duration":6,"video_url":"https://x/a.mp4"}`))
	if gjson.GetBytes(withVideo, "input_seconds").Num != 15 {
		t.Fatalf("default video input_seconds = %s", withVideo)
	}

	explicit := NormalizeBillingView(c, []byte(`{"video_url":"https://x/a.mp4","input_seconds":8}`))
	if gjson.GetBytes(explicit, "input_seconds").Num != 8 {
		t.Fatalf("explicit input_seconds = %s", explicit)
	}
}

func TestStripBillingOnlyJSONRemovesInputSeconds(t *testing.T) {
	stripped := StripBillingOnlyJSON([]byte(`{"model":"x","input_seconds":8,"metadata":{"input_seconds":9,"prompt":"hi"}}`))
	if gjson.GetBytes(stripped, "input_seconds").Exists() {
		t.Fatalf("root input_seconds leaked: %s", stripped)
	}
	if gjson.GetBytes(stripped, "metadata.input_seconds").Exists() {
		t.Fatalf("metadata input_seconds leaked: %s", stripped)
	}
	if gjson.GetBytes(stripped, "metadata.prompt").String() != "hi" {
		t.Fatalf("prompt stripped: %s", stripped)
	}
}
