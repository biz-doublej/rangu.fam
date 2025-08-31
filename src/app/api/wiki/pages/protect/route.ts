import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiPage, WikiUser } from '@/models/Wiki'
import jwt from 'jsonwebtoken'
import { canProtectPage } from '@/app/api/wiki/_utils/policy'
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

// POST: 보호 설정 변경
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getUserFromToken(request)
    if (!user || !canProtectPage(user)) {
      return NextResponse.json(
        { success: false, error: '문서 보호 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { title, level, reason, protectedUntil, allowedRoles } = await request.json()
    if (!title || !level) {
      return NextResponse.json(
        { success: false, error: 'title과 level은 필수입니다.' },
        { status: 400 }
      )
    }

    const page = await WikiPage.findOne({
      $or: [ { title }, { slug: title } ],
      isDeleted: { $ne: true }
    })

    if (!page) {
      return NextResponse.json(
        { success: false, error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    page.protection = {
      level,
      reason: reason || page.protection?.reason,
      protectedBy: user.username,
      protectedUntil: protectedUntil ? new Date(protectedUntil) : page.protection?.protectedUntil,
      allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : page.protection?.allowedRoles
    } as any

    await page.save()

    return NextResponse.json({ success: true, message: '문서 보호 설정이 업데이트되었습니다.' })
  } catch (error) {
    console.error('문서 보호 설정 오류:', error)
    return NextResponse.json(
      { success: false, error: '문서 보호 설정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


