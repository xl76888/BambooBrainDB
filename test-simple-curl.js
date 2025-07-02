const { exec } = require('child_process');

// 执行curl命令测试RAG服务
const curlCommand = `curl -s -X POST http://localhost:8080/api/v1/scrape -H "Content-Type: application/json" -d '{"url":"https://example.com","kb_id":"test"}'`;

console.log('执行curl命令测试RAG服务...');
console.log('命令:', curlCommand);

exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
        console.error('执行错误:', error);
        return;
    }
    
    if (stderr) {
        console.error('错误输出:', stderr);
    }
    
    console.log('响应结果:');
    console.log(stdout);
    
    // 尝试解析JSON
    try {
        const result = JSON.parse(stdout);
        if (result.err === 0) {
            console.log('\n✅ 抓取成功!');
            console.log('标题:', result.data.title);
            console.log('内容长度:', result.data.markdown ? result.data.markdown.length : 0);
        } else {
            console.log('\n❌ 抓取失败:', result.msg);
        }
    } catch (e) {
        console.error('JSON解析失败:', e.message);
    }
}); 