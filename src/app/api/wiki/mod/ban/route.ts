import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import jwt from 'jsonwebtoken'
import { isModeratorOrAbove } from '@/app/api/wiki/_utils/policy'
import { banIp, unbanIp, listBannedIps } from '@/app/api/wiki/_utils/blocklist'
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

// 사용자 차단/해제, IP 차단/해제 관리
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const admin = await getUserFromToken(request)
    if (!admin || !isModeratorOrAbove(admin as any)) return NextResponse.json({ success: false, error: '권한 부족' }, { status: 403 })

    const { action, userId, ip, reason } = await request.json()
    switch (action) {
      case 'banUser': {
        if (!userId) return NextResponse.json({ success: false, error: 'userId 필요' }, { status: 400 })
        const u = await WikiUser.findById(userId)
        if (!u) return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
        u.isBanned = true
        u.banReason = reason || ''
        await u.save()
        return NextResponse.json({ success: true })
      }
      case 'unbanUser': {
        if (!userId) return NextResponse.json({ success: false, error: 'userId 필요' }, { status: 400 })
        const u = await WikiUser.findById(userId)
        if (!u) return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
        u.isBanned = false
        u.banReason = ''
        await u.save()
        return NextResponse.json({ success: true })
      }
      case 'banIp': {
        if (!ip) return NextResponse.json({ success: false, error: 'ip 필요' }, { status: 400 })
        banIp(ip)
        return NextResponse.json({ success: true })
      }
      case 'unbanIp': {
        if (!ip) return NextResponse.json({ success: false, error: 'ip 필요' }, { status: 400 })
        unbanIp(ip)
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ success: false, error: '지원하지 않는 action' }, { status: 400 })
    }
  } catch (e) {
    console.error('차단 관리 오류:', e)
    return NextResponse.json({ success: false, error: '차단 처리 중 오류' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const admin = await getUserFromToken(request)
    if (!admin || !isModeratorOrAbove(admin as any)) return NextResponse.json({ success: false, error: '권한 부족' }, { status: 403 })
    // 메모리 기반 IP 차단 목록 반환 (데모용)
    return NextResponse.json({ success: true, bannedIps: listBannedIps() })
  } catch (e) {
    console.error('차단 목록 조회 오류:', e)
    return NextResponse.json({ success: false, error: '목록 조회 중 오류' }, { status: 500 })
  }
}


