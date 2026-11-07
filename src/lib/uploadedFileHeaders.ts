import { inlineContentDisposition } from './contentDisposition'

/**
 * 회원이 올린 파일을 내려줄 때 쓰는 보안 헤더.
 * SVG 는 그림이지만 스크립트를 품을 수 있어서, 이미지 주소를 직접 열었을 때
 * 우리 사이트 권한으로 실행되지 않도록 막는다.
 * - sandbox: 스크립트·폼·같은 출처 권한을 모두 끈다
 * - default-src 'none': 외부 자원을 불러오지 못하게 한다 (SVG 안의 인라인 스타일과 data: 그림만 허용)
 * - nosniff: 브라우저가 형식을 멋대로 추측해 HTML 로 해석하지 않게 한다
 * <img> 로 보여 줄 때는 원래 스크립트가 돌지 않으므로 그림은 그대로 보인다.
 */
export const UPLOADED_FILE_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"

export function uploadedFileHeaders(mimeType: string, name: string | null | undefined, length: number): Record<string, string> {
  return {
    'Content-Type': mimeType,
    'Content-Length': String(length),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Disposition': inlineContentDisposition(name),
    'Content-Security-Policy': UPLOADED_FILE_CSP,
    'X-Content-Type-Options': 'nosniff',
  }
}
