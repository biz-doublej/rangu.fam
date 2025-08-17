import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

export interface CaptchaChallengePayload {
  a: number
  b: number
  exp: number // unix seconds
  type: 'sum'
}

export function createCaptchaChallenge() {
  const a = Math.floor(10 + Math.random() * 90)
  const b = Math.floor(10 + Math.random() * 90)
  const payload: CaptchaChallengePayload = {
    a,
    b,
    type: 'sum',
    exp: Math.floor(Date.now() / 1000) + 5 * 60 // 5분
  }
  const token = jwt.sign(payload, JWT_SECRET)
  const question = `${a} + ${b} = ?`
  return { token, question }
}

export function verifyCaptchaChallenge(token: string, answer: string | number): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as CaptchaChallengePayload
    if (decoded.type !== 'sum') return false
    const correct = decoded.a + decoded.b
    const provided = Number(answer)
    return Number.isFinite(provided) && provided === correct
  } catch {
    return false
  }
}

export function issueCaptchaPassCookie(response: NextResponse) {
  const payload = { pass: true, ts: Date.now() }
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '10m' })
  response.cookies.set('wiki-captcha-pass', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 10 * 60
  })
}

export function hasValidCaptchaPass(request: NextRequest): boolean {
  const token = request.cookies.get('wiki-captcha-pass')?.value
  if (!token) return false
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded?.pass === true
  } catch {
    return false
  }
}


