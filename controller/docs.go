package controller

import (
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/docs_setting"
	"github.com/gin-gonic/gin"
)

func GetDocsCatalog(c *gin.Context) {
	channels, err := model.ListEnabledChannelsForDocs()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	base := publicDocsBaseURL(c)
	items := service.BuildPublicDocsCatalog(channels)
	rendered := make([]service.PublicDocsEndpoint, 0, len(items))
	for _, item := range items {
		rendered = append(rendered, service.RenderPublicDocsEndpoint(item, base))
	}
	common.ApiSuccess(c, gin.H{
		"items":    rendered,
		"base_url": base,
	})
}

func GetDocsPage(c *gin.Context) {
	slug := strings.TrimSpace(c.Param("slug"))
	channels, err := model.ListEnabledChannelsForDocs()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	base := publicDocsBaseURL(c)
	item, ok := service.FindPublicDocsEndpoint(service.BuildPublicDocsCatalog(channels), slug)
	if !ok {
		common.ApiErrorMsg(c, "document not found")
		return
	}
	common.ApiSuccess(c, service.RenderPublicDocsEndpoint(item, base))
}

func GetAdminStandaloneDocs(c *gin.Context) {
	channels, err := model.ListChannelsForAdminDocs()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"items": service.BuildAdminDocsItems(channels, docs_setting.GetStandalone()),
	})
}

func PutAdminStandaloneDocs(c *gin.Context) {
	var req struct {
		Items []docs_setting.StandaloneDoc `json:"items"`
	}
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiError(c, err)
		return
	}
	items, err := docs_setting.NormalizeStandalone(req.Items)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	raw, err := common.Marshal(items)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.UpdateOption("docs_setting.standalone", string(raw)); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"items": docs_setting.GetStandalone(),
	})
}

func PutAdminChannelDocs(c *gin.Context) {
	channelId, err := strconv.Atoi(strings.TrimSpace(c.Param("id")))
	if err != nil || channelId <= 0 {
		common.ApiErrorMsg(c, "invalid channel id")
		return
	}
	var req service.AdminDocsItem
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiError(c, err)
		return
	}
	channel, err := model.GetChannelById(channelId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	settings := channel.GetOtherSettings()
	next, err := service.ApplyChannelAdminDoc(settings.ApiDocs, req.Model, req)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	settings.ApiDocs = next
	if err := model.UpdateChannelOtherSettings(channelId, settings); err != nil {
		common.ApiError(c, err)
		return
	}
	model.InitChannelCache()
	common.ApiSuccess(c, gin.H{})
}

func DeleteAdminChannelDocs(c *gin.Context) {
	channelId, err := strconv.Atoi(strings.TrimSpace(c.Param("id")))
	if err != nil || channelId <= 0 {
		common.ApiErrorMsg(c, "invalid channel id")
		return
	}
	channel, err := model.GetChannelById(channelId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	settings := channel.GetOtherSettings()
	settings.ApiDocs = service.RemoveChannelAdminDoc(settings.ApiDocs, strings.TrimSpace(c.Query("model")))
	if err := model.UpdateChannelOtherSettings(channelId, settings); err != nil {
		common.ApiError(c, err)
		return
	}
	model.InitChannelCache()
	common.ApiSuccess(c, gin.H{})
}

func publicDocsBaseURL(c *gin.Context) string {
	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	return service.PublicBaseURL(scheme, c.Request.Host)
}
