import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest, kb_id: string, authToken: string) {
  const url = request.nextUrl.clone();

  try {
    // 构建代理请求到后端API
    const apiBaseUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
    const targetUrl = `${apiBaseUrl}${url.pathname}${url.search}`;

    // 复制请求头，添加认证信息
    const proxyHeaders = new Headers();

    // 复制原始请求头（排除一些不需要的头）
    request.headers.forEach((value, key) => {
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        proxyHeaders.set(key, value);
      }
    });

    // 添加认证相关头信息
    proxyHeaders.set('x-kb-id', kb_id);
    if (authToken) {
      proxyHeaders.set('X-Simple-Auth-Password', authToken);
    }

    // 构建代理请求选项
    const proxyOptions: RequestInit = {
      method: request.method,
      headers: proxyHeaders,
    };

    // 如果是有请求体的方法，添加请求体
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const body = await request.text();
        if (body) {
          proxyOptions.body = body;
        }
      } catch (error) {
        console.error('读取请求体失败:', error);
      }
    }

    // 发送代理请求
    const response = await fetch(targetUrl, proxyOptions);

    // 检查是否返回401状态码
    if (response.status === 401) {
      // 跳转到登录页面，携带当前页面作为重定向参数
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', url.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 复制响应头
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // 排除一些不应该传递的头
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // 获取响应体
    const responseBody = await response.text();

    // 返回代理响应
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('代理请求失败:', error);

    // 如果是网络错误或其他错误，返回500错误
    return new NextResponse(
      JSON.stringify({
        error: '服务暂时不可用，请稍后重试',
        message: error instanceof Error ? error.message : '未知错误'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}