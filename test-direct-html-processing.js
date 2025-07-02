const axios = require('axios');
const FormData = require('form-data');

async function testDirectHTMLProcessing() {
    console.log('直接测试RAG服务的HTML处理能力...\n');
    
    // 测试HTML内容
    const testHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>测试页面标题</title>
    <style>
        body { margin: 0; }
        .hidden { display: none; }
    </style>
    <script>
        console.log('这是脚本内容');
    </script>
</head>
<body>
    <h1>这是主标题</h1>
    <p>这是第一段内容。</p>
    <p>这是第二段内容，包含<strong>粗体文字</strong>和<em>斜体文字</em>。</p>
    <ul>
        <li>列表项目1</li>
        <li>列表项目2</li>
    </ul>
    <div class="hidden">这是隐藏内容</div>
    <p>最后一段内容。</p>
</body>
</html>
    `;

    try {
        // 创建表单数据
        const form = new FormData();
        
        // 将HTML内容作为文件上传
        form.append('file', Buffer.from(testHTML), {
            filename: 'test.html',
            contentType: 'text/html'
        });
        form.append('dataset_id', '8209ef48-c0bd-4e1f-b280-723f3d583fad');
        
        console.log('发送HTML内容到RAG服务...');
        const response = await axios.post('http://localhost:8080/api/v1/datasets/8209ef48-c0bd-4e1f-b280-723f3d583fad/documents', form, {
            headers: {
                ...form.getHeaders(),
            },
            timeout: 30000
        });
        
        console.log('RAG服务响应状态:', response.status);
        
        // 检查响应数据结构
        console.log('响应数据类型:', typeof response.data);
        console.log('响应数据键:', response.data ? Object.keys(response.data) : '无数据');
        
        // 显示完整响应（但限制长度）
        const responseStr = JSON.stringify(response.data, null, 2);
        if (responseStr.length > 1000) {
            console.log('响应数据（前1000字符）:', responseStr.substring(0, 1000) + '...');
        } else {
            console.log('响应数据:', responseStr);
        }
        
        // 检查各个字段
        if (response.data) {
            console.log('\n=== 详细字段分析 ===');
            console.log('success字段:', response.data.success);
            console.log('title字段:', response.data.title);
            console.log('content字段存在:', 'content' in response.data);
            console.log('message字段:', response.data.message);
            
            if (response.data.success) {
                console.log('\n✅ HTML处理成功!');
                console.log('解析后的标题:', response.data.title || '无标题');
                if (response.data.content) {
                    console.log('内容长度:', response.data.content.length);
                    console.log('内容预览:', response.data.content.substring(0, 200) + '...');
                } else {
                    console.log('无内容字段');
                }
            } else {
                console.log('\n❌ HTML处理失败:', response.data.message || '未知错误');
            }
        } else {
            console.log('\n❌ 无响应数据');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.response) {
            console.error('错误状态:', error.response.status);
            console.error('错误数据:', error.response.data);
        }
    }
}

testDirectHTMLProcessing(); 