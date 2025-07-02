-- 修复知识库访问设置，允许所有IP访问
UPDATE knowledge_bases 
SET access_settings = '{"hosts": ["*"], "ports": [80, 443, 3010, 8001], "base_url": "", "ssl_ports": [], "public_key": "", "private_key": "", "simple_auth": {"enabled": false, "password": ""}}'
WHERE id = '8178501c-3de1-4c10-9c74-90e61f1716d3'; 