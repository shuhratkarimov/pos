// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value
  const role = request.cookies.get('role')?.value // agar login vaqtida set qilgan bo‘lsangiz

  const { pathname } = request.nextUrl

  // Agar token bo'lmasa → login page
  if (!token) {
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // Login pagega kirish → redirect qilish
  if (pathname === '/login') {
    if (role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Admin rootga kirsa → /admin
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