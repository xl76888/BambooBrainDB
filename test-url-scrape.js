const axios = require('axios');

async function testURLScrape() {
    console.log('测试URL导入功能...');
    
    try {
        // 测试简单的网页URL
        const testURL = 'https://www.baidu.com';
        const kbId = '8209ef48-c0bd-4e1f-b280-723f3d583fad'; // 知识库ID
        
        console.log(`测试URL: ${testURL}`);
        console.log(`知识库ID: ${kbId}`);
        
        // 调用后端的scrape API
        const response = await axios.post('http://localhost:8001/api/v1/crawler/scrape', {
            url: testURL,
            kb_id: kbId
        }, {
            timeout: 30000
        });
        
        console.log('后端API响应:', response.status);
        console.log('响应数据:', JSON.stringify(response.data, null, 2));
        
        if (response.data.code === 0) {
            console.log('✅ URL导入功能正常');
            console.log('标题:', response.data.data.title);
            console.log('内容长度:', response.data.data.content?.length || 0);
        } else {
            console.log('❌ URL导入失败:', response.data.msg);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('错误响应:', error.response.data);
        }
    }
}

async function testRAGService() {
    console.log('\n测试RAG服务...');
    
    try {
        // 直接测试RAG服务
        const testURL = 'https://www.baidu.com';
        const kbId = '8209ef48-c0bd-4e1f-b280-723f3d583fad';
        
        const response = await axios.post('http://localhost:8080/api/v1/scrape', {
            url: testURL,
            kb_id: kbId
        }, {
            timeout: 30000
        });
        
        console.log('RAG服务响应:', response.status);
        console.log('响应数据:', JSON.stringify(response.data, null, 2));
        
        if (response.data.err === 0) {
            console.log('✅ RAG服务正常');
            console.log('标题:', response.data.data.title);
            console.log('内容长度:', response.data.data.markdown?.length || 0);
        } else {
            console.log('❌ RAG服务失败:', response.data.msg);
        }
        
    } catch (error) {
        console.error('❌ RAG服务测试失败:', error.message);
        if (error.response) {
            console.error('错误响应:', error.response.data);
        }
    }
}

// 运行测试
async function main() {
    await testRAGService();
    await testURLScrape();
}

main().catch(console.error); 