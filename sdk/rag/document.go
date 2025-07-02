package rag

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// UploadDocuments 上传文档（支持多文件）
func (c *Client) UploadDocumentsAndParse(ctx context.Context, datasetID string, filePaths []string) ([]Document, error) {
	documents, err := c.UploadDocuments(ctx, datasetID, filePaths)
	if err != nil {
		return nil, err
	}
	if len(documents) == 0 {
		return nil, nil
	}

	docIDs := make([]string, len(documents))
	for i, doc := range documents {
		docIDs[i] = doc.ID
	}

	err = c.ParseDocuments(ctx, datasetID, docIDs)
	if err != nil {
		return nil, err
	}

	return documents, nil
}

// UploadDocuments 上传文档（支持多文件）
func (c *Client) UploadDocuments(ctx context.Context, datasetID string, filePaths []string) ([]Document, error) {
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	for _, path := range filePaths {
		file, err := os.Open(path)
		if err != nil {
			return nil, err
		}
		defer file.Close()
		fw, err := w.CreateFormFile("file", filepath.Base(path))
		if err != nil {
			return nil, err
		}
		if _, err := io.Copy(fw, file); err != nil {
			return nil, err
		}
	}
	w.Close()

	urlPath := fmt.Sprintf("datasets/%s/documents", datasetID)
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL.JoinPath(urlPath).String(), &b)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, parseErrorResponse(resp)
	}

	// 兼容两种格式：
	// 1. {"code":0,"data":[{...}]}
	// 2. [{...}]
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// 尝试格式1
	var wrapper UploadDocumentResponse
	if err := json.Unmarshal(bodyBytes, &wrapper); err == nil && len(wrapper.Data) > 0 {
		return wrapper.Data, nil
	}

	// 尝试格式2
	var docs []Document
	if err := json.Unmarshal(bodyBytes, &docs); err == nil && len(docs) > 0 {
		return docs, nil
	}

	return nil, fmt.Errorf("unexpected upload documents response: %s", string(bodyBytes))
}

// DownloadDocument 下载文档到本地
func (c *Client) DownloadDocument(ctx context.Context, datasetID, documentID, outputPath string) error {
	urlPath := fmt.Sprintf("datasets/%s/documents/%s", datasetID, documentID)
	req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL.JoinPath(urlPath).String(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return parseErrorResponse(resp)
	}

	out, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, resp.Body)
	return err
}

// ListDocuments 列出文档
func (c *Client) ListDocuments(ctx context.Context, datasetID string, params map[string]string) ([]Document, int, error) {
	urlPath := fmt.Sprintf("datasets/%s/documents", datasetID)
	req, err := c.newRequest(ctx, "GET", urlPath, nil)
	if err != nil {
		return nil, 0, err
	}
	q := req.URL.Query()
	for k, v := range params {
		q.Add(k, v)
	}
	req.URL.RawQuery = q.Encode()

	var resp ListDocumentsResponse
	if err := c.do(req, &resp); err != nil {
		return nil, 0, err
	}
	return resp.Data.Docs, resp.Data.Total, nil
}

// DeleteDocuments 删除文档（支持批量）
func (c *Client) DeleteDocuments(ctx context.Context, datasetID string, ids []string) error {
	urlPath := fmt.Sprintf("datasets/%s/documents", datasetID)
	body := DeleteDocumentsRequest{IDs: ids}
	req, err := c.newRequest(ctx, "DELETE", urlPath, body)
	if err != nil {
		return err
	}
	var resp DeleteDocumentsResponse
	return c.do(req, &resp)
}

// UpdateDocument 更新文档
func (c *Client) UpdateDocument(ctx context.Context, datasetID, documentID string, reqBody UpdateDocumentRequest) error {
	urlPath := fmt.Sprintf("datasets/%s/documents/%s", datasetID, documentID)
	req, err := c.newRequest(ctx, "PUT", urlPath, reqBody)
	if err != nil {
		return err
	}
	var resp UpdateDocumentResponse
	return c.do(req, &resp)
}

// UploadDocumentText 上传文本内容为文档
// jsonStr 形如 {"filename": "xxx.txt", "content": "...", "file_type": "text/plain"}
func (c *Client) UploadDocumentText(ctx context.Context, datasetID string, jsonStr string) ([]Document, error) {
	type input struct {
		Filename string `json:"filename"`
		Content  string `json:"content"`
		FileType string `json:"file_type"`
	}
	var in input
	if err := json.Unmarshal([]byte(jsonStr), &in); err != nil {
		return nil, err
	}
	if in.Filename == "" || in.Content == "" {
		return nil, fmt.Errorf("filename和content不能为空")
	}

	// 如果未指定文件类型，根据文件名后缀推断
	if in.FileType == "" {
		ext := filepath.Ext(in.Filename)
		switch strings.ToLower(ext) {
		case ".txt":
			in.FileType = "text/plain"
		case ".md":
			in.FileType = "text/markdown"
		case ".html":
			in.FileType = "text/html"
		case ".json":
			in.FileType = "application/json"
		case ".xml":
			in.FileType = "application/xml"
		case ".csv":
			in.FileType = "text/csv"
		default:
			in.FileType = "text/plain"
		}
	}

	// 创建临时文件
	tmpFile, err := os.CreateTemp("", in.Filename+"_*")
	if err != nil {
		return nil, err
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	if _, err := tmpFile.WriteString(in.Content); err != nil {
		return nil, err
	}
	if err := tmpFile.Sync(); err != nil {
		return nil, err
	}

	// 重新打开文件以确保内容被写入
	tmpFile.Close()
	tmpFile, err = os.Open(tmpFile.Name())
	if err != nil {
		return nil, err
	}
	defer tmpFile.Close()

	// 创建multipart请求
	var b bytes.Buffer
	w := multipart.NewWriter(&b)

	// 添加文件
	fw, err := w.CreateFormFile("file", in.Filename)
	if err != nil {
		return nil, err
	}
	if _, err := io.Copy(fw, tmpFile); err != nil {
		return nil, err
	}

	// 添加文件类型
	if err := w.WriteField("file_type", in.FileType); err != nil {
		return nil, err
	}

	w.Close()

	// 发送请求
	urlPath := fmt.Sprintf("datasets/%s/documents", datasetID)
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL.JoinPath(urlPath).String(), &b)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	// 打印请求内容以便调试
	fmt.Printf("发送请求到: %s\n", req.URL.String())
	fmt.Printf("Content-Type: %s\n", req.Header.Get("Content-Type"))
	fmt.Printf("文件大小: %d bytes\n", b.Len())

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("上传失败: %s, 状态码: %d, 响应: %s", parseErrorResponse(resp), resp.StatusCode, string(body))
	}

	// 兼容两种格式：
	// 1. {"code":0,"data":[{...}]}
	// 2. [{...}]
	var wrapper UploadDocumentResponse
	if err := json.NewDecoder(resp.Body).Decode(&wrapper); err == nil && len(wrapper.Data) > 0 {
		return wrapper.Data, nil
	}

	// 如果 wrapper.Data 为空，尝试直接解析为数组
	if _, err := resp.Body.Seek(0, io.SeekStart); err == nil { // 重置游标
		var docs []Document
		if err := json.NewDecoder(resp.Body).Decode(&docs); err == nil && len(docs) > 0 {
			return docs, nil
		}
	}

	return nil, fmt.Errorf("unexpected upload documents response")
}

// UploadDocumentTextAndParse 上传文本内容为文档并解析
func (c *Client) UploadDocumentTextAndParse(ctx context.Context, datasetID string, jsonStr string) ([]Document, error) {
	documents, err := c.UploadDocumentText(ctx, datasetID, jsonStr)
	if err != nil {
		return nil, err
	}
	if len(documents) == 0 {
		return nil, nil
	}

	docIDs := make([]string, len(documents))
	for i, doc := range documents {
		docIDs[i] = doc.ID
	}

	err = c.ParseDocuments(ctx, datasetID, docIDs)
	if err != nil {
		return nil, err
	}

	return documents, nil
}

// UpdateDocumentText 更新文档内容
// 由于后端不支持直接更新文档，此函数会先删除旧文档，然后创建新文档
func (c *Client) UpdateDocumentText(ctx context.Context, datasetID string, documentID string, content string) (*Document, error) {
	// 1. 删除旧文档
	err := c.DeleteDocuments(ctx, datasetID, []string{documentID})
	if err != nil {
		return nil, fmt.Errorf("删除旧文档失败: %w", err)
	}

	// 2. 上传新文档
	docs, err := c.UploadDocumentTextAndParse(ctx, datasetID, content)
	if err != nil {
		return nil, fmt.Errorf("上传新文档失败: %w", err)
	}

	if len(docs) == 0 {
		return nil, fmt.Errorf("上传新文档成功但返回空列表")
	}

	return &docs[0], nil
}
