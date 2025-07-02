package pg

import (
	"context"

	"github.com/cloudwego/eino/schema"
	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/pg"
)

type ModelRepository struct {
	db     *pg.DB
	logger *log.Logger
}

func NewModelRepository(db *pg.DB, logger *log.Logger) *ModelRepository {
	return &ModelRepository{db: db, logger: logger.WithModule("repo.pg.model")}
}

func (r *ModelRepository) Create(ctx context.Context, model *domain.Model) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// activate model if it's the first model
		var count int64
		if err := tx.Model(&domain.Model{}).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			model.IsActive = true
		}
		if err := tx.Create(model).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *ModelRepository) GetList(ctx context.Context) ([]*domain.ModelListItem, error) {
	var models []*domain.ModelListItem
	if err := r.db.WithContext(ctx).
		Model(&domain.Model{}).
		Order("created_at ASC").
		Find(&models).Error; err != nil {
		return nil, err
	}
	return models, nil
}

func (r *ModelRepository) Get(ctx context.Context, id string) (*domain.ModelDetailResp, error) {
	var model domain.ModelDetailResp
	if err := r.db.WithContext(ctx).
		Model(&domain.Model{}).
		Where("id = ?", id).
		First(&model).Error; err != nil {
		return nil, err
	}
	return &model, nil
}

func (r *ModelRepository) Update(ctx context.Context, req *domain.UpdateModelReq) error {
	return r.db.WithContext(ctx).
		Model(&domain.Model{}).
		Where("id = ?", req.ID).
		Updates(map[string]any{
			"model":       req.Model,
			"api_key":     req.APIKey,
			"api_header":  req.APIHeader,
			"base_url":    req.BaseURL,
			"api_version": req.APIVersion,
			"provider":    req.Provider,
			"type":        req.Type,
		}).Error
}

func (r *ModelRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// delete model
		if err := tx.Where("id = ?", id).
			Delete(&domain.Model{}).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *ModelRepository) GetChatModel(ctx context.Context) (*domain.Model, error) {
	var model domain.Model
	if err := r.db.WithContext(ctx).
		Model(&domain.Model{}).
		Where("type = ?", domain.ModelTypeChat).
		Where("is_active = ?", true).
		First(&model).Error; err != nil {
		return nil, err
	}
	return &model, nil
}

func (r *ModelRepository) UpdateUsage(ctx context.Context, modelID string, usage *schema.TokenUsage) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// update model usage
		if err := tx.Model(&domain.Model{}).
			Where("id = ?", modelID).
			Updates(map[string]any{
				"prompt_tokens":     gorm.Expr("prompt_tokens + ?", usage.PromptTokens),
				"completion_tokens": gorm.Expr("completion_tokens + ?", usage.CompletionTokens),
				"total_tokens":      gorm.Expr("total_tokens + ?", usage.TotalTokens),
			}).Error; err != nil {
			return err
		}
		return nil
	})
}

// ActivateModel activates a model and deactivates others of the same type
func (r *ModelRepository) ActivateModel(ctx context.Context, modelID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// First get the model to know its type
		var model domain.Model
		if err := tx.Where("id = ?", modelID).First(&model).Error; err != nil {
			return err
		}

		// Deactivate all models of the same type
		if err := tx.Model(&domain.Model{}).
			Where("type = ?", model.Type).
			Update("is_active", false).Error; err != nil {
			return err
		}

		// Activate the specified model
		if err := tx.Model(&domain.Model{}).
			Where("id = ?", modelID).
			Update("is_active", true).Error; err != nil {
			return err
		}

		return nil
	})
}
