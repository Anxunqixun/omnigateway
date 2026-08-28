package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseUserModelRatioSkipsInvalidEntries(t *testing.T) {
	parsed, err := ParseUserModelRatio(`{"gpt-image-2":0.5,"bad":-1,"sora-2":1.2,"":3}`)
	require.NoError(t, err)
	require.Equal(t, map[string]float64{
		"gpt-image-2": 0.5,
		"sora-2":      1.2,
	}, parsed)
}

func TestLookupUserModelRatioTreatsMissingAsUnset(t *testing.T) {
	ratio, ok := LookupUserModelRatio(`{"gpt-image-2":0}`, "gpt-image-2")
	require.True(t, ok)
	assert.Equal(t, 0.0, ratio)

	_, ok = LookupUserModelRatio(`{"gpt-image-2":0.5}`, "sora-2")
	assert.False(t, ok)

	_, ok = LookupUserModelRatio("", "sora-2")
	assert.False(t, ok)
}

func TestNormalizeUserModelRatioJSONRejectsInvalidValues(t *testing.T) {
	normalized, err := NormalizeUserModelRatioJSON(`{"sora-2":1.2,"gpt-image-2":0}`)
	require.NoError(t, err)
	require.JSONEq(t, `{"gpt-image-2":0,"sora-2":1.2}`, normalized)

	_, err = NormalizeUserModelRatioJSON(`{"sora-2":-1}`)
	require.Error(t, err)

	_, err = NormalizeUserModelRatioJSON(`{"sora-2":`)
	require.Error(t, err)

	empty, err := NormalizeUserModelRatioJSON("   ")
	require.NoError(t, err)
	assert.Empty(t, empty)
}
