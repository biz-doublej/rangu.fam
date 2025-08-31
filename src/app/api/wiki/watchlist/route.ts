import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiUser, WikiPage } from '@/models/Wiki'
import jwt from 'jsonwebtoken'
export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

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

// 내 감시목록 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    const pages = await WikiPage.find({ watchers: { $in: [user._id] }, isDeleted: { $ne: true } }).select('title slug namespace lastEditDate lastEditor').lean()
    return NextResponse.json({ success: true, pages })
  } catch (e) {
    console.error('감시목록 조회 오류:', e)
    return NextResponse.json({ success: false, error: '조회 중 오류' }, { status: 500 })
  }
}

// 감시 추가/제거
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    const { title, action } = await request.json()
    const page = await WikiPage.findOne({ $or: [{ title }, { slug: title }], isDeleted: { $ne: true } })
    if (!page) return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    if (action === 'watch') {
      if (!page.watchers.find((w: any) => String(w) === String(user._id))) page.watchers.push(user._id)
      await page.save()
      return NextResponse.json({ success: true })
    }
    if (action === 'unwatch') {
      page.watchers = page.watchers.filter((w: any) => String(w) !== String(user._id))
      await page.save()
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ success: false, error: '지원하지 않는 action' }, { status: 400 })
  } catch (e) {
    console.error('감시목록 변경 오류:', e)
    return NextResponse.json({ success: false, error: '변경 중 오류' }, { status: 500 })
  }
}


