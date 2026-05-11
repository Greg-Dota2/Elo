import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect all /admin UI routes and /api/admin/* API routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (pathname !== '/admin/login' && pathname !== '/api/admin/login') {
      const token = req.cookies.get('admin_token')?.value
      const secret = process.env.ADMIN_PASSWORD

      if (!secret || token !== secret) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const loginUrl = req.nextUrl.clone()
        loginUrl.pathname = '/admin/login'
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  // Redirect bare / to /ru for users who previously chose Russian
  if (pathname === '/') {
    const pref = req.cookies.get('locale')?.value
    if (pref === 'ru') {
      return NextResponse.redirect(new URL('/ru', req.url))
    }
  }

  // Set locale header so the root layout can set <html lang>
  const res = NextResponse.next()
  res.headers.set('x-locale', pathname.startsWith('/ru') ? 'ru' : 'en')
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',],
}
