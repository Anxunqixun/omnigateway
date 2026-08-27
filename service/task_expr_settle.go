package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/billingexpr"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/setting/billing_setting"
)

// TrySettleTaskExprBilling recalculates task quota from the frozen expression
// and the polling response body. Returns true when the model uses expressions.
func TrySettleTaskExprBilling(ctx context.Context, task *model.Task, taskResult *relaycommon.TaskInfo, rawBody []byte) bool {
	bc := task.PrivateData.BillingContext
	if bc == nil || bc.BillingMode != billing_setting.BillingModeTieredExpr || strings.TrimSpace(bc.ExprString) == "" {
		return false
	}

	input := billingexpr.RequestInput{
		Body:         append([]byte(nil), bc.RequestBody...),
		ResponseBody: rawBody,
		UsageAliases: billing_setting.GetUsageAlias(bc.OriginModelName),
	}
	snap := &billingexpr.BillingSnapshot{
		BillingMode:  bc.BillingMode,
		ModelName:    bc.OriginModelName,
		ExprString:   bc.ExprString,
		ExprHash:     billingexpr.ExprHashString(bc.ExprString),
		GroupRatio:   bc.GroupRatio,
		QuotaPerUnit: bc.QuotaPerUnit,
		ExprVersion:  bc.ExprVersion,
	}
	if snap.QuotaPerUnit == 0 {
		snap.QuotaPerUnit = common.QuotaPerUnit
	}

	params := billingexpr.TokenParams{}
	if taskResult != nil {
		params.C = float64(taskResult.CompletionTokens)
		if taskResult.TotalTokens > 0 && params.C == 0 {
			params.C = float64(taskResult.TotalTokens)
		}
	}

	if bc != nil {
		bc.LastResponseBody = append([]byte(nil), rawBody...)
	}
	tr, err := billingexpr.ComputeTieredQuotaWithRequest(snap, params, input)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("task %s expr settle failed: %v", task.TaskID, err))
		return true
	}
	if tr.ActualQuotaAfterGroup > 0 {
		RecalculateTaskQuota(ctx, task, tr.ActualQuotaAfterGroup, "expr计费调整")
	}
	return true
}
