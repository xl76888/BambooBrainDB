-- 设置完整的发布版本系统

-- 获取最新的知识库发布版本ID
DO $$
DECLARE
    kb_release_id TEXT;
    node_record RECORD;
    node_release_id TEXT;
    relation_id TEXT;
BEGIN
    -- 获取最新的知识库发布版本ID
    SELECT id INTO kb_release_id 
    FROM kb_releases 
    WHERE kb_id = '8178501c-3de1-4c10-9c74-90e61f1716d3' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- 为每个节点创建节点发布版本并建立关联
    FOR node_record IN 
        SELECT id, kb_id, doc_id, type, name, content, meta, parent_id, position, created_at, updated_at, status, visibility
        FROM nodes 
        WHERE kb_id = '8178501c-3de1-4c10-9c74-90e61f1716d3' AND status = 1
    LOOP
        -- 生成节点发布版本ID
        node_release_id := 'node-release-' || extract(epoch from now())::text || '-' || right(node_record.id, 3);
        
        -- 创建节点发布版本
        INSERT INTO node_releases (
            id, kb_id, node_id, doc_id, type, visibility, name, meta, content, 
            parent_id, position, created_at, updated_at
        ) VALUES (
            node_release_id,
            node_record.kb_id,
            node_record.id,
            node_record.doc_id,
            node_record.type,
            node_record.visibility,
            node_record.name,
            node_record.meta,
            node_record.content,
            node_record.parent_id,
            node_record.position,
            node_record.created_at,
            node_record.updated_at
        );
        
        -- 生成关联ID
        relation_id := 'relation-' || extract(epoch from now())::text || '-' || right(node_record.id, 3);
        
        -- 创建知识库发布版本与节点发布版本的关联
        INSERT INTO kb_release_node_releases (
            id, kb_id, release_id, node_id, node_release_id, created_at
        ) VALUES (
            relation_id,
            node_record.kb_id,
            kb_release_id,
            node_record.id,
            node_release_id,
            now()
        );
        
        -- 添加小延迟确保ID唯一性
        PERFORM pg_sleep(0.001);
    END LOOP;
END $$;

-- 查看现有节点
SELECT id, title FROM nodes WHERE kb_id = '8178501c-3de1-4c10-9c74-90e61f1716d3';

-- 创建节点发布版本
INSERT INTO node_releases (
    id, node_id, kb_id, tag, title, content, meta, 
    icon, sort_order, created_at, updated_at
)
SELECT 
    concat(n.id, '-release-', extract(epoch from now())::text) as id,
    n.id as node_id,
    n.kb_id,
    'v1.0.0' as tag,
    n.title,
    n.content,
    n.meta,
    n.icon,
    n.sort_order,
    now() as created_at,
    now() as updated_at
FROM nodes n 
WHERE n.kb_id = '8178501c-3de1-4c10-9c74-90e61f1716d3'
ON CONFLICT (id) DO NOTHING; 