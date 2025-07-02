const { chromium } = require('playwright');

(async () => {
  console.log('🚀 启动Edge浏览器...');
  
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    slowMo: 500
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('📍 正在访问登录页面...');
    await page.goto('http://localhost:3010/auth/login?redirect=%2F');
    await page.waitForLoadState('networkidle');
    
    console.log('⏱️  等待页面完全初始化...');
    await page.waitForTimeout(3000);

    // 检查页面元素
    console.log('🔍 查找密码输入框...');
    const passwordInput = await page.locator('input[type=\"password\"]').first();
    
    if (await passwordInput.isVisible()) {
      console.log('✅ 找到密码输入框');
      await passwordInput.fill('admin123');
      console.log('✅ 已输入口令: admin123');
      
      // 等待一下让前端处理输入
      await page.waitForTimeout(2000);
      
      // 检查按钮状态
      const loginButton = await page.locator('button:has-text(\"认证访问\")').first();
      
      console.log('🔍 检查认证按钮状态...');
      const isDisabled = await loginButton.getAttribute('disabled');
      const isVisible = await loginButton.isVisible();
      
      console.log(\按钮可见: \\);
      console.log(\按钮禁用: \\);
      
      if (isDisabled !== null) {
        console.log('⏳ 按钮当前被禁用，等待启用...');
        
        // 尝试等待按钮启用 - 简化版本
        await page.waitForTimeout(5000);
        
        console.log('🔄 尝试点击...');
        try {
          await loginButton.click({ force: true });
          await page.waitForTimeout(3000);
          
          const currentUrl = page.url();
          console.log(\🌐 点击后URL: \\);
          
          if (currentUrl.includes('/auth/login')) {
            console.log('❌ 仍在登录页面');
          } else {
            console.log('✅ 登录成功！');
          }
        } catch (clickError) {
          console.log('❌ 点击失败:', clickError.message);
        }
      }
      
    } else {
      console.log('❌ 未找到密码输入框');
    }

    // 截图
    await page.screenshot({ path: 'login-test-result.png', fullPage: true });
    console.log('📸 已保存测试结果截图');

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
    console.log('🔚 测试完成，浏览器已关闭');
  }
})();
