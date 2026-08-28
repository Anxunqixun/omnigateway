package model

import (
	"fmt"
	"math"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

func LookupUserModelRatio(raw string, modelName string) (float64, bool) {
	ratios, err := ParseUserModelRatio(raw)
	if err != nil {
		return 1, false
	}
	ratio, ok := ratios[strings.TrimSpace(modelName)]
	return ratio, ok
}

func ParseUserModelRatio(raw string) (map[string]float64, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return map[string]float64{}, nil
	}
	parsed := make(map[string]float64)
	if err := common.UnmarshalJsonStr(trimmed, &parsed); err != nil {
		return nil, err
	}
	out := make(map[string]float64, len(parsed))
	for name, ratio := range parsed {
		modelName := strings.TrimSpace(name)
		if modelName == "" {
			continue
		}
		if !validUserModelRatio(ratio) {
			continue
		}
		out[modelName] = ratio
	}
	return out, nil
}

func NormalizeUserModelRatioJSON(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", nil
	}
	parsed := make(map[string]float64)
	if err := common.UnmarshalJsonStr(trimmed, &parsed); err != nil {
		return "", err
	}
	out := make(map[string]float64, len(parsed))
	for name, ratio := range parsed {
		modelName := strings.TrimSpace(name)
		if modelName == "" {
			continue
		}
		if !validUserModelRatio(ratio) {
			return "", fmt.Errorf("invalid model_ratio for %s", modelName)
		}
		out[modelName] = ratio
	}
	if len(out) == 0 {
		return "", nil
	}
	bytes, err := common.Marshal(out)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func validUserModelRatio(ratio float64) bool {
	return !math.IsNaN(ratio) && !math.IsInf(ratio, 0) && ratio >= 0
}
