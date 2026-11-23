/**
 * 문단 제목 → 앵커 id.
 * 렌더러(제목 id), 문서 안 목차, 오른쪽 목차, 서버 목차가 모두 이 함수 하나를 쓴다.
 * (예전에는 서버만 `/` 를 `-` 로 바꿔서 'A/B' 같은 제목은 목차를 눌러도 이동하지 않았다.)
 *
 * - 한글뿐 아니라 모든 언어의 글자·숫자를 남긴다 (`歴史`, `ㅋㅋ` 가 빈 문자열이 되지 않게)
 * - 기존 링크가 깨지지 않도록 영문·한글 제목의 결과는 예전과 같다 (기호 제거, 공백 → `-`)
 *
 * 문서(페이지) 주소용 slug 와는 다르다 — 그건 api/wiki/pages 의 toSlug 를 그대로 쓴다.
 */
export function headingSlug(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * 문서 하나 안에서 같은 제목이 또 나오면 `-2`, `-3` 을 붙여 id 가 겹치지 않게 한다.
 * 문서 순서대로 불러야 하므로 목차를 만들 때마다 새로 만든다.
 */
export function createHeadingSlugger() {
  const seen = new Map<string, number>()
  return (text: string): string => {
    const base = headingSlug(text) || 'section'
    const count = (seen.get(base) || 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base}-${count}`
  }
}
