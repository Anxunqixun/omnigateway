package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/pkg/billingexpr"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestComputeCostQuotaMissingExprIsUnknown(t *testing.T) {
	cost, err := ComputeCostQuota("unset-cost-model", billingexpr.RequestInput{}, billingexpr.TokenParams{P: 10}, 0)
	if err != nil {
		t.Fatal(err)
	}
	if cost != nil {
		t.Fatalf("expected nil cost, got %v", *cost)
	}
}

func TestComputeCostQuotaDoesNotApplyGroupRatio(t *testing.T) {
	common.QuotaPerUnit = 500000
	cfg := config.GlobalConfig.Get("billing_setting")
	if cfg == nil {
		t.Fatal("billing_setting not registered")
	}
	_ = config.GlobalConfig.LoadFromDB(map[string]string{
		"billing_setting.cost_expr": `{"cost-only-model":"v2:0.2"}`,
	})
	cost, err := ComputeCostQuota("cost-only-model", billingexpr.RequestInput{}, billingexpr.TokenParams{}, 0)
	if err != nil {
		t.Fatal(err)
	}
	if cost == nil {
		t.Fatal("expected cost")
	}
	if *cost != 100000 {
		t.Fatalf("cost=%d want 100000 (0.2 * 500000, no group discount)", *cost)
	}
}

func TestAttachDualLedgerCostFailureKeepsSell(t *testing.T) {
	common.QuotaPerUnit = 500000
	_ = config.GlobalConfig.LoadFromDB(map[string]string{
		"billing_setting.cost_expr": `{"broken-cost":"v2:invalid +-+ expr"}`,
	})
	other := map[string]interface{}{}
	info := &relaycommon.RelayInfo{}
	cost := AttachDualLedger(other, info, "broken-cost", 12345, billingexpr.TokenParams{})
	if cost != nil {
		t.Fatalf("expected nil cost on failure, got %v", *cost)
	}
	if other["cost_unknown"] != true {
		t.Fatalf("expected cost_unknown, got %#v", other)
	}
	if other["sell_quota"] != 12345 {
		t.Fatalf("sell quota changed: %#v", other["sell_quota"])
	}
}

func TestAttachDualLedgerWorksOnTokenModeWithoutSellExpr(t *testing.T) {
	common.QuotaPerUnit = 500000
	require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{
		"billing_setting.billing_mode": `{}`,
		"billing_setting.billing_expr": `{}`,
		"billing_setting.cost_expr":    `{"token-cost-model":"v2:0.2"}`,
	}))
	other := map[string]interface{}{}
	cost := AttachDualLedger(other, &relaycommon.RelayInfo{}, "token-cost-model", 250000, billingexpr.TokenParams{})
	require.NotNil(t, cost)
	assert.Equal(t, 100000, *cost)
	assert.Equal(t, 250000, other["sell_quota"])
	assert.Equal(t, 100000, other["cost_quota"])
	assert.Equal(t, 150000, other["profit_quota"])
}
