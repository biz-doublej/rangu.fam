/**
 * `Content-Disposition: inline` 헤더 값. 헤더에는 ASCII만 들어갈 수 있어
 * 한글 파일명을 그대로 넣으면 응답 생성이 실패한다(RFC 6266 / RFC 5987).
 */
export function inlineContentDisposition(name: string | null | undefined): string {
  const filename = name?.trim() || 'file'
  const asciiFallback = filename.replace(/[^\x20-\x7e]|["\\]/g, '_')
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}
