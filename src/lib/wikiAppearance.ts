/** 휴대폰으로 볼 화면 폭 — 이보다 좁으면 '자동' 색은 다크 */
export const MOBILE_THEME_QUERY = '(max-width: 767px)'

/**
 * 위키 색 설정값(자동/라이트/다크)을 실제 화면 색으로 바꾼다.
 * 직접 고른 라이트·다크는 그대로, '자동'(또는 저장값 없음)은 휴대폰 다크 · PC 라이트.
 */
export function resolveWikiColor(choice: unknown, isMobile: boolean): 'light' | 'dark' {
  if (choice === 'dark' || choice === 'light') return choice
  return isMobile ? 'dark' : 'light'
}
