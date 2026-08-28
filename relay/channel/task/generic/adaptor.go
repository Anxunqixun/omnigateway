package generic

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	taskdto "github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay/channel"
	taskcommon "github.com/QuantumNous/new-api/relay/channel/task/taskcommon"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relay/helper"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"
)

type TaskAdaptor struct {
	taskcommon.BaseBilling
	cfg     dto.TaskGenericConfig
	baseURL string
	apiKey  string
}

var _ channel.TaskAdaptor = (*TaskAdaptor)(nil)

func (a *TaskAdaptor) Init(info *relaycommon.RelayInfo) {
	if info == nil {
		return
	}
	a.apiKey = info.ApiKey
	if info.ChannelMeta != nil {
		a.baseURL = info.ChannelBaseUrl
		if info.ChannelOtherSettings.TaskGeneric != nil {
			a.cfg = *info.ChannelOtherSettings.TaskGeneric
		}
	}
}

func (a *TaskAdaptor) ValidateRequestAndSetAction(c *gin.Context, info *relaycommon.RelayInfo) *taskdto.TaskError {
	if err := relaycommon.ValidateBasicTaskRequest(c, info, constant.TaskActionGenerate); err != nil {
		return err
	}
	info.Action = constant.TaskActionGenerate
	return nil
}

func (a *TaskAdaptor) BuildRequestURL(info *relaycommon.RelayInfo) (string, error) {
	path := strings.TrimSpace(a.cfg.SubmitPath)
	if path == "" {
		path = "/v1/videos"
	}
	return joinURL(a.baseURL, path), nil
}

func (a *TaskAdaptor) BuildRequestHeader(c *gin.Context, req *http.Request, info *relaycommon.RelayInfo) error {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	headerName := strings.TrimSpace(a.cfg.AuthHeader)
	if headerName == "" {
		headerName = "Authorization"
	}
	prefix := a.cfg.AuthPrefix
	if prefix == "" {
		prefix = "Bearer "
	}
	req.Header.Set(headerName, prefix+info.ApiKey)
	for k, v := range a.cfg.ExtraHeaders {
		req.Header.Set(k, v)
	}
	return nil
}

func (a *TaskAdaptor) BuildRequestBody(c *gin.Context, info *relaycommon.RelayInfo) (io.Reader, error) {
	storage, err := common.GetBodyStorage(c)
	if err == nil && storage != nil {
		data, bErr := storage.Bytes()
		if bErr == nil && len(data) > 0 {
			return bytes.NewReader(helper.StripBillingOnlyJSON(data)), nil
		}
	}
	v, exists := c.Get("task_request")
	if !exists {
		return nil, fmt.Errorf("request not found in context")
	}
	data, err := common.Marshal(v)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(helper.StripBillingOnlyJSON(data)), nil
}

func (a *TaskAdaptor) DoRequest(c *gin.Context, info *relaycommon.RelayInfo, requestBody io.Reader) (*http.Response, error) {
	return channel.DoTaskApiRequest(a, c, info, requestBody)
}

func (a *TaskAdaptor) DoResponse(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (taskID string, taskData []byte, taskErr *taskdto.TaskError) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", nil, service.TaskErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}
	taskData = body
	path := strings.TrimSpace(a.cfg.TaskIDPath)
	if path == "" {
		path = "id"
	}
	taskID = gjson.GetBytes(body, path).String()
	if taskID == "" {
		taskID = gjson.GetBytes(body, "task_id").String()
	}
	if taskID == "" {
		return "", body, service.TaskErrorWrapper(fmt.Errorf("task id not found at %s", path), "invalid_response", http.StatusBadGateway)
	}
	return taskID, taskData, nil
}

func (a *TaskAdaptor) FetchTask(baseUrl, key string, body map[string]any, proxy string) (*http.Response, error) {
	taskID, _ := body["task_id"].(string)
	if taskID == "" {
		if ids, ok := body["ids"].([]string); ok && len(ids) > 0 {
			taskID = ids[0]
		}
	}
	path := strings.TrimSpace(a.cfg.PollPath)
	if path == "" {
		path = "/v1/videos/{id}"
	}
	path = strings.ReplaceAll(path, "{id}", taskID)
	path = strings.ReplaceAll(path, "{task_id}", taskID)
	req, err := http.NewRequest(http.MethodGet, joinURL(baseUrl, path), nil)
	if err != nil {
		return nil, err
	}
	headerName := strings.TrimSpace(a.cfg.AuthHeader)
	if headerName == "" {
		headerName = "Authorization"
	}
	prefix := a.cfg.AuthPrefix
	if prefix == "" {
		prefix = "Bearer "
	}
	req.Header.Set(headerName, prefix+key)
	req.Header.Set("Accept", "application/json")
	client, err := service.GetHttpClientWithProxy(proxy)
	if err != nil {
		return nil, err
	}
	return client.Do(req)
}

func (a *TaskAdaptor) ParseTaskResult(respBody []byte) (*relaycommon.TaskInfo, error) {
	info := &relaycommon.TaskInfo{}
	statusPath := strings.TrimSpace(a.cfg.StatusPath)
	if statusPath == "" {
		statusPath = "status"
	}
	rawStatus := strings.ToLower(gjson.GetBytes(respBody, statusPath).String())
	mapped := rawStatus
	if a.cfg.StatusMap != nil {
		if v, ok := a.cfg.StatusMap[rawStatus]; ok {
			mapped = v
		}
	}
	switch mapped {
	case "queued", "submitted", "created", "pending":
		info.Status = model.TaskStatusSubmitted
	case "in_progress", "processing", "running":
		info.Status = model.TaskStatusInProgress
	case "success", "succeeded", "completed", "complete":
		info.Status = model.TaskStatusSuccess
	case "failure", "failed", "error":
		info.Status = model.TaskStatusFailure
	default:
		info.Status = model.TaskStatusInProgress
	}
	resultPath := strings.TrimSpace(a.cfg.ResultURLPath)
	if resultPath == "" {
		resultPath = "url"
	}
	info.Url = gjson.GetBytes(respBody, resultPath).String()
	reasonPath := strings.TrimSpace(a.cfg.ReasonPath)
	if reasonPath == "" {
		reasonPath = "error.message"
	}
	info.Reason = gjson.GetBytes(respBody, reasonPath).String()
	info.TaskID = gjson.GetBytes(respBody, strings.TrimSpace(defaultString(a.cfg.TaskIDPath, "id"))).String()
	return info, nil
}

func (a *TaskAdaptor) GetModelList() []string {
	return []string{}
}

func (a *TaskAdaptor) GetChannelName() string {
	return "generic-task"
}

func joinURL(base, path string) string {
	return strings.TrimRight(base, "/") + "/" + strings.TrimLeft(path, "/")
}

func defaultString(val, fallback string) string {
	if strings.TrimSpace(val) == "" {
		return fallback
	}
	return val
}
