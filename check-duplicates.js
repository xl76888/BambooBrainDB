// 检查API返回数据是否有重复的脚本
async function checkForDuplicates() {
  try {
    // 替换为你的实际KB ID
    const KB_ID = process.env.DEV_KB_ID || 'test';
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    
    console.log('🔍 检查API数据重复性...');
    console.log(`API URL: ${API_URL}/share/v1/node/list`);
    console.log(`KB ID: ${KB_ID}`);
    
    const response = await fetch(`${API_URL}/share/v1/node/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-KB-ID': KB_ID,
      }
    });

    if (!response.ok) {
      console.error('❌ API请求失败:', response.status, response.statusText);
      return;
    }

    const result = await response.json();
    
    if (!result.data) {
      console.log('⚠️ API未返回数据');
      return;
    }

    const nodes = result.data;
    console.log(`✅ 获取到 ${nodes.length} 条数据`);

    // 检查重复ID
    const idCounts = {};
    const duplicates = [];

    nodes.forEach(node => {
      if (idCounts[node.id]) {
        idCounts[node.id]++;
        if (idCounts[node.id] === 2) {
          duplicates.push(node.id);
        }
      } else {
        idCounts[node.id] = 1;
      }
    });

    if (duplicates.length === 0) {
      console.log('🎉 未发现重复数据！API数据质量良好');
    } else {
      console.log(`⚠️ 发现 ${duplicates.length} 个重复ID:`);
      duplicates.forEach(id => {
        console.log(`  - ${id} (出现 ${idCounts[id]} 次)`);
      });
    }

    // 显示数据样例
    console.log('\n📊 数据样例:');
    nodes.slice(0, 3).forEach((node, idx) => {
      console.log(`${idx + 1}. ID: ${node.id}`);
      console.log(`   Name: ${node.name}`);
      console.log(`   Type: ${node.type}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

// 运行检查
checkForDuplicates();

module.exports = { checkForDuplicates }; 