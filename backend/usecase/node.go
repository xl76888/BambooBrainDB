package usecase

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"

	"github.com/samber/lo"
	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/mq"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/s3"
)

type NodeUsecase struct {
	nodeRepo   *pg.NodeRepository
	ragRepo    *mq.RAGRepository
	kbRepo     *pg.KnowledgeBaseRepository
	modelRepo  *pg.ModelRepository
	llmUsecase *LLMUsecase
	logger     *log.Logger
	s3Client   *s3.MinioClient
}

func NewNodeUsecase(nodeRepo *pg.NodeRepository, ragRepo *mq.RAGRepository, kbRepo *pg.KnowledgeBaseRepository, llmUsecase *LLMUsecase, logger *log.Logger, s3Client *s3.MinioClient, modelRepo *pg.ModelRepository) *NodeUsecase {
	return &NodeUsecase{
		nodeRepo:   nodeRepo,
		ragRepo:    ragRepo,
		kbRepo:     kbRepo,
		llmUsecase: llmUsecase,
		modelRepo:  modelRepo,
		logger:     logger.WithModule("usecase.node"),
		s3Client:   s3Client,
	}
}

func (u *NodeUsecase) Create(ctx context.Context, req *domain.CreateNodeReq) (string, error) {
	nodeID, err := u.nodeRepo.Create(ctx, req)
	if err != nil {
		return "", err
	}
	return nodeID, nil
}

func (u *NodeUsecase) GetList(ctx context.Context, req *domain.GetNodeListReq) ([]*domain.NodeListItemResp, error) {
	nodes, err := u.nodeRepo.GetList(ctx, req)
	if err != nil {
		return nil, err
	}
	return nodes, nil
}

func (u *NodeUsecase) GetByID(ctx context.Context, id string) (*domain.NodeDetailResp, error) {
	return u.nodeRepo.GetByID(ctx, id)
}

func (u *NodeUsecase) NodeAction(ctx context.Context, req *domain.NodeActionReq) error {
	switch req.Action {
	case "delete":
		docIDs, err := u.nodeRepo.Delete(ctx, req.KBID, req.IDs)
		if err != nil {
			return err
		}
		nodeVectorContentRequests := make([]*domain.NodeReleaseVectorRequest, 0)
		for _, docID := range docIDs {
			nodeVectorContentRequests = append(nodeVectorContentRequests, &domain.NodeReleaseVectorRequest{
				KBID:   req.KBID,
				DocID:  docID,
				Action: "delete",
			})
		}
		if err := u.ragRepo.AsyncUpdateNodeReleaseVector(ctx, nodeVectorContentRequests); err != nil {
			return err
		}
	case "private":
		// update node visibility to private
		if err := u.nodeRepo.UpdateNodesVisibility(ctx, req.KBID, req.IDs, domain.NodeVisibilityPrivate); err != nil {
			return err
		}
		// get latest node release and delete in vector
		nodeReleases, err := u.nodeRepo.GetLatestNodeReleaseByNodeIDs(ctx, req.KBID, req.IDs)
		if err != nil {
			return fmt.Errorf("get latest node release failed: %w", err)
		}
		if len(nodeReleases) > 0 {
			nodeVectorContentRequests := make([]*domain.NodeReleaseVectorRequest, 0)
			for _, nodeRelease := range nodeReleases {
				if nodeRelease.DocID == "" {
					continue
				}
				nodeVectorContentRequests = append(nodeVectorContentRequests, &domain.NodeReleaseVectorRequest{
					KBID:   req.KBID,
					DocID:  nodeRelease.DocID,
					Action: "delete",
				})
			}
			if len(nodeVectorContentRequests) == 0 {
				return nil
			}
			if err := u.ragRepo.AsyncUpdateNodeReleaseVector(ctx, nodeVectorContentRequests); err != nil {
				return err
			}
		}
	case "public":
		// update node visibility to public
		if err := u.nodeRepo.UpdateNodesVisibility(ctx, req.KBID, req.IDs, domain.NodeVisibilityPublic); err != nil {
			return err
		}
	}
	return nil
}

func (u *NodeUsecase) Update(ctx context.Context, req *domain.UpdateNodeReq) error {
	err := u.nodeRepo.UpdateNodeContent(ctx, req)
	if err != nil {
		return err
	}
	if req.Visibility != nil && *req.Visibility == domain.NodeVisibilityPrivate {
		// get latest node release
		nodeRelease, err := u.nodeRepo.GetLatestNodeReleaseByNodeID(ctx, req.ID)
		if err != nil {
			return err
		}
		if nodeRelease.DocID != "" {
			if err := u.ragRepo.AsyncUpdateNodeReleaseVector(ctx, []*domain.NodeReleaseVectorRequest{
				{
					KBID:   req.KBID,
					DocID:  nodeRelease.DocID,
					Action: "delete",
				},
			}); err != nil {
				return err
			}
		}
	}
	return nil
}

func (u *NodeUsecase) GetNodeReleaseListByKBID(ctx context.Context, kbID string) ([]*domain.ShareNodeListItemResp, error) {
	return u.nodeRepo.GetNodeReleaseListByKBID(ctx, kbID)
}

func (u *NodeUsecase) GetNodeReleaseDetailByKBIDAndID(ctx context.Context, kbID, id string) (*domain.NodeDetailResp, error) {
	return u.nodeRepo.GetNodeReleaseDetailByKBIDAndID(ctx, kbID, id)
}

func (u *NodeUsecase) MoveNode(ctx context.Context, req *domain.MoveNodeReq) error {
	return u.nodeRepo.MoveNodeBetween(ctx, req.ID, req.ParentID, req.PrevID, req.NextID)
}

func (u *NodeUsecase) SummaryNode(ctx context.Context, req *domain.NodeSummaryReq) (string, error) {
	mdl, err := u.modelRepo.GetChatModel(ctx)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", domain.ErrModelNotConfigured
		}
		return "", err
	}
	if len(req.IDs) == 1 {
		node, err := u.nodeRepo.GetNodeByID(ctx, req.IDs[0])
		if err != nil {
			return "", fmt.Errorf("get latest node release failed: %w", err)
		}
		// 提取纯文本，避免HTML标签干扰
		textContent := stripHTML(node.Content)
		
		summary, err := u.llmUsecase.SummaryNode(ctx, mdl, node.Name, textContent)
		if err != nil {
			// 回退：取前两句或前160字符
			fallback := fallbackSummaryLocal(node.Content)
			u.logger.Warn("LLM summary failed, use fallback", log.Error(err))
			return fallback, nil
		}
		return summary, nil
	} else {
		// async create node summary
		nodeVectorContentRequests := make([]*domain.NodeReleaseVectorRequest, 0)
		for _, id := range req.IDs {
			nodeVectorContentRequests = append(nodeVectorContentRequests, &domain.NodeReleaseVectorRequest{
				KBID:   req.KBID,
				NodeID: id,
				Action: "summary",
			})
		}
		if err := u.ragRepo.AsyncUpdateNodeReleaseVector(ctx, nodeVectorContentRequests); err != nil {
			return "", err
		}
	}
	return "", nil
}

func (u *NodeUsecase) GetRecommendNodeList(ctx context.Context, req *domain.GetRecommendNodeListReq) ([]*domain.RecommendNodeListResp, error) {
	// get latest kb release
	kbRelease, err := u.kbRepo.GetLatestRelease(ctx, req.KBID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	nodes, err := u.nodeRepo.GetRecommendNodeListByIDs(ctx, req.KBID, kbRelease.ID, req.NodeIDs)
	if err != nil {
		return nil, err
	}
	if len(nodes) > 0 {
		// sort nodes by req.NodeIDs order
		nodesMap := lo.SliceToMap(nodes, func(item *domain.RecommendNodeListResp) (string, *domain.RecommendNodeListResp) {
			return item.ID, item
		})
		nodes = make([]*domain.RecommendNodeListResp, 0)
		for _, id := range req.NodeIDs {
			if node, ok := nodesMap[id]; ok {
				nodes = append(nodes, node)
			}
		}
		// get folder nodes
		folderNodeIds := lo.Filter(nodes, func(item *domain.RecommendNodeListResp, _ int) bool {
			return item.Type == domain.NodeTypeFolder
		})
		if len(folderNodeIds) > 0 {
			parentIDNodeMap, err := u.nodeRepo.GetRecommendNodeListByParentIDs(ctx, req.KBID, kbRelease.ID, lo.Map(folderNodeIds, func(item *domain.RecommendNodeListResp, _ int) string {
				return item.ID
			}))
			if err != nil {
				return nil, err
			}
			for _, node := range nodes {
				if parentNodes, ok := parentIDNodeMap[node.ID]; ok {
					node.RecommendNodes = parentNodes
				}
			}
		}
		return nodes, nil
	}
	return nil, nil
}

// AutoClassify 遍历知识库下所有未分类或"未分类"的节点，调用 LLM 获取分类，失败则本地回退，最终写入节点 meta.category。
func (u *NodeUsecase) AutoClassify(ctx context.Context, kbID string) error {
	// 获取待分类节点
	nodes, err := u.nodeRepo.GetNodesWithoutCategory(ctx, kbID)
	if err != nil {
		return fmt.Errorf("get nodes for classify failed: %w", err)
	}
	if len(nodes) == 0 {
		return nil // nothing to do
	}

	// 尝试获取模型
	mdl, err := u.modelRepo.GetChatModel(ctx)
	var chatModel model.BaseChatModel
	if err == nil {
		chatModel, err = u.llmUsecase.GetChatModel(ctx, mdl)
		if err != nil {
			u.logger.Warn("get chat model failed, fallback to local classify", log.Error(err))
		}
	} else {
		u.logger.Warn("chat model not configured, fallback to local classify", log.Error(err))
	}

	for _, node := range nodes {
		plain := stripHTML(node.Content)
		category := ""

		// 优先调用 LLM 分类
		if chatModel != nil {
			cat, err := u.llmUsecase.Generate(ctx, chatModel, []*schema.Message{
				{
					Role:    "system",
					Content: "你是知识库文档分类助手，会根据文档内容给出单一、最合适的分类名称。仅返回分类名称，不要其他字符。常见分类例如：市场/营销、技术文档、内部流程、商务合同、产品方案、法律合规、财务、教育培训等。",
				},
				{
					Role:    "user",
					Content: fmt.Sprintf("文档名称：%s\n文档内容：%s", node.Name, func(s string) string { if len(s) > 500 { return s[:500] } ; return s}(plain)),
				},
			})
			if err == nil {
				category = strings.TrimSpace(cat)
			} else {
				u.logger.Warn("LLM classify failed, fallback", log.Error(err))
			}
		}

		if category == "" {
			category = fallbackCategoryLocal(plain)
		}
		if category == "" {
			category = "未分类"
		}

		if err := u.nodeRepo.UpdateNodeCategory(ctx, node.ID, category); err != nil {
			u.logger.Error("update node category failed", log.Error(err))
		}
	}

	// 最后再遍历一次 KB 下所有节点，将已存在的分类同步至最新发布版本，防止旧数据缺失。
	allNodes, err := u.nodeRepo.GetNodesByKBID(ctx, kbID)
	if err == nil {
		for _, n := range allNodes {
			if n.Meta.Category != "" {
				_ = u.nodeRepo.UpdateNodeCategory(ctx, n.ID, n.Meta.Category) // 忽略错误，已在内部记录
			}
		}
	}

	return nil
}

// fallbackCategoryLocal 简易关键词分类
func fallbackCategoryLocal(content string) string {
	lower := strings.ToLower(content)
	switch {
	case strings.Contains(lower, "营销") || strings.Contains(lower, "市场"):
		return "市场/营销"
	case strings.Contains(lower, "技术") || strings.Contains(lower, "开发") || strings.Contains(lower, "接口"):
		return "技术文档"
	case strings.Contains(lower, "流程") || strings.Contains(lower, "sop"):
		return "内部流程"
	case strings.Contains(lower, "合同") || strings.Contains(lower, "协议"):
		return "商务合同"
	default:
		return "未分类"
	}
}

// fallbackSummaryLocal 生成简易摘要
func fallbackSummaryLocal(content string) string {
	plain := stripHTML(content)
	sentences := strings.Split(plain, "。")
	if len(sentences) > 2 {
		return strings.Join(sentences[:2], "。") + "。"
	}
	if len(plain) > 160 {
		return plain[:160] + "..."
	}
	return plain
}

// stripHTML 去除HTML标签及多余空白
func stripHTML(html string) string {
	// 1. 去掉 <script>/<style> 及其内容（Go 正则不支持反向引用，使用两段或语法）
	scriptStyleRe := regexp.MustCompile(`(?is)<script[^>]*?>[\s\S]*?<\/script>|<style[^>]*?>[\s\S]*?<\/style>`) // (?is) 忽略大小写+单行
	cleaned := scriptStyleRe.ReplaceAllString(html, " ")

	// 2. 去掉其他潜在包含脚本的标签（iframe/noscript 等）
	otherBlockRe := regexp.MustCompile(`(?is)<iframe[^>]*?>[\s\S]*?<\/iframe>|<noscript[^>]*?>[\s\S]*?<\/noscript>`)
	cleaned = otherBlockRe.ReplaceAllString(cleaned, " ")

	// 3. 去掉剩余所有 HTML 标签
	tagRe := regexp.MustCompile(`<[^>]+>`) // 简单匹配标签
	cleaned = tagRe.ReplaceAllString(cleaned, " ")

	// 4. 合并多余空白
	spaceRe := regexp.MustCompile(`\s+`)
	cleaned = spaceRe.ReplaceAllString(cleaned, " ")

	return strings.TrimSpace(cleaned)
}

// StripHTMLPublic 供外部包调用
func StripHTMLPublic(html string) string {
	return stripHTML(html)
}

// FallbackSummaryLocalPublic 外部可调用的简易摘要
func FallbackSummaryLocalPublic(content string) string {
	return fallbackSummaryLocal(content)
}
