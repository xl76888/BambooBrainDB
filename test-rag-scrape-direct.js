const axios = require('axios');

async function testRAGScrapeEndpoint() {
    console.log('直接测试RAG服务的scrape端点...\n');
    
    const testUrls = [
        {
            url: 'https://example.com',
            description: '标准示例网页'
        },
        {
            url: 'https://httpbin.org/html',
            description: '带标题的HTML页面'
        }
    ];
    
    for (const test of testUrls) {
        console.log(`\n测试: ${test.description}`);
        console.log(`URL: ${test.url}`);
        
        try {
            const response = await axios.post('http://localhost:8080/api/v1/scrape', {
                url: test.url,
                kb_id: '8209ef48-c0bd-4e1f-b280-723f3d583fad'
            }, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('响应状态:', response.status);
            console.log('响应数据:', JSON.stringify(response.data, null, 2));
            
            if (response.data.err === 0) {
                const data = response.data.data;
                console.log('\n✅ 抓取成功!');
                console.log('标题:', data.title);
                console.log('内容长度:', data.markdown ? data.markdown.length : 0);
                console.log('内容预览:', data.markdown ? data.markdown.substring(0, 200) + '...' : '无内容');
            } else {
                console.log('\n❌ 抓取失败:', response.data.msg);
            }
            
        } catch (error) {
            console.error('❌ 请求失败:', error.message);
            if (error.response) {
                console.error('错误状态:', error.response.status);
                console.error('错误数据:', error.response.data);
            }
        }
    }
}

testRAGScrapeEndpoint(); 