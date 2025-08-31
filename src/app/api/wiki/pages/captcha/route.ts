import { NextRequest, NextResponse } from 'next/server'
import { verifyCaptchaChallenge, issueCaptchaPassCookie } from '@/app/api/wiki/_utils/captcha'


export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    const { token, answer } = await request.json()
    if (!token || (answer === undefined || answer === null)) {
      return NextResponse.json({ success: false, error: 'CAPTCHA 응답이 누락되었습니다.' }, { status: 400 })
    }

    const ok = verifyCaptchaChallenge(token, answer)
    if (!ok) {
      return NextResponse.json({ success: false, error: 'CAPTCHA 검증 실패' }, { status: 400 })
    }

    const res = NextResponse.json({ success: true, message: 'CAPTCHA 통과' })
    issueCaptchaPassCookie(res)
    return res
  } catch (e) {
    console.error('CAPTCHA 검증 오류:', e)
    return NextResponse.json({ success: false, error: 'CAPTCHA 처리 중 오류' }, { status: 500 })
  }
}


