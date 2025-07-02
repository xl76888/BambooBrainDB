const http = require('http');

// 检查文档详情
function checkNodeDetail(nodeId) {
  const options = {
    hostname: 'localhost',
    port: 8001,
    path: `/share/v1/node/detail?id=${nodeId}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log(`\n=== 文档 ${nodeId} 详情 ===`);
        console.log('状态码:', res.statusCode);
        console.log('成功:', result.success);
        
        if (result.success && result.data) {
          const node = result.data;
          console.log('文档名称:', node.name);
          console.log('文档类型:', node.type);
          console.log('内容长度:', node.content ? node.content.length : 0);
          console.log('内容预览:', node.content ? node.content.substring(0, 200) + '...' : '无内容');
          console.log('创建时间:', node.created_at);
        } else {
          console.log('响应数据:', result);
        }
      } catch (error) {
        console.log('解析响应失败:', error.message);
        console.log('原始响应:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('请求错误:', error);
  });

  req.end();
}

// 检查多个文档
const nodeIds = [
  '0197aab9-03dd-7565-b12b-542b39b6da70',
  '0197aab9-8cd3-703c-9089-c603d30b39e7', 
  '0197aabc-89e1-7aa7-bd5b-073555e2b211'
];

console.log('开始检查文档内容...');

nodeIds.forEach((id, index) => {
  setTimeout(() => {
    checkNodeDetail(id);
  }, index * 1000);
}); 