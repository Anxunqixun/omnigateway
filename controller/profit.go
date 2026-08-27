package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

func GetProfitSummary(c *gin.Context) {
	channelId, _ := strconv.Atoi(c.Query("channel"))
	summary, err := model.GetProfitSummary(model.ProfitQuery{
		StartDate: c.Query("start_date"),
		EndDate:   c.Query("end_date"),
		ModelName: c.Query("model_name"),
		ChannelId: channelId,
		Group:     c.Query("group"),
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, summary)
}
