const axios = require('axios');

// 管理员登录凭据
const ADMIN_ACCOUNT = 'admin';
const ADMIN_PASSWORD = 'admin123';

async function login() {
    try {
        const response = await axios.post('http://localhost:8001/api/v1/user/login', {
            account: ADMIN_ACCOUNT,
            password: ADMIN_PASSWORD
        });

        if (response.data.success) {
            return response.data.data.token;
        }
        return null;
    } catch (error) {
        console.error('❌ 登录失败:', error.message);
        return null;
    }
}

async function testRAGDirectly() {
    console.log('直接测试RAG服务HTML处理...\n');
    
    const testUrls = [
        {
            url: 'https://httpbin.org/html',
            description: '有标题的HTML页面'
        },
        {
            url: 'https://example.com',
            description: '简单HTML页面'
        }
    ];
    
    for (const test of testUrls) {
        console.log(`测试: ${test.description}`);
        console.log(`URL: ${test.url}`);
        
        try {
            const response = await axios.post('http://localhost:8080/api/v1/scrape', {
                url: test.url,
                kb_id: '8209ef48-c0bd-4e1f-b280-723f3d583fad'
            }, {
                timeout: 30000
            });
            
            if (response.data.err === 0) {
                console.log('✅ RAG处理成功');
                console.log('标题:', response.data.data.title);
                console.log('内容长度:', response.data.data.markdown?.length || 0);
                console.log('内容预览:', response.data.data.markdown?.substring(0, 200) + '...');
            } else {
                console.log('❌ RAG处理失败:', response.data.msg);
            }
            
        } catch (error) {
            console.error('❌ 请求失败:', error.message);
        }
        
        console.log('---\n');
        
        // 添加延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

async function testBackendAPI(token) {
    console.log('测试后端API HTML处理...\n');
    
    const testUrls = [
        {
            url: 'https://httpbin.org/html',
            description: '有标题的HTML页面'
        },
        {
            url: 'https://example.com',
            description: '简单HTML页面'
        }
    ];
    
    for (const test of testUrls) {
        console.log(`测试: ${test.description}`);
        console.log(`URL: ${test.url}`);
        
        try {
            const response = await axios.post('http://localhost:8001/api/v1/crawler/scrape', {
                url: test.url,
                kb_id: '8209ef48-c0bd-4e1f-b280-723f3d583fad'
            }, {
                timeout: 30000,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.data.success) {
                console.log('✅ 后端处理成功');
                console.log('标题:', response.data.data.title);
                console.log('内容长度:', response.data.data.content?.length || 0);
                console.log('内容预览:', response.data.data.content?.substring(0, 200) + '...');
            } else {
                console.log('❌ 后端处理失败:', response.data.message);
            }
            
        } catch (error) {
            console.error('❌ 请求失败:', error.message);
        }
        
        console.log('---\n');
        
        // 添加延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

async function main() {
    // 首先测试RAG服务
    await testRAGDirectly();
    
    // 然后测试后端API
    const token = await login();
    if (token) {
        await testBackendAPI(token);
    }
}

main().catch(console.error); 