package service

import (
	"fmt"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/setting/docs_setting"
)

const (
	DocsSourceStandalone = "standalone"
	DocsSourceChannel    = "channel"
)

type AdminDocsItem struct {
	Source            string                   `json:"source"`
	Id                string                   `json:"id"`
	ChannelId         int                      `json:"channel_id,omitempty"`
	ChannelName       string                   `json:"channel_name,omitempty"`
	ChannelStatus     int                      `json:"channel_status,omitempty"`
	Model             string                   `json:"model,omitempty"`
	Kind              string                   `json:"kind"`
	Published         bool                     `json:"published,omitempty"`
	TryIt             bool                     `json:"try_it,omitempty"`
	Category          string                   `json:"category,omitempty"`
	Method            string                   `json:"method,omitempty"`
	Path              string                   `json:"path,omitempty"`
	Title             string                   `json:"title,omitempty"`
	Description       string                   `json:"description,omitempty"`
	RequiredParams    []dto.ChannelApiDocParam `json:"required_params,omitempty"`
	OptionalParams    []dto.ChannelApiDocParam `json:"optional_params,omitempty"`
	RequestExample    string                   `json:"request_example,omitempty"`
	ResponseExample   string                   `json:"response_example,omitempty"`
}

func BuildAdminDocsItems(channels []*model.Channel, standalone []docs_setting.StandaloneDoc) []AdminDocsItem {
	items := make([]AdminDocsItem, 0, len(standalone)+len(channels))
	for _, doc := range standalone {
		items = append(items, standaloneToAdminDoc(doc))
	}
	sorted := append([]*model.Channel(nil), channels...)
	sort.SliceStable(sorted, func(i, j int) bool {
		return sorted[i].Id < sorted[j].Id
	})
	for _, channel := range sorted {
		if channel == nil {
			continue
		}
		docs := channel.GetOtherSettings().ApiDocs
		if docs == nil {
			continue
		}
		items = append(items, channelToAdminDoc(channel, docs, ""))
		modelNames := make([]string, 0, len(docs.Models))
		for name, override := range docs.Models {
			if strings.TrimSpace(name) == "" || override == nil {
				continue
			}
			modelNames = append(modelNames, strings.TrimSpace(name))
		}
		sort.Strings(modelNames)
		for _, name := range modelNames {
			items = append(items, channelToAdminDoc(channel, docs.ForModel(name), name))
		}
	}
	return items
}

func ApplyChannelAdminDoc(existing *dto.ChannelApiDocs, modelName string, patch AdminDocsItem) (*dto.ChannelApiDocs, error) {
	path := strings.TrimSpace(patch.Path)
	if !docs_setting.ValidDocsEndpointPath(path) {
		return nil, fmt.Errorf("endpoint path must be a /path or an http(s) URL")
	}
	title := strings.TrimSpace(patch.Title)
	if title == "" {
		return nil, fmt.Errorf("document title is required")
	}
	docs := cloneChannelApiDocs(existing)
	if docs == nil {
		docs = &dto.ChannelApiDocs{}
	}
	modelName = strings.TrimSpace(modelName)
	if modelName == "" {
		applyAdminDocFields(docs, patch, path, title)
		return docs, nil
	}
	if docs.Models == nil {
		docs.Models = map[string]*dto.ChannelApiDocs{}
	}
	override := cloneChannelApiDocs(docs.Models[modelName])
	if override == nil {
		override = &dto.ChannelApiDocs{}
	}
	applyAdminDocFields(override, patch, path, title)
	docs.Models[modelName] = override
	docs.Published = patch.Published
	docs.TryIt = patch.TryIt
	return docs, nil
}

func RemoveChannelAdminDoc(existing *dto.ChannelApiDocs, modelName string) *dto.ChannelApiDocs {
	if existing == nil {
		return nil
	}
	modelName = strings.TrimSpace(modelName)
	if modelName == "" {
		return nil
	}
	docs := cloneChannelApiDocs(existing)
	if docs == nil || len(docs.Models) == 0 {
		return docs
	}
	delete(docs.Models, modelName)
	if len(docs.Models) == 0 {
		docs.Models = nil
	}
	return docs
}

func standaloneToAdminDoc(doc docs_setting.StandaloneDoc) AdminDocsItem {
	return AdminDocsItem{
		Source:         DocsSourceStandalone,
		Id:             doc.Id,
		Kind:           doc.Kind,
		Published:      doc.Published,
		TryIt:          doc.TryIt,
		Category:       doc.Category,
		Method:         doc.Method,
		Path:           doc.Path,
		Title:          doc.Title,
		Description:    doc.Description,
		RequiredParams: cloneDocParams(doc.RequiredParams),
		OptionalParams: cloneDocParams(doc.OptionalParams),
		RequestExample: doc.RequestExample,
		ResponseExample: doc.ResponseExample,
	}
}

func channelToAdminDoc(channel *model.Channel, docs *dto.ChannelApiDocs, modelName string) AdminDocsItem {
	title := strings.TrimSpace(docs.Title)
	if title == "" {
		if modelName != "" {
			title = modelName
		} else {
			title = strings.TrimSpace(channel.Name)
		}
	}
	item := AdminDocsItem{
		Source:          DocsSourceChannel,
		Id:              channelAdminDocID(channel.Id, modelName),
		ChannelId:       channel.Id,
		ChannelName:     strings.TrimSpace(channel.Name),
		ChannelStatus:   channel.Status,
		Model:           modelName,
		Kind:            docs_setting.StandaloneKindEndpoint,
		Published:       docs.Published,
		TryIt:           docs.TryIt,
		Category:        docs.Category,
		Method:          normalizeDocsMethod(docs.Method),
		Path:            strings.TrimSpace(docs.Path),
		Title:           title,
		Description:     docs.Description,
		RequiredParams:  cloneDocParams(docs.RequiredParams),
		OptionalParams:  cloneDocParams(docs.OptionalParams),
		RequestExample:  docs.RequestExample,
		ResponseExample: docs.ResponseExample,
	}
	return item
}

func channelAdminDocID(channelId int, modelName string) string {
	if strings.TrimSpace(modelName) == "" {
		return fmt.Sprintf("channel:%d", channelId)
	}
	return fmt.Sprintf("channel:%d:model:%s", channelId, strings.TrimSpace(modelName))
}

func applyAdminDocFields(dst *dto.ChannelApiDocs, patch AdminDocsItem, path, title string) {
	dst.Published = patch.Published
	dst.TryIt = patch.TryIt
	dst.Category = strings.TrimSpace(patch.Category)
	dst.Method = normalizeDocsMethod(patch.Method)
	dst.Path = path
	dst.Title = title
	dst.Description = patch.Description
	dst.RequiredParams = cloneDocParams(patch.RequiredParams)
	dst.OptionalParams = cloneDocParams(patch.OptionalParams)
	dst.RequestExample = patch.RequestExample
	dst.ResponseExample = patch.ResponseExample
}

func cloneChannelApiDocs(docs *dto.ChannelApiDocs) *dto.ChannelApiDocs {
	if docs == nil {
		return nil
	}
	cloned := *docs
	if len(docs.Models) > 0 {
		cloned.Models = make(map[string]*dto.ChannelApiDocs, len(docs.Models))
		for name, item := range docs.Models {
			if item == nil {
				continue
			}
			child := *item
			cloned.Models[name] = &child
		}
	}
	return &cloned
}
