package billingexpr

import (
	"math"
	"testing"
)

func TestParseExprVersionV2(t *testing.T) {
	v, body := ParseExprVersion("v2:param(\"seconds\") * 0.17")
	if v != ExprVersionV2 || body != `param("seconds") * 0.17` {
		t.Fatalf("version=%d body=%q", v, body)
	}
}

func TestQuotaFromExprOutputVersions(t *testing.T) {
	v1 := QuotaFromExprOutput(0.17, 1, 500000)
	if math.Abs(v1-0.17/1_000_000*500000) > 1e-9 {
		t.Fatalf("v1 conversion = %f", v1)
	}
	v2 := QuotaFromExprOutput(0.17, 2, 500000)
	if math.Abs(v2-85000) > 1e-9 {
		t.Fatalf("v2 conversion = %f", v2)
	}
}

func TestNumAndParamSeconds(t *testing.T) {
	cost, _, err := RunExprWithRequest(
		`v2:num(param("seconds"), param("duration"), 4) * 0.17`,
		TokenParams{},
		RequestInput{Body: []byte(`{"seconds":"6"}`)},
	)
	if err != nil {
		t.Fatal(err)
	}
	if math.Abs(cost-1.02) > 1e-9 {
		t.Fatalf("cost=%f want 1.02", cost)
	}
}

func TestRespAndUsageAlias(t *testing.T) {
	cost, _, err := RunExprWithRequest(
		`num(resp("usage.input_tokens"), usage("prompt")) * 0.5 + num(resp("usage.output_tokens"), usage("completion")) * 1.5`,
		TokenParams{},
		RequestInput{
			ResponseBody: []byte(`{"usage":{"input_tokens":100,"output_tokens":20}}`),
			UsageAliases: map[string]string{"prompt": "usage.input_tokens", "completion": "usage.output_tokens"},
		},
	)
	if err != nil {
		t.Fatal(err)
	}
	want := 100*0.5 + 20*1.5
	if math.Abs(cost-want) > 1e-9 {
		t.Fatalf("cost=%f want %f", cost, want)
	}
}

func TestCoalescePrefersFirstPresent(t *testing.T) {
	cost, _, err := RunExprWithRequest(
		`num(coalesce(param("missing"), param("seconds"))) * 2`,
		TokenParams{},
		RequestInput{Body: []byte(`{"seconds":5}`)},
	)
	if err != nil {
		t.Fatal(err)
	}
	if math.Abs(cost-10) > 1e-9 {
		t.Fatalf("cost=%f", cost)
	}
}
