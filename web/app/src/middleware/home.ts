import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest, kb_id: string, authToken: string) {
  const url = request.nextUrl.clone()

  // 简单的重定向逻辑，避免API调用
  if (url.pathname === '/') {
    return NextResponse.redirect(new URL('/welcome', request.url))
  }

  return NextResponse.next()
}