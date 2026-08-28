package service

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/billingexpr"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/setting/billing_setting"
)

// ComputeCostQuota evaluates the model cost expression against the same usage
// view as sell pricing. Group discounts are never applied. A missing formula
// returns (nil, nil) so the dashboard can show "—".
func ComputeCostQuota(modelName string, input billingexpr.RequestInput, params billingexpr.TokenParams, costRatio float64) (*int, error) {
	expr, ok := billing_setting.GetCostExpr(modelName)
	if !ok || strings.TrimSpace(expr) == "" {
		return nil, nil
	}
	return ComputeCostQuotaFromExpr(modelName, expr, input, params, costRatio)
}

func ComputeCostQuotaFromExpr(modelName, expr string, input billingexpr.RequestInput, params billingexpr.TokenParams, costRatio float64) (*int, error) {
	expr = strings.TrimSpace(expr)
	if expr == "" {
		return nil, nil
	}
	if input.UsageAliases == nil {
		input.UsageAliases = billing_setting.GetUsageAlias(modelName)
	}
	snap := &billingexpr.BillingSnapshot{
		BillingMode:  billing_setting.BillingModeTieredExpr,
		ModelName:    modelName,
		ExprString:   expr,
		ExprHash:     billingexpr.ExprHashString(expr),
		GroupRatio:   1,
		QuotaPerUnit: common.QuotaPerUnit,
		ExprVersion:  billingexpr.ExprVersion(expr),
	}
	tr, err := billingexpr.ComputeTieredQuotaWithRequest(snap, params, input)
	if err != nil {
		return nil, err
	}
	quota := tr.ActualQuotaAfterGroup
	if costRatio > 0 && costRatio != 1 {
		quota, _ = common.QuotaFromFloatChecked(float64(quota) * costRatio)
	}
	return &quota, nil
}

func channelCostRatio(relayInfo *relaycommon.RelayInfo) float64 {
	if relayInfo == nil || relayInfo.ChannelMeta == nil || relayInfo.ChannelOtherSettings.CostRatio == nil {
		return 0
	}
	return *relayInfo.ChannelOtherSettings.CostRatio
}

// AttachDualLedger writes sell/cost/profit onto the consume log Other map.
// Cost failures only mark cost_unknown; they never change the user charge.
func AttachDualLedger(other map[string]interface{}, relayInfo *relaycommon.RelayInfo, modelName string, sellQuota int, params billingexpr.TokenParams) *int {
	if other == nil {
		return nil
	}
	other["sell_quota"] = sellQuota
	input := billingexpr.RequestInput{}
	if relayInfo != nil && relayInfo.BillingRequestInput != nil {
		input = *relayInfo.BillingRequestInput
	}
	cost, err := ComputeCostQuota(modelName, input, params, channelCostRatio(relayInfo))
	if err != nil {
		other["cost_unknown"] = true
		adminInfo, _ := other["admin_info"].(map[string]interface{})
		if adminInfo == nil {
			adminInfo = map[string]interface{}{}
			other["admin_info"] = adminInfo
		}
		adminInfo["cost_error"] = err.Error()
		return nil
	}
	if cost == nil {
		other["cost_unknown"] = true
		return nil
	}
	profit := sellQuota - *cost
	other["cost_quota"] = *cost
	other["profit_quota"] = profit
	return cost
}

func resolveTaskCostExpr(task *model.Task) string {
	if task == nil {
		return ""
	}
	if bc := task.PrivateData.BillingContext; bc != nil {
		if expr := strings.TrimSpace(bc.CostExpr); expr != "" {
			return expr
		}
	}
	expr, ok := billing_setting.GetCostExpr(taskModelName(task))
	if !ok {
		return ""
	}
	return strings.TrimSpace(expr)
}

func attachTaskDualLedger(other map[string]interface{}, task *model.Task, sellQuota int, input billingexpr.RequestInput, params billingexpr.TokenParams) *int {
	if other == nil {
		return nil
	}
	other["sell_quota"] = sellQuota
	cost, err := ComputeCostQuotaFromExpr(taskModelName(task), resolveTaskCostExpr(task), input, params, 0)
	if err != nil {
		other["cost_unknown"] = true
		adminInfo, _ := other["admin_info"].(map[string]interface{})
		if adminInfo == nil {
			adminInfo = map[string]interface{}{}
			other["admin_info"] = adminInfo
		}
		adminInfo["cost_error"] = err.Error()
		return nil
	}
	if cost == nil {
		other["cost_unknown"] = true
		return nil
	}
	other["cost_quota"] = *cost
	other["profit_quota"] = sellQuota - *cost
	return cost
}

func tokenParamsFromCounts(prompt, completion int) billingexpr.TokenParams {
	return billingexpr.TokenParams{
		P:   float64(prompt),
		C:   float64(completion),
		Len: float64(prompt),
	}
}
