package usecase

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
)

type CrawlerUsecase struct {
	client *http.Client
	logger *log.Logger
}

func NewCrawlerUsecase(logger *log.Logger) (*CrawlerUsecase, error) {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
	}
	return &CrawlerUsecase{
		client: &http.Client{
			Transport: transport,
		},
		logger: logger,
	}, nil
}

func (u *CrawlerUsecase) ScrapeURL(ctx context.Context, targetURL string, kbID string) (*domain.ScrapeResp, error) {
	crawleServiceURL := "http://panda-wiki-rag:8080/api/v1/scrape"

	// for uploaded file key - 修改为直接访问后端的静态文件服务
	if strings.HasPrefix(targetURL, "/static-file") {
		// 修改为访问后端的静态文件代理
		targetURL = "http://panda-wiki-backend:8000" + targetURL
	}

	reqBody := domain.ScrapeRequest{
		URL:  targetURL,
		KbID: kbID,
	}
	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, crawleServiceURL, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := u.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	u.logger.Debug("scrape url", "url", targetURL, "resp", string(respBody))
	var scrapeResp domain.ScrapeResponse
	err = json.Unmarshal(respBody, &scrapeResp)
	if err != nil {
		return nil, err
	}
	if scrapeResp.Err != 0 {
		return nil, errors.New(scrapeResp.Msg)
	}
	return &domain.ScrapeResp{
		Title:   scrapeResp.Data.Title,
		Content: scrapeResp.Data.Markdown,
	}, nil
}
