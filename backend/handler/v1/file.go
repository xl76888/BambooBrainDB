package v1

import (
	"context"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/chaitin/panda-wiki/usecase"
	"github.com/minio/minio-go/v7"
)

type FileHandler struct {
	*handler.BaseHandler
	logger      *log.Logger
	auth        middleware.AuthMiddleware
	config      *config.Config
	fileUsecase *usecase.FileUsecase
	minioClient *s3.MinioClient
}

func NewFileHandler(echo *echo.Echo, baseHandler *handler.BaseHandler, logger *log.Logger, auth middleware.AuthMiddleware, minioClient *s3.MinioClient, config *config.Config, fileUsecase *usecase.FileUsecase) *FileHandler {
	h := &FileHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.v1.file"),
		auth:        auth,
		config:      config,
		fileUsecase: fileUsecase,
		minioClient: minioClient,
	}
	group := echo.Group("/api/v1/file", h.auth.Authorize)
	group.POST("/upload", h.Upload)
	
	// 添加静态文件代理路由，不需要认证
	staticGroup := echo.Group("/static-file")
	staticGroup.GET("/*", h.ServeStaticFile)
	
	return h
}

// ServeStaticFile 代理访问MinIO中的静态文件
func (h *FileHandler) ServeStaticFile(c echo.Context) error {
	path := c.Param("*")
	if path == "" {
		return echo.NewHTTPError(http.StatusNotFound, "File not found")
	}
	
	// 移除开头的斜杠
	path = strings.TrimPrefix(path, "/")
	
	ctx, cancel := context.WithTimeout(c.Request().Context(), 30*time.Second)
	defer cancel()
	
	// 直接从MinIO获取文件
	object, err := h.minioClient.GetObject(ctx, domain.Bucket, path, minio.GetObjectOptions{})
	if err != nil {
		h.logger.Error("Failed to get object from MinIO", "path", path, "error", err)
		return echo.NewHTTPError(http.StatusNotFound, "File not found")
	}
	defer object.Close()
	
	// 获取对象信息以设置正确的Content-Type
	objInfo, err := object.Stat()
	if err != nil {
		h.logger.Error("Failed to get object info", "path", path, "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get file info")
	}
	
	// 设置响应头
	c.Response().Header().Set("Content-Type", objInfo.ContentType)
	c.Response().Header().Set("Content-Length", string(rune(objInfo.Size)))
	c.Response().Header().Set("Cache-Control", "public, max-age=31536000") // 1年缓存
	
	// 流式传输文件内容
	_, err = io.Copy(c.Response().Writer, object)
	if err != nil {
		h.logger.Error("Failed to copy file content", "path", path, "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to serve file")
	}
	
	return nil
}

// Upload
//
//	@Summary		Upload File
//	@Description	Upload File
//	@Tags			file
//	@Accept			multipart/form-data
//	@Param			file	formData	file	true	"File"
//	@Param			kb_id	formData	string	false	"Knowledge Base ID"
//	@Success		200		{object}	domain.ObjectUploadResp
//	@Router			/api/v1/file/upload [post]
func (h *FileHandler) Upload(c echo.Context) error {
	cxt := c.Request().Context()
	kbID := c.FormValue("kb_id")
	if kbID == "" {
		kbID = uuid.New().String()
	}
	file, err := c.FormFile("file")
	if err != nil {
		return h.NewResponseWithError(c, "failed to get file", err)
	}

	key, err := h.fileUsecase.UploadFile(cxt, kbID, file)
	if err != nil {
		return h.NewResponseWithError(c, "upload failed", err)
	}

	return h.NewResponseWithData(c, domain.ObjectUploadResp{
		Key: key,
	})
}
