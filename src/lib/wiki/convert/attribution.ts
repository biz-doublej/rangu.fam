/**
 * 나무위키에서 가져온 글의 출처 표시 — 나무위키 글은 CC BY-NC-SA 2.0 KR (출처 표시, 비영리, 동일조건 공유).
 * 라이선스 조건 안내일 뿐 법률 자문은 아니다.
 */

export const NAMU_LICENSE_URL = 'https://creativecommons.org/licenses/by-nc-sa/2.0/kr/'

/** 출처 주소에서 나무위키 문서 이름을 꺼낸다 (https://namu.wiki/w/강한울 → 강한울) */
export function namuTitleFromUrl(url: string): string | null {
  const match = (url || '').trim().match(/^https?:\/\/(?:www\.)?namu\.wiki\/w\/([^?#]+)/i)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

/** 출처로 받을 수 있는 주소인가 — http(s) 이고 이랑위키 링크를 깨는 글자(괄호·공백)가 없을 것 */
export function isUsableSourceUrl(url: string): boolean {
  return /^https?:\/\/[^\s()<>"]+$/i.test((url || '').trim())
}

/** 문서 끝에 붙는 출처 안내 상자 */
export function attributionNote(sourceUrl: string, fallbackTitle: string): string {
  const url = sourceUrl.trim()
  const original = (namuTitleFromUrl(url) || fallbackTitle).replace(/[[\]]/g, '')
  return `\n\n:::note\n이 문서의 일부는 [나무위키 「${original}」](${url})에서 가져와 고쳤습니다. 원문 라이선스: [CC BY-NC-SA 2.0 KR](${NAMU_LICENSE_URL})\n:::\n`
}
