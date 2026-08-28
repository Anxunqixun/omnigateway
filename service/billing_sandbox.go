package service

import (
	"encoding/json"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/pkg/billingexpr"
	"github.com/QuantumNous/new-api/setting/billing_setting"
)

type BillingSandboxRequest struct {
	Model        string                 `json:"model"`
	Expr         string                 `json:"expr"`
	CostExpr     string                 `json:"cost_expr"`
	GroupRatio   float64                `json:"group_ratio"`
	QuotaPerUnit float64                `json:"quota_per_unit"`
	Request      json.RawMessage        `json:"request"`
	Response     json.RawMessage        `json:"response"`
	Usage        billingexpr.TokenParams `json:"usage"`
}

type BillingSandboxResult struct {
	ExprVersion     int     `json:"expr_version"`
	PreconsumeQuota int     `json:"preconsume_quota"`
	SettleQuota     int     `json:"settle_quota"`
	DeltaQuota      int     `json:"delta_quota"`
	CostQuota       *int    `json:"cost_quota"`
	ProfitQuota     *int    `json:"profit_quota"`
	CostUnknown     bool    `json:"cost_unknown"`
	MatchedTier     string  `json:"matched_tier,omitempty"`
	PreconsumeError string  `json:"preconsume_error,omitempty"`
	SettleError     string  `json:"settle_error,omitempty"`
	CostError       string  `json:"cost_error,omitempty"`
	RawPreconsume   float64 `json:"raw_preconsume"`
	RawSettle       float64 `json:"raw_settle"`
}

func EvaluateBillingSandbox(req BillingSandboxRequest) BillingSandboxResult {
	expr := strings.TrimSpace(req.Expr)
	if expr == "" && req.Model != "" {
		expr, _ = billing_setting.GetBillingExpr(req.Model)
	}
	costExpr := strings.TrimSpace(req.CostExpr)
	if costExpr == "" && req.Model != "" {
		costExpr, _ = billing_setting.GetCostExpr(req.Model)
	}
	groupRatio := req.GroupRatio
	if groupRatio == 0 {
		groupRatio = 1
	}
	quotaPerUnit := req.QuotaPerUnit
	if quotaPerUnit == 0 {
		quotaPerUnit = common.QuotaPerUnit
	}

	requestBody := normalizeSandboxJSON(req.Request)
	responseBody := normalizeSandboxJSON(req.Response)
	aliases := billing_setting.GetUsageAlias(req.Model)

	preInput := billingexpr.RequestInput{Body: requestBody, UsageAliases: aliases}
	settleInput := billingexpr.RequestInput{Body: requestBody, ResponseBody: responseBody, UsageAliases: aliases}

	out := BillingSandboxResult{ExprVersion: billingexpr.ExprVersion(expr)}
	if expr == "" {
		out.PreconsumeError = "missing sell expression"
		out.SettleError = "missing sell expression"
	} else {
		preSnap := sandboxSnapshot(req.Model, expr, groupRatio, quotaPerUnit)
		if pre, err := billingexpr.ComputeTieredQuotaWithRequest(preSnap, billingexpr.TokenParams{}, preInput); err != nil {
			out.PreconsumeError = err.Error()
		} else {
			out.PreconsumeQuota = pre.ActualQuotaAfterGroup
			out.RawPreconsume = pre.ActualQuotaBeforeGroup
			out.MatchedTier = pre.MatchedTier
		}

		settleSnap := sandboxSnapshot(req.Model, expr, groupRatio, quotaPerUnit)
		if settled, err := billingexpr.ComputeTieredQuotaWithRequest(settleSnap, req.Usage, settleInput); err != nil {
			out.SettleError = err.Error()
			if out.PreconsumeQuota > 0 {
				out.SettleQuota = out.PreconsumeQuota
			}
		} else {
			out.SettleQuota = settled.ActualQuotaAfterGroup
			out.RawSettle = settled.ActualQuotaBeforeGroup
			if settled.MatchedTier != "" {
				out.MatchedTier = settled.MatchedTier
			}
		}
		out.DeltaQuota = out.SettleQuota - out.PreconsumeQuota
	}

	if costExpr == "" {
		out.CostUnknown = true
		return out
	}
	costSnap := sandboxSnapshot(req.Model, costExpr, 1, quotaPerUnit)
	cost, err := billingexpr.ComputeTieredQuotaWithRequest(costSnap, req.Usage, settleInput)
	if err != nil {
		out.CostUnknown = true
		out.CostError = err.Error()
		return out
	}
	quota := cost.ActualQuotaAfterGroup
	out.CostQuota = &quota
	profit := out.SettleQuota - quota
	out.ProfitQuota = &profit
	return out
}

func sandboxSnapshot(model, expr string, groupRatio, quotaPerUnit float64) *billingexpr.BillingSnapshot {
	return &billingexpr.BillingSnapshot{
		BillingMode:  billing_setting.BillingModeTieredExpr,
		ModelName:    model,
		ExprString:   expr,
		ExprHash:     billingexpr.ExprHashString(expr),
		GroupRatio:   groupRatio,
		QuotaPerUnit: quotaPerUnit,
		ExprVersion:  billingexpr.ExprVersion(expr),
	}
}

func normalizeSandboxJSON(raw json.RawMessage) []byte {
	if len(raw) == 0 || string(raw) == "null" {
		return []byte("{}")
	}
	if json.Valid(raw) {
		return raw
	}
	return []byte("{}")
}
