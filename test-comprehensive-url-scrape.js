const axios = require('axios');

// 管理员登录凭据
const ADMIN_ACCOUNT = 'admin';
const ADMIN_PASSWORD = 'admin123';

async function login() {
    try {
        console.log('正在登录...');
        const response = await axios.post('http://localhost:8001/api/v1/user/login', {
            account: ADMIN_ACCOUNT,
            password: ADMIN_PASSWORD
        });

        if (response.data.success) {
            console.log('✅ 登录成功');
            return response.data.data.token;
        } else {
            console.log('❌ 登录失败:', response.data.message);
            return null;
        }
    } catch (error) {
        console.error('❌ 登录请求失败:', error.message);
        return null;
    }
}

async function testURL(token, url, description) {
    console.log(`\n测试: ${description}`);
    console.log(`URL: ${url}`);
    
    try {
        const kbId = '8209ef48-c0bd-4e1f-b280-723f3d583fad';
        
        // 调用后端的scrape API
        const response = await axios.post('http://localhost:8001/api/v1/crawler/scrape', {
            url: url,
            kb_id: kbId
        }, {
            timeout: 60000, // 增加超时时间
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.data.success) {
            console.log('✅ 导入成功');
            console.log('标题:', response.data.data.title?.substring(0, 100));
            console.log('内容长度:', response.data.data.content?.length || 0);
            console.log('内容预览:', response.data.data.content?.substring(0, 200) + '...');
        } else {
            console.log('❌ 导入失败:', response.data.message);
        }
        
    } catch (error) {
        console.error('❌ 请求失败:', error.message);
        if (error.response) {
            console.error('错误状态:', error.response.status);
            console.error('错误详情:', error.response.data);
        }
    }
}

async function testStaticFileAccess(token) {
    console.log('\n测试静态文件访问...');
    
    try {
        // 测试一个已知的静态文件路径
        const staticFileUrl = '/static-file/8209ef48-c0bd-4e1f-b280-723f3d583fad/ae4bcef2-1612-4205-afb0-cf04814e32bb.png';
        const kbId = '8209ef48-c0bd-4e1f-b280-723f3d583fad';
        
        // 调用后端的scrape API测试静态文件
        const response = await axios.post('http://localhost:8001/api/v1/crawler/scrape', {
            url: staticFileUrl,
            kb_id: kbId
        }, {
            timeout: 30000,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.data.success) {
            console.log('✅ 静态文件处理成功');
            console.log('标题:', response.data.data.title);
            console.log('内容长度:', response.data.data.content?.length || 0);
        } else {
            console.log('❌ 静态文件处理失败:', response.data.message);
        }
        
    } catch (error) {
        console.error('❌ 静态文件测试失败:', error.message);
        if (error.response) {
            console.error('错误响应:', error.response.data);
        }
    }
}

async function testDocumentCreation(token) {
    console.log('\n测试文档创建和列表...');
    
    try {
        // 获取当前节点列表
        const listResponse = await axios.get('http://localhost:8001/share/v1/node/list', {
            headers: {
                'X-KB-ID': '8209ef48-c0bd-4e1f-b280-723f3d583fad'
            }
        });
        
        console.log('当前文档数量:', listResponse.data?.data?.length || 0);
        if (listResponse.data?.data?.length > 0) {
            console.log('现有文档:');
            listResponse.data.data.forEach((doc, index) => {
                console.log(`  ${index + 1}. ${doc.name} (ID: ${doc.id})`);
            });
        }
        
    } catch (error) {
        console.error('❌ 获取文档列表失败:', error.message);
    }
}

// 运行全面测试
async function main() {
    const token = await login();
    if (!token) {
        console.error('无法获取认证token，退出测试');
        return;
    }
    
    // 测试文档列表
    await testDocumentCreation(token);
    
    // 测试静态文件访问
    await testStaticFileAccess(token);
    
    // 测试不同类型的URL
    const testUrls = [
        {
            url: 'https://httpbin.org/html',
            description: '简单HTML页面'
        },
        {
            url: 'https://jsonplaceholder.typicode.com/posts/1',
            description: 'JSON API响应'
        },
        {
            url: 'https://example.com',
            description: '标准示例网页'
        }
    ];
    
    for (const test of testUrls) {
        await testURL(token, test.url, test.description);
        // 添加延迟避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n测试完成！');
}

main().catch(console.error); 