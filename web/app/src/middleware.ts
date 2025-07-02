import { NextRequest, NextResponse } from 'next/server';
import { middleware as authMiddleware } from './middleware/auth';
import { middleware as homeMiddleware } from './middleware/home';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 静态文件代理
  if (pathname.startsWith('/static-file/')) {
    const apiBaseUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
    const targetUrl = `${apiBaseUrl}${pathname}`;

    const res = await fetch(targetUrl);
    return new Response(res.body, {
      status: res.status,
      headers: res.headers,
    });
  }

  // 其他静态资源跳过处理
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname.startsWith('/static/')
  ) {
    return NextResponse.next();
  }

  // 获取认证信息
  const kb_id = request.headers.get('x-kb-id') || process.env.DEV_KB_ID || '8178501c-3de1-4c10-9c74-90e61f1716d3';
  const authToken = request.cookies.get(`auth_${kb_id}`)?.value || '';

  // share路径使用认证中间件
  if (pathname.startsWith('/share/v1/')) {
    return await authMiddleware(request, kb_id, authToken);
  }

  // 其他路径使用首页中间件  
  return await homeMiddleware(request, kb_id, authToken);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 