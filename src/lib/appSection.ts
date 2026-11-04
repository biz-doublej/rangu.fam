export type Section = 'rangu' | 'archive' | 'wiki' | 'admin' | 'member'

const WIKI_HOSTNAMES = new Set(['irang.wiki', 'www.irang.wiki'])

/**
 * 화면 구역을 판정한다. irang.wiki 는 미들웨어가 /wiki 로 rewrite 해서
 * 브라우저의 경로에 /wiki 가 없으므로 호스트를 함께 본다.
 */
export function detectSection(
  pathname: string | null,
  hostname: string | undefined,
  archiveMode: boolean
): Section {
  const isSettings = pathname === '/settings' || Boolean(pathname?.startsWith('/settings/'))
  if (hostname && WIKI_HOSTNAMES.has(hostname) && !isSettings) return 'wiki'
  if (!pathname) return 'rangu'
  if (pathname.startsWith('/wiki')) return 'wiki'
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/m/')) return 'member'
  // 아카이브 모드의 랑구팸 메인은 스크랩북 테마 없이 기본 디자인으로
  if (archiveMode && pathname === '/') return 'archive'
  return 'rangu'
}
