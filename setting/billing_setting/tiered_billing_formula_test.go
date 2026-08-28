package billing_setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUsesExprSell(t *testing.T) {
	assert.True(t, UsesExprSell(BillingModeTieredExpr))
	assert.True(t, UsesExprSell(BillingModeFormula))
	assert.False(t, UsesExprSell(BillingModeRatio))
	assert.False(t, UsesExprSell(""))
}
