/** 환경 변수. 비밀값이 없으면 서버를 띄우지 않는다. */
export interface RtConfig {
  port: number
  /** 브라우저 접속 토큰 검증용 (rangu-fam 의 RT_JWT_SECRET 과 같은 값) */
  jwtSecret: string
  /** 판 결과 서명용 (rangu-fam 의 GC_INTERNAL_SECRET 과 같은 값) */
  internalSecret: string
  /** 결과를 보낼 본 서버 주소 (예: https://irang.wiki) */
  ranguFamUrl: string
  /** 접속을 허용할 웹 주소 */
  allowedOrigins: string[]
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`환경 변수 ${name} 가 필요합니다.`)
  return value
}

export function loadConfig(): RtConfig {
  return {
    port: Number(process.env.PORT || 8080),
    jwtSecret: required('RT_JWT_SECRET'),
    internalSecret: required('GC_INTERNAL_SECRET'),
    ranguFamUrl: required('RANGU_FAM_URL').replace(/\/+$/, ''),
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'https://irang.wiki,https://www.irang.wiki')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  }
}
