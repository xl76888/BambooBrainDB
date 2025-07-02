const { chromium } = require('playwright');

async function testLogin() {
  console.log('启动Edge浏览器...');
  
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    slowMo: 1000
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('访问登录页面...');
    await page.goto('http://localhost:3010/auth/login?redirect=%2F');
    await page.waitForLoadState('networkidle');
    
    console.log('等待页面初始化...');
    await page.waitForTimeout(3000);

    const passwordInput = page.locator('input[type=\
password\]');
    
    if (await passwordInput.isVisible()) {
      console.log('找到密码输入框，输入口令...');
      await passwordInput.fill('admin123');
      
      await page.waitForTimeout(2000);
      
      const loginButton = page.locator('button').filter({ hasText: '认证访问' });
      
      if (await loginButton.isVisible()) {
        console.log('找到认证按钮');
        
        const isDisabled = await loginButton.getAttribute('disabled');
        console.log('按钮禁用状态:', isDisabled !== null);
        
        if (isDisabled !== null) {
          console.log('按钮被禁用，等待5秒后强制点击...');
          await page.waitForTimeout(5000);
        }
        
        try {
          await loginButton.click({ force: true });
          console.log('已点击认证按钮');
          
          await page.waitForTimeout(3000);
          
          const currentUrl = page.url();
          console.log('当前URL:', currentUrl);
          
          if (currentUrl.includes('/auth/login')) {
            console.log('结果: 仍在登录页面，登录失败');
          } else {
            console.log('结果: 登录成功，已跳转');
          }
          
        } catch (error) {
          console.log('点击失败:', error.message);
        }
      } else {
        console.log('未找到认证按钮');
      }
    } else {
      console.log('未找到密码输入框');
    }

    await page.screenshot({ path: 'final-result.png', fullPage: true });
    console.log('已保存截图: final-result.png');

  } catch (error) {
    console.error('测试错误:', error.message);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
    console.log('测试完成');
  }
}

testLogin();
