import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiUser, WikiPage } from '@/models/Wiki'
import jwt from 'jsonwebtoken'
export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'
const reports: any[] = [] // 데모용 메모리 저장

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('wiki-token')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const user = await WikiUser.findById(decoded.userId)
    return user
  } catch {
    return null
  }
}

// 신고 생성: { title, reason, targetUserId? }
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    const { title, reason, targetUserId } = await request.json()
    if (!title || !reason) return NextResponse.json({ success: false, error: '필수 항목 누락' }, { status: 400 })
    const page = await WikiPage.findOne({ $or: [{ title }, { slug: title }], isDeleted: { $ne: true } })
    if (!page) return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    const item = { id: reports.length + 1, title, reason, targetUserId: targetUserId || null, reporter: user.username, status: 'open', createdAt: new Date() }
    reports.push(item)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('신고 생성 오류:', e)
    return NextResponse.json({ success: false, error: '신고 처리 중 오류' }, { status: 500 })
  }
}

// 신고 목록
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    return NextResponse.json({ success: true, reports })
  } catch (e) {
    console.error('신고 목록 오류:', e)
    return NextResponse.json({ success: false, error: '신고 목록 조회 중 오류' }, { status: 500 })
  }
}


