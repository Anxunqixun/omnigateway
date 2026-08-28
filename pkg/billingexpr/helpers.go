package billingexpr

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/tidwall/gjson"
)

const maxBillingListCount = 256

func gjsonLookup(body []byte, path string) interface{} {
	path = strings.TrimSpace(path)
	if path == "" || len(body) == 0 {
		return nil
	}
	result := gjson.GetBytes(body, path)
	if !result.Exists() {
		return nil
	}
	return result.Value()
}

func countPath(body []byte, path string) float64 {
	path = strings.TrimSpace(path)
	if path == "" || len(body) == 0 {
		return 0
	}
	result := gjson.GetBytes(body, path)
	if !result.Exists() {
		return 0
	}
	var n float64
	switch {
	case result.IsArray():
		n = float64(len(result.Array()))
	case result.Type == gjson.Number:
		n = result.Float()
	case result.IsObject():
		count := 0
		result.ForEach(func(_, _ gjson.Result) bool {
			count++
			return true
		})
		n = float64(count)
	default:
		return 0
	}
	if n < 0 {
		return 0
	}
	if n > maxBillingListCount {
		return maxBillingListCount
	}
	return n
}

func lookupUsageAlias(request RequestInput, alias string) interface{} {
	alias = strings.TrimSpace(alias)
	if alias == "" {
		return nil
	}
	if path, ok := request.UsageAliases[alias]; ok && strings.TrimSpace(path) != "" {
		if v := gjsonLookup(request.ResponseBody, path); v != nil {
			return v
		}
		return gjsonLookup(request.Body, path)
	}
	defaults := map[string][]string{
		"prompt":     {"usage.prompt_tokens", "usage.input_tokens", "usageMetadata.promptTokenCount"},
		"completion": {"usage.completion_tokens", "usage.output_tokens", "usageMetadata.candidatesTokenCount"},
		"total":      {"usage.total_tokens", "usageMetadata.totalTokenCount"},
		"seconds":    {"seconds", "duration", "data.task_result.videos.0.duration"},
	}
	for _, path := range defaults[alias] {
		if v := gjsonLookup(request.ResponseBody, path); v != nil {
			return v
		}
		if v := gjsonLookup(request.Body, path); v != nil {
			return v
		}
	}
	return nil
}

func numVals(args ...interface{}) float64 {
	for _, arg := range args {
		if f, ok := ToFloat(arg); ok {
			return f
		}
	}
	return 0
}

func coalesceVals(args ...interface{}) interface{} {
	for _, arg := range args {
		if arg == nil {
			continue
		}
		if s, ok := arg.(string); ok && strings.TrimSpace(s) == "" {
			continue
		}
		return arg
	}
	return nil
}

// ToFloat converts JSON-ish values to float64.
func ToFloat(v interface{}) (float64, bool) {
	if v == nil {
		return 0, false
	}
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	case int32:
		return float64(n), true
	case uint64:
		return float64(n), true
	case jsonNumber:
		f, err := n.Float64()
		return f, err == nil
	case string:
		s := strings.TrimSpace(n)
		if s == "" {
			return 0, false
		}
		f, err := strconv.ParseFloat(s, 64)
		return f, err == nil
	default:
		f, err := strconv.ParseFloat(fmt.Sprint(v), 64)
		return f, err == nil
	}
}

type jsonNumber interface {
	Float64() (float64, error)
}
