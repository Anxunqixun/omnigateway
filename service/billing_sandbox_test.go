package service

import (
	"encoding/json"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEvaluateBillingSandboxCostOnlyWithoutSellExpr(t *testing.T) {
	common.QuotaPerUnit = 500000
	out := EvaluateBillingSandbox(BillingSandboxRequest{
		CostExpr: "v2:0.2",
		Request:  json.RawMessage(`{"seconds":4}`),
		Response: json.RawMessage(`{"data":{"duration":10}}`),
	})
	require.NotNil(t, out.CostQuota)
	assert.Equal(t, 100000, *out.CostQuota)
	assert.Equal(t, "missing sell expression", out.PreconsumeError)
	assert.Equal(t, "missing sell expression", out.SettleError)
	assert.False(t, out.CostUnknown)
}

func TestEvaluateBillingSandboxCostIgnoresGroupRatio(t *testing.T) {
	common.QuotaPerUnit = 500000
	out := EvaluateBillingSandbox(BillingSandboxRequest{
		Expr:       "v2:0.01",
		CostExpr:   "v2:0.2",
		GroupRatio: 2,
		Request:    json.RawMessage(`{}`),
	})
	require.NotNil(t, out.CostQuota)
	assert.Equal(t, 10000, out.PreconsumeQuota)
	assert.Equal(t, 100000, *out.CostQuota)
}
