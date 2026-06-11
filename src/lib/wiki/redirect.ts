/**
 * 나무위키식 넘겨주기(redirect) 문법 파서.
 *
 * 문서 본문의 첫 번째 비어있지 않은 줄이 아래 형태면 넘겨주기 문서로 취급한다:
 *   #redirect 강한울
 *   # redirect 강한울
 *   #REDIRECT [[강한울]]
 *   #넘겨주기 강한울
 *
 * 서버(저장 시 isRedirect/redirectTarget 세팅)와 클라이언트(뷰어 자동 이동)가
 * 같은 규칙을 쓰도록 공용 모듈로 분리.
 */
export function parseRedirectTarget(content: string | null | undefined): string | null {
  if (!content) return null

  // 첫 몇 줄만 검사 (본문이 길어도 비용 고정)
  const lines = content.split('\n', 5)
  const firstLine = lines.map((l) => l.trim()).find((l) => l.length > 0)
  if (!firstLine) return null

  const m = firstLine.match(/^#\s*(?:redirect|넘겨주기)\s+(.+)$/i)
  if (!m) return null

  let target = m[1].trim()

  // `[[대상]]` / `[[대상|표시]]` 형태 허용
  const bracket = target.match(/^\[\[([^\]]+)\]\]/)
  if (bracket) target = bracket[1]
  target = target.split('|')[0].trim()

  return target || null
}
