const http = require('http');

// 模拟文档重新处理
function retriggerDocumentProcessing(nodeId, fileKey) {
  return new Promise((resolve, reject) => {
    // 构建重新处理请求
    const payload = JSON.stringify({
      url: `/static-file/${fileKey}`,
      kb_id: "8178501c-3de1-4c10-9c74-90e61f1716d3"
    });

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/scrape',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    console.log(`\n=== 重新处理文档 ${nodeId} ===`);
    console.log('请求URL:', `http://${options.hostname}:${options.port}${options.path}`);
    console.log('请求体:', payload);

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('响应状态码:', res.statusCode);
        console.log('响应内容:', data);
        
        try {
          const result = JSON.parse(data);
          if (result.err === 0) {
            console.log('✅ 文档处理成功!');
            console.log('标题:', result.data.title);
            console.log('内容长度:', result.data.markdown ? result.data.markdown.length : 0);
            resolve(result.data);
          } else {
            console.log('❌ 文档处理失败:', result.msg);
            reject(new Error(result.msg));
          }
        } catch (error) {
          console.log('❌ 解析响应失败:', error.message);
          console.log('原始响应:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ 请求错误:', error);
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('🔄 开始重新处理失败的文档...');
  
  // 处理失败的文档
  const failedDoc = {
    id: '0197b069-ea46-74c6-8d4d-c4b4348b1779',
    name: '会议分享提纲',
    fileKey: '8178501c-3de1-4c10-9c74-90e61f1716d3/7e37ed47-4d11-4aa5-a996-fa770a434abc.docx'
  };
  
  try {
    const result = await retriggerDocumentProcessing(failedDoc.id, failedDoc.fileKey);
    console.log(`\n✅ 文档 "${failedDoc.name}" 重新处理成功!`);
    
    // 这里可以添加更新数据库的逻辑
    console.log('\n📋 建议手动更新数据库中的文档内容');
    
  } catch (error) {
    console.error(`\n❌ 文档 "${failedDoc.name}" 重新处理失败:`, error.message);
  }
}

main(); 