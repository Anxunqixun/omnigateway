package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/require"
)

func TestApplyUserModelRatioToPricingUsesOverrideAndDefault(t *testing.T) {
	pricing := []model.Pricing{
		{ModelName: "sora-2", ModelRatio: 1, ModelPrice: 0.1},
		{ModelName: "gpt-4o", ModelRatio: 2, ModelPrice: 0},
	}

	out := applyUserModelRatioToPricing(pricing, `{"sora-2":0.5}`)
	require.InDelta(t, 0.5, out[0].UserModelRatio, 1e-9)
	require.InDelta(t, 1, out[1].UserModelRatio, 1e-9)
	require.InDelta(t, 1, pricing[0].ModelRatio, 1e-9)
	require.InDelta(t, 0, pricing[0].UserModelRatio, 1e-9)

	free := applyUserModelRatioToPricing(pricing, `{"sora-2":0}`)
	require.InDelta(t, 0, free[0].UserModelRatio, 1e-9)
}
