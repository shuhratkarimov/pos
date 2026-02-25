// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value
  const role = request.cookies.get('role')?.value

  const { pathname } = request.nextUrl

  // Agar token bo'lmasa → login page
  if (!token) {
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // Login pagega kirsa → redirect
  if (pathname === '/login') {
    if (role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Admin page-ga kira olishni faqat adminga ruxsat berish
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url)) // admin bo'lmaganlarni home-ga yo'naltirish
    }
  }

  // Agar "/" rootga admin kirsa → /admin
  if (pathname === '/' && role === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ],
}