package v1

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
	"github.com/cloudwego/eino/schema"
	"github.com/labstack/echo/v4"
)

type ContentHandler struct {
	*handler.BaseHandler
	llmUsecase   *usecase.LLMUsecase
	modelUsecase *usecase.ModelUsecase
	logger       *log.Logger
}

func NewContentHandler(baseHandler *handler.BaseHandler, e *echo.Echo, llmUsecase *usecase.LLMUsecase, modelUsecase *usecase.ModelUsecase, logger *log.Logger) *ContentHandler {
	h := &ContentHandler{
		BaseHandler:  baseHandler,
		llmUsecase:   llmUsecase,
		modelUsecase: modelUsecase,
		logger:       logger.WithModule("handler.v1.content"),
	}
	
	// 注册路由 - 暂时不使用认证中间件，用于测试
	group := e.Group("/api/v1/content",
		func(next echo.HandlerFunc) echo.HandlerFunc {
			return func(c echo.Context) error {
				c.Response().Header().Set("Access-Control-Allow-Origin", "*")
				c.Response().Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				c.Response().Header().Set("Access-Control-Allow-Headers", "Content-Type, Origin, Accept, x-kb-id")
				if c.Request().Method == "OPTIONS" {
					return c.NoContent(http.StatusOK)
				}
				return next(c)
			}
		})
	group.POST("/analyze", h.AnalyzeContent)
	group.POST("/enhance", h.EnhanceContent)
	
	return h
}

type ContentAnalysisRequest struct {
	Content string `json:"content" binding:"required"`
}

type ContentAnalysisResponse struct {
	Summary    string   `json:"summary"`
	KeyPoints  []string `json:"key_points"`
	Tags       []string `json:"tags"`
	Difficulty string   `json:"difficulty"` // easy, medium, hard
	Outline    []OutlineItem `json:"outline"`
	WordCount  int        `json:"word_count"`
	ReadingTime int        `json:"reading_time"`
	ProcessedBy string   `json:"processed_by"`
	Category    string   `json:"category"`
}

type OutlineItem struct {
	Level  int    `json:"level"`
	Title  string `json:"title"`
	Anchor string `json:"anchor"`
	ID     string `json:"id"`
}

type ContentEnhanceRequest struct {
	Content string `json:"content" binding:"required"`
	Style   string `json:"style"` // professional, casual, technical
}

type ContentEnhanceResponse struct {
	EnhancedContent string `json:"enhanced_content"`
}

// @Summary 分析内容
// @Description 使用AI分析文档内容，生成摘要、关键点、标签等
// @Tags content
// @Accept json
// @Produce json
// @Param request body ContentAnalysisRequest true "内容分析请求"
// @Success 200 {object} ContentAnalysisResponse
// @Failure 400 {object} domain.ErrorResponse
// @Failure 500 {object} domain.ErrorResponse
// @Router /api/v1/content/analyze [post]
func (h *ContentHandler) AnalyzeContent(c echo.Context) error {
	var req ContentAnalysisRequest
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	if req.Content == "" {
		return h.NewResponseWithError(c, "content is required", nil)
	}

	kb_id := c.Request().Header.Get("x-kb-id")
	if kb_id == "" {
		return h.NewResponseWithError(c, "knowledge base ID is required", nil)
	}

	ctx := c.Request().Context()
	
	// 提取文本内容用于分析
	textContent := h.extractTextContent(req.Content)
	
	// 检查是否请求快速模式
	fastMode := c.QueryParam("fast") == "true"
	h.logger.Info(fmt.Sprintf("Processing content analysis: fast_mode=%v query_param=%s", fastMode, c.QueryParam("fast")))
	
	var result *ContentAnalysisResponse
	var err error
	
	if fastMode {
		// 快速模式：直接使用本地分析
		h.logger.Info(fmt.Sprintf("Using fast mode analysis: content_length=%d", len(textContent)))
		result = h.fallbackAnalysis(textContent)
	} else {
		// 尝试AI分析（带超时）
		h.logger.Info(fmt.Sprintf("Using AI analysis mode: content_length=%d", len(textContent)))
		result, err = h.batchAnalyzeContent(ctx, kb_id, textContent)
		if err != nil {
			// AI失败时使用回退方案
			h.logger.Warn("AI analysis failed, using fallback", "error", err.Error())
			result = h.fallbackAnalysis(textContent)
		}
	}
	
	// 确保结果不为空
	if result == nil {
		result = h.fallbackAnalysis(textContent)
	}
	
	// 添加元数据
	result.WordCount = len(strings.Fields(textContent))
	result.ReadingTime = h.estimateReadingTime(textContent)
	result.ProcessedBy = "AI"
	if fastMode || err != nil {
		result.ProcessedBy = "Local"
	}
	
	return h.NewResponseWithData(c, result)
}

// 批量分析内容 - 一次AI调用完成所有分析任务
func (h *ContentHandler) batchAnalyzeContent(ctx context.Context, kbID, content string) (*ContentAnalysisResponse, error) {
	if len(content) < 50 {
		// 内容太短，直接返回简单分析
		return &ContentAnalysisResponse{
			Summary:    content,
			KeyPoints:  []string{content},
			Tags:       []string{"简短内容"},
			Difficulty: "easy",
		}, nil
	}
	
	// 创建带超时的上下文（60 秒超时，避免大段内容分析时过早回退）
	timeoutCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	
	// 构建批量分析的提示词
	prompt := fmt.Sprintf(`请分析以下内容并以JSON格式返回分析结果。要求：

内容：%s

请返回JSON格式（不要包含其他文字）：
{
  "summary": "简洁摘要（不超过100字）",
  "key_points": ["关键要点1", "关键要点2", "关键要点3"],
  "tags": ["标签1", "标签2", "标签3"],
  "difficulty": "easy/medium/hard",
  "category": "文档所属的单一分类名称"
}`, content)
	
	model, err := h.modelUsecase.GetChatModel(timeoutCtx)
	if err != nil {
		return nil, err
	}
	
	if model == nil {
		return nil, fmt.Errorf("no chat model available")
	}
	
	chatModel, err := h.llmUsecase.GetChatModel(timeoutCtx, model)
	if err != nil {
		return nil, err
	}
	
	messages := []*schema.Message{
		{
			Role:    schema.System,
			Content: "你是一个专业的内容分析助手。请严格按照JSON格式返回分析结果，不要包含任何其他文字。",
		},
		{
			Role:    schema.User,
			Content: prompt,
		},
	}
	
	startTime := time.Now()
	resp, err := chatModel.Generate(timeoutCtx, messages)
	duration := time.Since(startTime)
	h.logger.Info("Content analyze LLM call finished", "duration", duration.String())
	
	if err != nil {
		// 检查是否是超时错误
		if timeoutCtx.Err() == context.DeadlineExceeded {
			h.logger.Warn("AI analysis timed out, using fallback", "timeout", "60s")
			return nil, fmt.Errorf("AI analysis timeout")
		}
		return nil, err
	}
	
	if resp == nil || resp.Content == "" {
		return nil, fmt.Errorf("empty response from AI model")
	}
	
	// 解析JSON响应
	var result ContentAnalysisResponse
	content = strings.TrimSpace(resp.Content)
	
	// 清理可能的markdown代码块标记
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)
	
	err = json.Unmarshal([]byte(content), &result)
	if err != nil {
		h.logger.Warn("failed to parse AI response as JSON", "content", content, "error", err)
		return nil, fmt.Errorf("failed to parse AI response: %v", err)
	}
	
	return &result, nil
}

// @Summary 增强内容格式
// @Description 使用AI增强文档内容的显示格式
// @Tags content
// @Accept json
// @Produce json
// @Param request body ContentEnhanceRequest true "内容增强请求"
// @Success 200 {object} ContentEnhanceResponse
// @Failure 400 {object} domain.ErrorResponse
// @Failure 500 {object} domain.ErrorResponse
// @Router /api/v1/content/enhance [post]
func (h *ContentHandler) EnhanceContent(c echo.Context) error {
	var req ContentEnhanceRequest
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	if req.Content == "" {
		return h.NewResponseWithError(c, "content is required", nil)
	}

	kb_id := c.Request().Header.Get("x-kb-id")
	if kb_id == "" {
		return h.NewResponseWithError(c, "knowledge base ID is required", nil)
	}

	// 设置默认样式
	if req.Style == "" {
		req.Style = "professional"
	}

	ctx := c.Request().Context()
	
	// 增强内容格式
	enhancedContent, err := h.enhanceContentFormat(ctx, kb_id, req.Content, req.Style)
	if err != nil {
		h.logger.Error("failed to enhance content", "error", err)
		// 使用回退方案
		enhancedContent = h.fallbackEnhancement(req.Content, req.Style)
	}
	
	response := ContentEnhanceResponse{
		EnhancedContent: enhancedContent,
	}
	
	return h.NewResponseWithData(c, response)
}

// 增强内容格式
func (h *ContentHandler) enhanceContentFormat(ctx context.Context, kbID, content, style string) (string, error) {
	// 创建带超时的上下文（5 分钟超时，便于长时间推理）
	timeoutCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()
	
	var stylePrompt string
	switch style {
	case "professional":
		stylePrompt = `请以专业、正式的风格对以下内容进行「结构化重写」，产出具有清晰逻辑层次的 HTML，满足：
1. 首部先给出 <h2>智能摘要</h2> 与一段 100 字以内摘要。
2. 接着给出 <h2>关键要点</h2> + 无序列表列出 3~8 个要点。
3. 之后用 <hr/> 分隔，再保留原文（可适当美化排版）。
4. 保证所有标记都在同一段 HTML 字符串中返回，不要返回 JSON 或 markdown。`
	case "casual":
		stylePrompt = "请以轻松、友好的风格重写并结构化该 HTML，包含智能摘要、关键要点和美化后的原文。"
	case "technical":
		stylePrompt = "请以技术性风格重写并结构化该 HTML，包含智能摘要、关键要点和经排版的原文。"
	default:
		stylePrompt = "请重新格式化并结构化该 HTML，包含智能摘要、关键要点与原文。"
	}
	
	prompt := fmt.Sprintf("%s\n\n要求：\n1. 保留原有的HTML结构\n2. 为重要标题添加图标\n3. 突出显示关键信息\n4. 保持内容的完整性\n\n原始内容：\n%s", stylePrompt, content)
	
	model, err := h.modelUsecase.GetChatModel(timeoutCtx)
	if err != nil {
		return "", err
	}
	
	if model == nil {
		return "", fmt.Errorf("no chat model available")
	}
	
	chatModel, err := h.llmUsecase.GetChatModel(timeoutCtx, model)
	if err != nil {
		return "", err
	}
	
	messages := []*schema.Message{
		{
			Role:    schema.System,
			Content: "你是一个专业的HTML内容格式化助手，擅长美化和增强HTML内容的显示效果。",
		},
		{
			Role:    schema.User,
			Content: prompt,
		},
	}
	
	startTime := time.Now()
	resp, err := chatModel.Generate(timeoutCtx, messages)
	duration := time.Since(startTime)
	h.logger.Info("Content enhancement LLM call finished", "duration", duration.String())
	
	if err != nil {
		// 检查是否是超时错误
		if timeoutCtx.Err() == context.DeadlineExceeded {
			h.logger.Warn("Content enhancement timed out, using fallback", "timeout", "5m")
			return "", fmt.Errorf("content enhancement timeout")
		}
		return "", err
	}
	
	if resp != nil && resp.Content != "" {
		return strings.TrimSpace(resp.Content), nil
	}
	
	return "", fmt.Errorf("empty response from AI model")
}

// 清理HTML标签，提取纯文本
func cleanHTML(html string) string {
	// 先去除 <script>/<style>/<iframe>/<noscript> 及其内部内容
	blockRe := regexp.MustCompile(`(?is)<script[^>]*?>[\s\S]*?<\/script>|<style[^>]*?>[\s\S]*?<\/style>|<iframe[^>]*?>[\s\S]*?<\/iframe>|<noscript[^>]*?>[\s\S]*?<\/noscript>`)
	cleaned := blockRe.ReplaceAllString(html, " ")
	
	// 再去除剩余 HTML 标签
	tagRe := regexp.MustCompile(`<[^>]*>`)
	cleaned = tagRe.ReplaceAllString(cleaned, " ")
	
	// 合并多余空白
	cleaned = regexp.MustCompile(`\s+`).ReplaceAllString(cleaned, " ")
	cleaned = strings.TrimSpace(cleaned)
	
	return cleaned
}

// 评估内容难度
func (h *ContentHandler) assessDifficulty(content string) string {
	length := len(content)
	
	// 基于内容长度和复杂度评估
	if length < 500 {
		return "easy"
	} else if length > 2000 {
		return "hard"
	}
	
	return "medium"
}

// 回退方案 - 生成简单摘要
func (h *ContentHandler) fallbackSummary(content string) string {
	sentences := strings.Split(content, "。")
	if len(sentences) > 2 {
		return strings.Join(sentences[:2], "。") + "。"
	}
	if len(content) > 100 {
		return content[:100] + "..."
	}
	return content
}

// 回退方案 - 生成简单关键点
func (h *ContentHandler) fallbackKeyPoints(content string) []string {
	sentences := strings.Split(content, "。")
	var points []string
	
	for i, sentence := range sentences {
		if i >= 5 {
			break
		}
		sentence = strings.TrimSpace(sentence)
		if len(sentence) > 20 {
			points = append(points, sentence)
		}
	}
	
	if len(points) == 0 {
		points = append(points, "主要内容包含重要信息")
	}
	
	return points
}

// 回退方案 - 简单格式增强
func (h *ContentHandler) fallbackEnhancement(content, style string) string {
	// 利用本地摘要与关键点，使智能格式与原文差异明显
	summary := h.fallbackSummary(content)
	keyPoints := h.fallbackKeyPoints(content)

	var icon string
	switch style {
	case "professional":
		icon = "📌"
	case "casual":
		icon = "👉"
	case "technical":
		icon = "🔧"
	default:
		icon = "⭐️"
	}

	// 生成关键要点列表 HTML
	var pointsHTML strings.Builder
	for _, p := range keyPoints {
		pointsHTML.WriteString(fmt.Sprintf("<li>%s</li>", p))
	}

	// 组合结构化增强内容
	enhanced := fmt.Sprintf(`
<div class="enhanced-content">
  <h2>%s 智能摘要</h2>
  <p>%s</p>
  <h2>%s 关键要点</h2>
  <ul>%s</ul>
  <hr/>
  <h2>%s 原文内容</h2>
  %s
</div>`, icon, summary, icon, pointsHTML.String(), icon, content)

	return enhanced
}

// 批量分析的回退方案
func (h *ContentHandler) fallbackAnalysis(content string) *ContentAnalysisResponse {
	// 简单的文本分析作为回退方案
	summary := h.fallbackSummary(content)
	keyPoints := h.fallbackKeyPoints(content)
	
	// 根据长度和复杂度评估难度
	difficulty := h.assessDifficulty(content)
	
	// 生成基本标签
	tags := []string{"文档", "内容"}
	if len(content) > 1000 {
		tags = append(tags, "长文档")
	}
	if strings.Contains(content, "技术") || strings.Contains(content, "API") || strings.Contains(content, "代码") {
		tags = append(tags, "技术文档")
	}
	if strings.Contains(content, "教程") || strings.Contains(content, "学习") {
		tags = append(tags, "教程")
	}
	
	return &ContentAnalysisResponse{
		Summary:    summary,
		KeyPoints:  keyPoints,
		Tags:       tags,
		Difficulty: difficulty,
		Outline:    []OutlineItem{}, // 空outline，因为这里没有HTML结构
		Category:   "未分类",
	}
}

// 估算阅读时间（分钟）
func (h *ContentHandler) estimateReadingTime(content string) int {
	wordCount := len(strings.Fields(content))
	// 假设每分钟阅读250字
	readingTime := wordCount / 250
	if readingTime == 0 {
		readingTime = 1
	}
	return readingTime
}

// 提取文本内容
func (h *ContentHandler) extractTextContent(htmlContent string) string {
	// 先去除 <script>/<style>/<iframe>/<noscript> 及其内部内容
	blockRe := regexp.MustCompile(`(?is)<script[^>]*?>[\s\S]*?<\/script>|<style[^>]*?>[\s\S]*?<\/style>|<iframe[^>]*?>[\s\S]*?<\/iframe>|<noscript[^>]*?>[\s\S]*?<\/noscript>`)
	cleaned := blockRe.ReplaceAllString(htmlContent, " ")
	
	// 再去除剩余 HTML 标签
	tagRe := regexp.MustCompile(`<[^>]*>`)
	cleaned = tagRe.ReplaceAllString(cleaned, " ")
	
	// 合并多余空白
	cleaned = regexp.MustCompile(`\s+`).ReplaceAllString(cleaned, " ")
	cleaned = strings.TrimSpace(cleaned)
	
	return cleaned
}

// 提取文档大纲
func (h *ContentHandler) extractOutline(htmlContent string) []OutlineItem {
	var outline []OutlineItem
	
	// 匹配HTML标题标签 h1-h6
	re := regexp.MustCompile(`<h([1-6])[^>]*>(.*?)</h[1-6]>`)
	matches := re.FindAllStringSubmatch(htmlContent, -1)
	
	for i, match := range matches {
		if len(match) >= 3 {
			level, _ := strconv.Atoi(match[1])
			title := h.extractTextContent(match[2])
			if title != "" {
				anchor := strings.ToLower(strings.ReplaceAll(title, " ", "-"))
				outline = append(outline, OutlineItem{
					Level:  level,
					Title:  title,
					Anchor: anchor,
					ID:     fmt.Sprintf("heading-%d", i+1),
				})
			}
		}
	}
	
	return outline
} 