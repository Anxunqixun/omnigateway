package service

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/pkg/billingexpr"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/setting/billing_setting"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/gin-gonic/gin"
)

func TestBaselineRatioModelsSkipExpr(t *testing.T) {
	if billing_setting.GetBillingMode("gpt-4o") != billing_setting.BillingModeRatio {
		t.Fatalf("default model must stay on ratio billing")
	}
	info := &relaycommon.RelayInfo{}
	ok, quota, result := TryTieredSettle(info, billingexpr.TokenParams{P: 10, C: 10})
	if ok || quota != 0 || result != nil {
		t.Fatalf("ratio models must not enter expr settle: ok=%v quota=%d result=%v", ok, quota, result)
	}
}

func TestV1SettleErrorFallsBackToPreconsume(t *testing.T) {
	info := &relaycommon.RelayInfo{
		FinalPreConsumedQuota: 77,
		TieredBillingSnapshot: &billingexpr.BillingSnapshot{
			BillingMode:              "tiered_expr",
			ExprString:               `invalid +-+ expr`,
			ExprHash:                 billingexpr.ExprHashString(`invalid +-+ expr`),
			GroupRatio:               1,
			QuotaPerUnit:             500000,
			ExprVersion:              1,
			EstimatedQuotaAfterGroup: 77,
		},
	}
	ok, quota, _ := TryTieredSettle(info, billingexpr.TokenParams{P: 1})
	if !ok || quota != 77 {
		t.Fatalf("v1 must keep preconsume, got ok=%v quota=%d", ok, quota)
	}
	if info.BillingSettleError != "" {
		t.Fatalf("v1 should not set BillingSettleError")
	}
}

func TestV2SettleErrorKeepsPreconsumeAndFlags(t *testing.T) {
	info := &relaycommon.RelayInfo{
		FinalPreConsumedQuota: 88,
		TieredBillingSnapshot: &billingexpr.BillingSnapshot{
			BillingMode:              "tiered_expr",
			ExprString:               `v2:invalid +-+ expr`,
			ExprHash:                 billingexpr.ExprHashString(`v2:invalid +-+ expr`),
			GroupRatio:               1,
			QuotaPerUnit:             500000,
			ExprVersion:              2,
			EstimatedQuotaAfterGroup: 88,
		},
	}
	ok, quota, _ := TryTieredSettle(info, billingexpr.TokenParams{P: 1})
	if !ok || quota != 88 {
		t.Fatalf("v2 must keep preconsume, got ok=%v quota=%d", ok, quota)
	}
	if info.BillingSettleError == "" {
		t.Fatal("v2 must record BillingSettleError")
	}
}

func TestFormBillingViewAliasesSeconds(t *testing.T) {
	gin.SetMode(gin.TestMode)
	form := url.Values{}
	form.Set("duration", "8")
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = req
	view := helper.NormalizeBillingView(c, nil)
	if string(view) == "" || !strings.Contains(string(view), `"seconds"`) {
		t.Fatalf("form view should alias seconds: %s", view)
	}
}

func TestSandboxPreconsumeAndSettleDelta(t *testing.T) {
	common.QuotaPerUnit = 500000
	result := EvaluateBillingSandbox(BillingSandboxRequest{
		Expr:       `v2:num(param("seconds"), resp("data.duration"), 0) * 0.17`,
		CostExpr:   `v2:0.05`,
		GroupRatio: 1,
		Request:    []byte(`{"seconds":4}`),
		Response:   []byte(`{"data":{"duration":10}}`),
	})
	if result.PreconsumeError != "" || result.SettleError != "" {
		t.Fatalf("sandbox errors: %#v", result)
	}
	if result.PreconsumeQuota != 340000 {
		t.Fatalf("preconsume=%d want 340000", result.PreconsumeQuota)
	}
	if result.SettleQuota != 850000 {
		t.Fatalf("settle=%d want 850000", result.SettleQuota)
	}
	if result.DeltaQuota != 510000 {
		t.Fatalf("delta=%d", result.DeltaQuota)
	}
	if result.CostQuota == nil || *result.CostQuota != 25000 {
		t.Fatalf("cost=%v", result.CostQuota)
	}
}

func TestAttachSettledUsageViewLastChunk(t *testing.T) {
	info := &relaycommon.RelayInfo{BillingRequestInput: &billingexpr.RequestInput{}}
	AttachSettledUsageView(info, &dto.Usage{PromptTokens: 11, CompletionTokens: 7, TotalTokens: 18})
	if info.BillingRequestInput == nil || !strings.Contains(string(info.BillingRequestInput.ResponseBody), `"prompt_tokens":11`) {
		t.Fatalf("usage view = %s", info.BillingRequestInput.ResponseBody)
	}
}

func TestUsageAliasAndMissingFieldDoesNotGuess(t *testing.T) {
	_ = config.GlobalConfig.LoadFromDB(map[string]string{
		"billing_setting.usage_alias": `{"alias-model":{"prompt":"usage.missing"}}`,
	})
	cost, _, err := billingexpr.RunExprWithRequest(
		`num(usage("prompt"), 0)`,
		billingexpr.TokenParams{},
		billingexpr.RequestInput{
			ResponseBody: []byte(`{"usage":{"prompt_tokens":99}}`),
			UsageAliases: map[string]string{"prompt": "usage.missing"},
		},
	)
	if err != nil {
		t.Fatal(err)
	}
	if cost != 0 {
		t.Fatalf("missing mapped field must not guess tokens, got %f", cost)
	}
}
