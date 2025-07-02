package rag

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
)

// CreateDataset 创建数据集
func (c *Client) CreateDataset(ctx context.Context, req CreateDatasetRequest) (*Dataset, error) {
	httpReq, err := c.newRequest(ctx, "POST", "datasets", req)
	if err != nil {
		return nil, err
	}

	// 直接读取响应体，兼容两种格式：
	// 1. {"code":0,"data":{...}}
	// 2. {"id":"xxx", ...}
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// 尝试第一种格式
	var wrapper CreateDatasetResponse
	if err := json.Unmarshal(body, &wrapper); err == nil && wrapper.Data.ID != "" {
		return &wrapper.Data, nil
	}

	// 尝试第二种扁平格式
	var flat Dataset
	if err := json.Unmarshal(body, &flat); err == nil && flat.ID != "" {
		return &flat, nil
	}

	return nil, fmt.Errorf("unexpected create dataset response: %s", string(body))
}

// DeleteDatasets 删除数据集（支持批量）
func (c *Client) DeleteDatasets(ctx context.Context, ids []string) error {
	reqBody := DeleteDatasetsRequest{IDs: ids}
	httpReq, err := c.newRequest(ctx, "DELETE", "datasets", reqBody)
	if err != nil {
		return err
	}
	var resp DeleteDatasetsResponse
	return c.do(httpReq, &resp)
}

// UpdateDataset 更新数据集
func (c *Client) UpdateDataset(ctx context.Context, datasetID string, req UpdateDatasetRequest) error {
	path := fmt.Sprintf("datasets/%s", datasetID)
	httpReq, err := c.newRequest(ctx, "PUT", path, req)
	if err != nil {
		return err
	}
	var resp UpdateDatasetResponse
	return c.do(httpReq, &resp)
}

// ListDatasets 列出数据集
func (c *Client) ListDatasets(ctx context.Context, req ListDatasetsRequest) ([]Dataset, error) {
	httpReq, err := c.newRequest(ctx, "GET", "datasets", nil)
	if err != nil {
		return nil, err
	}
	q := httpReq.URL.Query()
	if req.Page > 0 {
		q.Add("page", fmt.Sprintf("%d", req.Page))
	}
	if req.PageSize > 0 {
		q.Add("page_size", fmt.Sprintf("%d", req.PageSize))
	}
	if req.OrderBy != "" {
		q.Add("orderby", req.OrderBy)
	}
	q.Add("desc", fmt.Sprintf("%t", req.Desc))
	if req.Name != "" {
		q.Add("name", req.Name)
	}
	if req.ID != "" {
		q.Add("id", req.ID)
	}
	httpReq.URL.RawQuery = q.Encode()

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// 尝试官方包装格式
	var wrapper ListDatasetsResponse
	if err := json.Unmarshal(body, &wrapper); err == nil && wrapper.Code == 0 && len(wrapper.Data) > 0 {
		return wrapper.Data, nil
	}

	// 尝试直接数组
	var list []Dataset
	if err := json.Unmarshal(body, &list); err == nil && len(list) > 0 {
		return list, nil
	}

	return nil, fmt.Errorf("unexpected list datasets response: %s", string(body))
}
