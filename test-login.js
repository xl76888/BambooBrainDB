const { chromium } = require('playwright');

(async () => {
  console.log('启动Edge浏览器...');
  
  // 启动Edge浏览器
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,  // 设置为false以显示浏览器窗口
    slowMo: 1000     // 减慢操作速度以便观察
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('正在访问登录页面...');
    await page.goto('http://localhost:3010/auth/login?redirect=%2F');

    // 等待页面加载
    await page.waitForLoadState('networkidle');
    console.log('页面加载完成');

    // 截取登录页面的截图
    await page.screenshot({ path: 'login-page.png' });
    console.log('已保存登录页面截图: login-page.png');

    // 查找密码输入框（根据页面结构调整选择器）
    const passwordInput = await page.locator('input[type=\"password\"], input[placeholder*=\"密码\"], input[placeholder*=\"口令\"], input[placeholder*=\"password\"]').first();
    
    if (await passwordInput.isVisible()) {
      console.log('找到密码输入框，正在输入口令...');
      await passwordInput.fill('admin123');
      
      // 查找登录/认证按钮
      const loginButton = await page.locator('button:has-text(\"认证访问\"), button:has-text(\"登录\"), button[type=\"submit\"]').first();
      
      if (await loginButton.isVisible()) {
        console.log('找到登录按钮，正在点击...');
        await loginButton.click();
        
        // 等待登录结果
        await page.waitForTimeout(3000);
        
        // 检查是否成功跳转
        const currentUrl = page.url();
        console.log('当前页面URL:', currentUrl);
        
        if (currentUrl.includes('/auth/login')) {
          console.log('❌ 登录失败，仍在登录页面');
        } else {
          console.log('✅ 登录成功，已跳转到:', currentUrl);
        }
        
        // 截取登录后的截图
        await page.screenshot({ path: 'after-login.png' });
        console.log('已保存登录后截图: after-login.png');
        
      } else {
        console.log('❌ 未找到登录按钮');
      }
    } else {
      console.log('❌ 未找到密码输入框');
    }

  } catch (error) {
    console.error('测试过程中出现错误:', error.message);
  } finally {
    // 等待5秒以便观察结果
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
    console.log('浏览器已关闭');
  }
})();
