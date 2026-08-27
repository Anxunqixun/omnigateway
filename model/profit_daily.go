package model

import (
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ProfitDaily aggregates sell/cost/profit by day for the admin dashboard.
type ProfitDaily struct {
	Id               int    `json:"id" gorm:"primaryKey"`
	Date             string `json:"date" gorm:"size:10;uniqueIndex:uk_profit_daily,priority:1"`
	ModelName        string `json:"model_name" gorm:"size:128;uniqueIndex:uk_profit_daily,priority:2"`
	ChannelId        int    `json:"channel_id" gorm:"uniqueIndex:uk_profit_daily,priority:3"`
	Group            string `json:"group" gorm:"size:64;uniqueIndex:uk_profit_daily,priority:4"`
	SellQuota        int64  `json:"sell_quota"`
	CostQuota        int64  `json:"cost_quota"`
	ProfitQuota      int64  `json:"profit_quota"`
	UnknownCostCount int64  `json:"unknown_cost_count"`
	RequestCount     int64  `json:"request_count"`
}

func UpsertProfitDaily(log *Log) {
	if log == nil || (log.Type != LogTypeConsume && log.Type != LogTypeRefund) {
		return
	}
	if DB == nil {
		return
	}
	created := log.CreatedAt
	if created <= 0 {
		created = time.Now().Unix()
	}
	date := time.Unix(created, 0).UTC().Format("2006-01-02")
	sell := int64(log.Quota)
	if log.Type == LogTypeRefund {
		sell = -sell
	}
	var cost int64
	unknown := int64(0)
	if log.CostQuota != nil {
		cost = int64(*log.CostQuota)
		if log.Type == LogTypeRefund {
			cost = -cost
		}
	} else if log.Type == LogTypeConsume {
		unknown = 1
	}
	profit := int64(0)
	if log.CostQuota != nil {
		profit = sell - cost
	}
	reqCount := int64(0)
	if log.Type == LogTypeConsume {
		reqCount = 1
	}
	row := ProfitDaily{
		Date:             date,
		ModelName:        log.ModelName,
		ChannelId:        log.ChannelId,
		Group:            log.Group,
		SellQuota:        sell,
		CostQuota:        cost,
		ProfitQuota:      profit,
		UnknownCostCount: unknown,
		RequestCount:     reqCount,
	}
	_ = DB.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "date"},
			{Name: "model_name"},
			{Name: "channel_id"},
			{Name: "group"},
		},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"sell_quota":         gorm.Expr("sell_quota + ?", sell),
			"cost_quota":         gorm.Expr("cost_quota + ?", cost),
			"profit_quota":       gorm.Expr("profit_quota + ?", profit),
			"unknown_cost_count": gorm.Expr("unknown_cost_count + ?", unknown),
			"request_count":      gorm.Expr("request_count + ?", reqCount),
		}),
	}).Create(&row).Error
}

type ProfitQuery struct {
	StartDate string
	EndDate   string
	ModelName string
	ChannelId int
	Group     string
}

type ProfitSummary struct {
	SellQuota        int64            `json:"sell_quota"`
	CostQuota        int64            `json:"cost_quota"`
	ProfitQuota      int64            `json:"profit_quota"`
	UnknownCostCount int64            `json:"unknown_cost_count"`
	RequestCount     int64            `json:"request_count"`
	MarginRate       float64          `json:"margin_rate"`
	Daily            []ProfitDaily    `json:"daily"`
	ByModel          []ProfitBreakdown `json:"by_model"`
	ByChannel        []ProfitBreakdown `json:"by_channel"`
	ByGroup          []ProfitBreakdown `json:"by_group"`
}

type ProfitBreakdown struct {
	Key              string `json:"key" gorm:"column:name"`
	SellQuota        int64  `json:"sell_quota"`
	CostQuota        int64  `json:"cost_quota"`
	ProfitQuota      int64  `json:"profit_quota"`
	UnknownCostCount int64  `json:"unknown_cost_count"`
	RequestCount     int64  `json:"request_count"`
}

func applyProfitQuery(tx *gorm.DB, q ProfitQuery) *gorm.DB {
	if q.StartDate != "" {
		tx = tx.Where("date >= ?", q.StartDate)
	}
	if q.EndDate != "" {
		tx = tx.Where("date <= ?", q.EndDate)
	}
	if q.ModelName != "" {
		tx = tx.Where("model_name = ?", q.ModelName)
	}
	if q.ChannelId > 0 {
		tx = tx.Where("channel_id = ?", q.ChannelId)
	}
	if q.Group != "" {
		tx = tx.Where(commonGroupCol+" = ?", q.Group)
	}
	return tx
}

func GetProfitSummary(q ProfitQuery) (ProfitSummary, error) {
	var out ProfitSummary
	if DB == nil {
		return out, nil
	}
	tx := applyProfitQuery(DB.Model(&ProfitDaily{}), q)
	var totals ProfitDaily
	if err := tx.Select(
		"COALESCE(SUM(sell_quota),0) as sell_quota, COALESCE(SUM(cost_quota),0) as cost_quota, COALESCE(SUM(profit_quota),0) as profit_quota, COALESCE(SUM(unknown_cost_count),0) as unknown_cost_count, COALESCE(SUM(request_count),0) as request_count",
	).Scan(&totals).Error; err != nil {
		return out, err
	}
	out.SellQuota = totals.SellQuota
	out.CostQuota = totals.CostQuota
	out.ProfitQuota = totals.ProfitQuota
	out.UnknownCostCount = totals.UnknownCostCount
	out.RequestCount = totals.RequestCount
	if out.SellQuota != 0 {
		out.MarginRate = float64(out.ProfitQuota) / float64(out.SellQuota)
	}

	dailyTx := applyProfitQuery(DB.Model(&ProfitDaily{}), q)
	if err := dailyTx.Select(
		"date, SUM(sell_quota) as sell_quota, SUM(cost_quota) as cost_quota, SUM(profit_quota) as profit_quota, SUM(unknown_cost_count) as unknown_cost_count, SUM(request_count) as request_count",
	).Group("date").Order("date").Scan(&out.Daily).Error; err != nil {
		return out, err
	}

	out.ByModel, _ = getProfitBreakdown(q, "model_name")
	out.ByChannel, _ = getProfitBreakdown(q, "channel_id")
	out.ByGroup, _ = getProfitBreakdown(q, commonGroupCol)
	return out, nil
}

func getProfitBreakdown(q ProfitQuery, column string) ([]ProfitBreakdown, error) {
	var rows []ProfitBreakdown
	tx := applyProfitQuery(DB.Model(&ProfitDaily{}), q)
	err := tx.Select(
		column+" as name, SUM(sell_quota) as sell_quota, SUM(cost_quota) as cost_quota, SUM(profit_quota) as profit_quota, SUM(unknown_cost_count) as unknown_cost_count, SUM(request_count) as request_count",
	).Group(column).Order("sell_quota DESC").Limit(50).Scan(&rows).Error
	return rows, err
}
