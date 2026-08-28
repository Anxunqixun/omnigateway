package router

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsBackendReservedPathKeepsDashboardApiDocsOnSpa(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name        string
		requestURI  string
		wantReserve bool
	}{
		{name: "exact api", requestURI: "/api", wantReserve: true},
		{name: "api docs admin", requestURI: "/api/docs/admin", wantReserve: true},
		{name: "api with query", requestURI: "/api/status?foo=1", wantReserve: true},
		{name: "dashboard api docs", requestURI: "/api-docs", wantReserve: false},
		{name: "dashboard api docs query", requestURI: "/api-docs?tab=article", wantReserve: false},
		{name: "dashboard api docs slash", requestURI: "/api-docs/", wantReserve: false},
		{name: "public docs", requestURI: "/docs/billing-formula", wantReserve: false},
		{name: "exact v1", requestURI: "/v1", wantReserve: true},
		{name: "v1 models", requestURI: "/v1/models", wantReserve: true},
		{name: "assets file", requestURI: "/assets/index.js", wantReserve: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.wantReserve, isBackendReservedPath(tc.requestURI))
		})
	}
}
