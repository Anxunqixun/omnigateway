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
