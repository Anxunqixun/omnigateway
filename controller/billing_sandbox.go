package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func PostBillingSandbox(c *gin.Context) {
	var req service.BillingSandboxRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, service.EvaluateBillingSandbox(req))
}
