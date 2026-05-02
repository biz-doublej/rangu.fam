import { NextRequest, NextResponse } from 'next/server'

const UNIVERSITY_HOSTS = new Set(['university.rangu.com', 'www.university.rangu.com'])

function resolveHost(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host') || ''
  return host.toLowerCase().split(':')[0]
}

function isPublicAssetPath(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true
  if (pathname.startsWith('/api')) return true
  if (pathname.startsWith('/images')) return true
  if (pathname.startsWith('/uploads')) return true
  if (pathname.startsWith('/videos')) return true
  if (pathname === '/favicon.ico') return true
  if (pathname === '/robots.txt') return true
  if (pathname === '/sitemap.xml') return true
  if (/\.[a-z0-9]+$/i.test(pathname)) return true
  return false
}

export function middleware(request: NextRequest) {
  const host = resolveHost(request)

  if (!UNIVERSITY_HOSTS.has(host)) {
    return NextResponse.next()
  }

  const { pathname, search } = request.nextUrl
  if (pathname.startsWith('/university') || isPublicAssetPath(pathname)) {
    return NextResponse.next()
  }

  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = '/university'
  rewriteUrl.search = search
  return NextResponse.rewrite(rewriteUrl)
}

export const config = {
  matcher: '/:path*',
}
