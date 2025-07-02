package mq

import (
	"context"
	"encoding/json"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/mq"
	"github.com/chaitin/panda-wiki/mq/types"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/rag"
	"github.com/chaitin/panda-wiki/usecase"
)

type RAGMQHandler struct {
	consumer   mq.MQConsumer
	logger     *log.Logger
	rag        rag.RAGService
	nodeRepo   *pg.NodeRepository
	kbRepo     *pg.KnowledgeBaseRepository
	modelRepo  *pg.ModelRepository
	llmUsecase *usecase.LLMUsecase
}

func NewRAGMQHandler(consumer mq.MQConsumer, logger *log.Logger, rag rag.RAGService, nodeRepo *pg.NodeRepository, kbRepo *pg.KnowledgeBaseRepository, llmUsecase *usecase.LLMUsecase, modelRepo *pg.ModelRepository) (*RAGMQHandler, error) {
	h := &RAGMQHandler{
		consumer:   consumer,
		logger:     logger.WithModule("mq.rag"),
		rag:        rag,
		nodeRepo:   nodeRepo,
		kbRepo:     kbRepo,
		llmUsecase: llmUsecase,
		modelRepo:  modelRepo,
	}
	if err := consumer.RegisterHandler(domain.VectorTaskTopic, h.HandleNodeContentVectorRequest); err != nil {
		return nil, err
	}
	return h, nil
}

func (h *RAGMQHandler) HandleNodeContentVectorRequest(ctx context.Context, msg types.Message) error {
	var request domain.NodeReleaseVectorRequest
	err := json.Unmarshal(msg.GetData(), &request)
	if err != nil {
		h.logger.Error("unmarshal node content vector request failed", log.Error(err))
		return nil
	}
	switch request.Action {
	case "upsert":
		h.logger.Debug("upsert node content vector request", "request", request)
		nodeRelease, err := h.nodeRepo.GetNodeReleaseByID(ctx, request.NodeReleaseID)
		if err != nil {
			h.logger.Error("get node content by ids failed", log.Error(err))
			return nil
		}
		kb, err := h.kbRepo.GetKnowledgeBaseByID(ctx, request.KBID)
		if err != nil {
			h.logger.Error("get kb failed", log.Error(err), log.String("kb_id", request.KBID))
			return nil
		}
		// 如果该知识库尚未创建向量数据集，先自动创建并保存
		if kb.DatasetID == "" {
			newDatasetID, err := h.rag.CreateKnowledgeBase(ctx)
			if err != nil {
				h.logger.Error("create rag dataset failed", log.Error(err))
				return nil
			}
			// 更新数据库记录，保证后续请求直接使用
			if err := h.kbRepo.UpdateDatasetID(ctx, kb.ID, newDatasetID); err != nil {
				h.logger.Error("update kb dataset_id failed", log.Error(err))
				return nil
			}
			kb.DatasetID = newDatasetID
			h.logger.Info("auto created rag dataset for kb", log.String("kb_id", kb.ID), log.String("dataset_id", newDatasetID))
		}

		// upsert node content chunks
		docID, err := h.rag.UpsertRecords(ctx, kb.DatasetID, nodeRelease)
		if err != nil {
			h.logger.Error("upsert node content vector failed", log.Error(err))
			return nil
		}
		// update node doc_id
		if err := h.nodeRepo.UpdateNodeReleaseDocID(ctx, request.NodeReleaseID, docID); err != nil {
			h.logger.Error("update node doc_id failed", log.String("node_id", request.NodeReleaseID), log.Error(err))
			return nil
		}
		// delete old RAG records
		// get old doc_ids by node_id
		oldDocIDs, err := h.nodeRepo.GetOldNodeDocIDsByNodeID(ctx, nodeRelease.ID, nodeRelease.NodeID)
		if err != nil {
			h.logger.Error("get old doc_ids by node_id failed", log.String("node_id", nodeRelease.NodeID), log.Error(err))
			return nil
		}
		if len(oldDocIDs) > 0 {
			// delete old RAG records
			if err := h.rag.DeleteRecords(ctx, kb.DatasetID, oldDocIDs); err != nil {
				h.logger.Error("delete old RAG records failed", log.String("kb_id", kb.ID), log.Error(err))
				return nil
			}
		}

		h.logger.Info("upsert node content vector success", log.Any("updated_ids", request.NodeReleaseID))
	case "delete":
		h.logger.Info("delete node content vector request", log.Any("request", request))
		kb, err := h.kbRepo.GetKnowledgeBaseByID(ctx, request.KBID)
		if err != nil {
			h.logger.Error("get kb failed", log.Error(err))
			return nil
		}
		if err := h.rag.DeleteRecords(ctx, kb.DatasetID, []string{request.DocID}); err != nil {
			h.logger.Error("delete node content vector failed", log.Error(err))
			return nil
		}
		h.logger.Info("delete node content vector success", log.Any("deleted_id", request.NodeReleaseID), log.Any("deleted_doc_id", request.DocID))
	case "summary":
		h.logger.Info("summary node content vector request", log.Any("request", request))
		node, err := h.nodeRepo.GetNodeByID(ctx, request.NodeID)
		if err != nil {
			h.logger.Error("get node by id failed", log.Error(err))
			return nil
		}
		if node.Type == domain.NodeTypeFolder {
			h.logger.Info("node is folder, skip summary", log.Any("node_id", request.NodeID))
			return nil
		}
		model, err := h.modelRepo.GetChatModel(ctx)
		if err != nil {
			h.logger.Error("get chat model failed", log.Error(err))
			return nil
		}
		// 提取纯文本，避免脚本样式进入摘要
		plain := usecase.StripHTMLPublic(node.Content)
		summary, err := h.llmUsecase.SummaryNode(ctx, model, node.Name, plain)
		if err != nil {
			h.logger.Warn("LLM summary failed, use fallback", log.Error(err))
			summary = usecase.FallbackSummaryLocalPublic(node.Content)
		}
		if err := h.nodeRepo.UpdateNodeSummary(ctx, request.KBID, request.NodeID, summary); err != nil {
			h.logger.Error("update node summary failed", log.Error(err))
			return nil
		}
		h.logger.Info("summary node content vector success", log.Any("summary_id", request.NodeReleaseID), log.Any("summary", summary))
	}

	return nil
}
