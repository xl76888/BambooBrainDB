const http = require('http');

function testScrape() {
  const payload = JSON.stringify({
    url: "http://panda-wiki-backend:8000/static-file/8178501c-3de1-4c10-9c74-90e61f1716d3/7e37ed47-4d11-4aa5-a996-fa770a434abc.docx",
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

  console.log('测试RAG服务文档抓取...');
  console.log('请求:', payload);

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('状态码:', res.statusCode);
      console.log('响应:', data);
      
      try {
        const result = JSON.parse(data);
        if (result.err === 0) {
          console.log('\n✅ 处理成功!');
          console.log('标题:', result.data.title);
          console.log('内容长度:', result.data.markdown ? result.data.markdown.length : 0);
          if (result.data.markdown) {
            console.log('内容预览:', result.data.markdown.substring(0, 200) + '...');
          }
        } else {
          console.log('\n❌ 处理失败:', result.msg);
        }
      } catch (error) {
        console.log('\n❌ 解析响应失败:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('请求错误:', error);
  });

  req.write(payload);
  req.end();
}

testScrape(); 