const { spawn } = require('child_process');

function execDockerCommand(command) {
  return new Promise((resolve, reject) => {
    const process = spawn('docker', ['exec', 'panda-wiki-postgres', 'psql', '-U', 'pandawiki', '-d', 'pandawiki', '-c', command], {
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Process exited with code ${code}`));
      }
    });
  });
}

async function checkDatabaseContent() {
  try {
    console.log('=== 检查数据库中的文档内容 ===\n');
    
    // 检查节点数量和基本信息
    console.log('1. 检查节点数量和基本信息:');
    const nodeCountResult = await execDockerCommand('SELECT COUNT(*) as total_nodes, COUNT(CASE WHEN type = 2 THEN 1 END) as document_nodes FROM nodes;');
    console.log(nodeCountResult);
    
    // 检查最新的几个文档节点
    console.log('\n2. 检查最新的文档节点:');
    const nodesResult = await execDockerCommand("SELECT id, name, type, LENGTH(content) as content_length, created_at FROM nodes WHERE type = 2 ORDER BY created_at DESC LIMIT 5;");
    console.log(nodesResult);
    
    // 检查具体的文档内容
    console.log('\n3. 检查具体文档的内容预览:');
    const contentResult = await execDockerCommand("SELECT name, SUBSTRING(content, 1, 500) as content_preview FROM nodes WHERE type = 2 AND content IS NOT NULL AND LENGTH(content) > 0 ORDER BY created_at DESC LIMIT 3;");
    console.log(contentResult);
    
    // 检查空内容的文档
    console.log('\n4. 检查空内容的文档:');
    const emptyContentResult = await execDockerCommand("SELECT id, name, type, LENGTH(COALESCE(content, '')) as content_length FROM nodes WHERE type = 2 AND (content IS NULL OR LENGTH(content) = 0) ORDER BY created_at DESC LIMIT 5;");
    console.log(emptyContentResult);
    
  } catch (error) {
    console.error('数据库查询失败:', error.message);
  }
}

checkDatabaseContent(); 