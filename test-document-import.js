// 测试文档导入功能
const fs = require('fs');

// 测试配置
const RAG_SERVER = 'http://localhost:8080';
const BACKEND_SERVER = 'http://localhost:8001';

// 测试1: 直接测试RAG服务器的文档解析
async function testRagServer() {
    console.log('\n=== 测试RAG服务器文档解析功能 ===');
    
    try {
        // 测试纯文本文档
        const testContent = `
# 测试文档
这是一个测试文档，包含中文内容。

## 特性
- 支持多种格式
- 智能解析
- 自动标签
        `.trim();
        
        // 模拟上传文件URL（文本文件）
        const testUrl = 'https://raw.githubusercontent.com/example/test.txt';
        
        const response = await fetch(`${RAG_SERVER}/api/v1/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: testUrl,
                kb_id: 'test-kb'
            })
        });
        
        const result = await response.json();
        console.log('RAG服务器响应:', JSON.stringify(result, null, 2));
        
        if (result.err === 0) {
            console.log('✅ RAG服务器正常工作');
            console.log('解析标题:', result.data.title);
            console.log('内容长度:', result.data.markdown.length);
        } else {
            console.log('❌ RAG服务器响应错误:', result.msg);
        }
        
    } catch (error) {
        console.log('❌ RAG服务器测试失败:', error.message);
    }
}

// 测试2: 测试后端文件上传API
async function testFileUpload() {
    console.log('\n=== 测试后端文件上传功能 ===');
    
    try {
        // 读取测试文档
        const testDocContent = fs.readFileSync('test-word-import.md', 'utf8');
        
        // 创建FormData模拟文件上传
        const formData = new FormData();
        const blob = new Blob([testDocContent], { type: 'text/markdown' });
        formData.append('file', blob, 'test-document.md');
        
        const response = await fetch(`${BACKEND_SERVER}/api/v1/file/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ 文件上传成功');
            console.log('上传结果:', JSON.stringify(result, null, 2));
            return result;
        } else {
            console.log('❌ 文件上传失败:', response.status, await response.text());
        }
        
    } catch (error) {
        console.log('❌ 文件上传测试失败:', error.message);
    }
}

// 测试3: 模拟完整的离线导入流程
async function testCompleteImport() {
    console.log('\n=== 模拟完整离线导入流程 ===');
    
    // 这里会模拟前端点击离线导入后的完整流程：
    // 1. 文件上传到后端
    // 2. 生成静态文件URL
    // 3. 调用RAG服务解析
    // 4. 保存到知识库
    
    console.log('1. 模拟文件上传...');
    const uploadResult = await testFileUpload();
    
    if (uploadResult && uploadResult.data && uploadResult.data.url) {
        console.log('2. 使用上传URL进行文档解析...');
        const fileUrl = `${BACKEND_SERVER}${uploadResult.data.url}`;
        
        try {
            const scrapeResponse = await fetch(`${RAG_SERVER}/api/v1/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: fileUrl,
                    kb_id: 'test-kb'
                })
            });
            
            const scrapeResult = await scrapeResponse.json();
            console.log('文档解析结果:', JSON.stringify(scrapeResult, null, 2));
            
            if (scrapeResult.err === 0) {
                console.log('✅ 完整导入流程测试成功！');
                console.log('解析的文档标题:', scrapeResult.data.title);
                console.log('解析的内容长度:', scrapeResult.data.markdown.length);
                console.log('前200字符预览:', scrapeResult.data.markdown.substring(0, 200) + '...');
            } else {
                console.log('❌ 文档解析失败:', scrapeResult.msg);
            }
            
        } catch (error) {
            console.log('❌ 文档解析请求失败:', error.message);
        }
    }
}

// 运行所有测试
async function runAllTests() {
    console.log('🚀 开始测试文档导入功能...');
    
    await testRagServer();
    await testFileUpload();
    await testCompleteImport();
    
    console.log('\n✅ 所有测试完成');
}

// Node.js环境下运行
if (typeof require !== 'undefined' && require.main === module) {
    // 引入fetch polyfill
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    global.fetch = fetch;
    global.FormData = require('form-data');
    global.Blob = require('buffer').Blob;
    
    runAllTests().catch(console.error);
} 