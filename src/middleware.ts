import { NextRequest, NextResponse } from 'next/server'

const UNIVERSITY_HOSTS = new Set(['university.rangu.com', 'www.university.rangu.com'])
const WIKI_HOSTS = new Set(['irang.wiki', 'www.irang.wiki'])

/**
 * 멤버 서브도메인 → 내부 경로 매핑.
 * `seungchan.rangu-fam.com` → `/m/seungchan`. www 변형도 같이.
 */
const MEMBER_HOSTS: Record<string, string> = {
  'seungchan.rangu-fam.com': '/m/seungchan',
  'www.seungchan.rangu-fam.com': '/m/seungchan',
  'minseok.rangu-fam.com': '/m/minseok',
  'www.minseok.rangu-fam.com': '/m/minseok',
  'hanul.rangu-fam.com': '/m/hanul',
  'www.hanul.rangu-fam.com': '/m/hanul',
  'jingyu.rangu-fam.com': '/m/jingyu',
  'www.jingyu.rangu-fam.com': '/m/jingyu',
  'jaewon.rangu-fam.com': '/m/jaewon',
  'www.jaewon.rangu-fam.com': '/m/jaewon',
}

function resolveHost(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host') || ''
  return host.toLowerCase().split(':')[0]
}

function isPublicAssetPath(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true
  if (pathname.startsWith('/api')) return true
  if (pathname.startsWith('/auth')) return true
  if (pathname.startsWith('/images')) return true
  if (pathname.startsWith('/uploads')) return true
  if (pathname.startsWith('/videos')) return true
  if (pathname === '/favicon.ico') return true
  if (pathname === '/robots.txt') return true
  if (pathname === '/sitemap.xml') return true
  if (/\.[a-z0-9]+$/i.test(pathname)) return true
  return false
}

/**
 * 메인 도메인(rangu-fam.com)에 정의된 페이지 라우트.
 * 위키/대학교/멤버 호스트로 잘못 들어왔을 때 메인 도메인으로 redirect 시키기 위함.
 *
 * (`/wiki`, `/m/`, `/university` 는 각 호스트가 자체 처리하므로 제외.)
 */
const MAIN_DOMAIN_PREFIXES = [
  '/settings',
  '/login',
  '/cards',
  '/members',
  '/about',
  '/admin',
  '/privacy',
  '/terms',
  '/university',
]

function isMainDomainPath(pathname: string): boolean {
  return MAIN_DOMAIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function middleware(request: NextRequest) {
  const host = resolveHost(request)
  const { pathname, search } = request.nextUrl

  // university.rangu.com → /university (기존)
  if (UNIVERSITY_HOSTS.has(host)) {
    if (pathname.startsWith('/university') || isPublicAssetPath(pathname)) {
      return NextResponse.next()
    }
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = '/university'
    rewriteUrl.search = search
    return NextResponse.rewrite(rewriteUrl)
  }

  // irang.wiki → /wiki/* (host 라우팅)
  if (WIKI_HOSTS.has(host)) {
    // 메인 도메인 전용 페이지(/settings, /login 등) 잘못 진입 → rangu-fam.com 으로 redirect
    if (isMainDomainPath(pathname)) {
      const redirectUrl = new URL(`https://rangu-fam.com${pathname}${search}`)
      return NextResponse.redirect(redirectUrl, 308)
    }
    if (pathname.startsWith('/wiki') || isPublicAssetPath(pathname)) {
      return NextResponse.next()
    }
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = pathname === '/' ? '/wiki' : `/wiki${pathname}`
    rewriteUrl.search = search
    return NextResponse.rewrite(rewriteUrl)
  }

  // {member}.rangu-fam.com → /m/{member}/*
  const memberPath = MEMBER_HOSTS[host]
  if (memberPath) {
    // 메인 도메인 전용 페이지 잘못 진입 → rangu-fam.com 으로 redirect
    if (isMainDomainPath(pathname)) {
      const redirectUrl = new URL(`https://rangu-fam.com${pathname}${search}`)
      return NextResponse.redirect(redirectUrl, 308)
    }
    if (pathname.startsWith('/m/') || isPublicAssetPath(pathname)) {
      return NextResponse.next()
    }
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = pathname === '/' ? memberPath : `${memberPath}${pathname}`
    rewriteUrl.search = search
    return NextResponse.rewrite(rewriteUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
