-- 创建知识库发布版本，使前端能够显示文档
INSERT INTO kb_releases (id, kb_id, tag, message, created_at) 
VALUES (
    'release-' || extract(epoch from now())::text,
    '8178501c-3de1-4c10-9c74-90e61f1716d3',
    'v1.0.0',
    'Initial release with test documents',
    now()
); 