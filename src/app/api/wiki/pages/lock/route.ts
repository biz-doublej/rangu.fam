import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiPage, WikiUser } from '@/models/Wiki'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'
const LOCK_DURATION = 10 * 60 * 1000 // 10분 (밀리초)

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

// GET - 문서 잠금 상태 확인
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    
    if (!title) {
      return NextResponse.json({ success: false, error: 'title이 필요합니다.' }, { status: 400 })
    }

    const page = await WikiPage.findOne({
      $or: [{ title }, { slug: title }],
      isDeleted: { $ne: true }
    })

    if (!page) {
      return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 만료된 잠금 확인 및 자동 해제
    if (page.editLock?.isLocked && page.editLock?.lockExpiry && new Date() > page.editLock.lockExpiry) {
      page.editLock.isLocked = false
      page.editLock.lockedBy = undefined
      page.editLock.lockedById = undefined
      page.editLock.lockStartTime = undefined
      page.editLock.lockExpiry = undefined
      await page.save()
    }

    return NextResponse.json({
      success: true,
      isLocked: page.editLock?.isLocked || false,
      lockedBy: page.editLock?.lockedBy,
      lockStartTime: page.editLock?.lockStartTime,
      lockExpiry: page.editLock?.lockExpiry
    })
  } catch (error) {
    console.error('잠금 상태 확인 오류:', error)
    return NextResponse.json({ success: false, error: '잠금 상태 확인 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST - 문서 편집 잠금 획득
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getUserFromToken(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { title } = await request.json()
    
    if (!title) {
      return NextResponse.json({ success: false, error: 'title이 필요합니다.' }, { status: 400 })
    }

    const page = await WikiPage.findOne({
      $or: [{ title }, { slug: title }],
      isDeleted: { $ne: true }
    })

    if (!page) {
      return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    }

    const now = new Date()
    
    // 만료된 잠금 확인 및 자동 해제
    if (page.editLock?.isLocked && page.editLock?.lockExpiry && now > page.editLock.lockExpiry) {
      page.editLock.isLocked = false
      page.editLock.lockedBy = undefined
      page.editLock.lockedById = undefined
      page.editLock.lockStartTime = undefined
      page.editLock.lockExpiry = undefined
    }

    // 다른 사용자가 이미 잠금을 획득한 경우
    if (page.editLock?.isLocked && page.editLock?.lockedById?.toString() !== user._id.toString()) {
      return NextResponse.json({
        success: false,
        error: '다른 사용자가 편집 중입니다.',
        lockedBy: page.editLock.lockedBy,
        lockExpiry: page.editLock.lockExpiry
      }, { status: 409 })
    }

    // 잠금 획득 또는 갱신
    const lockExpiry = new Date(now.getTime() + LOCK_DURATION)
    
    if (!page.editLock) {
      page.editLock = {}
    }
    
    page.editLock.isLocked = true
    page.editLock.lockedBy = user.username
    page.editLock.lockedById = user._id
    page.editLock.lockStartTime = page.editLock.lockStartTime || now
    page.editLock.lockExpiry = lockExpiry
    page.editLock.lockReason = 'editing'

    await page.save()

    return NextResponse.json({
      success: true,
      message: '편집 잠금을 획득했습니다.',
      lockExpiry
    })
  } catch (error) {
    console.error('편집 잠금 획득 오류:', error)
    return NextResponse.json({ success: false, error: '편집 잠금 획득 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

// PUT - 문서 편집 잠금 갱신 (사용자가 활발히 편집 중일 때)
export async function PUT(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getUserFromToken(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { title } = await request.json()
    
    if (!title) {
      return NextResponse.json({ success: false, error: 'title이 필요합니다.' }, { status: 400 })
    }

    const page = await WikiPage.findOne({
      $or: [{ title }, { slug: title }],
      isDeleted: { $ne: true }
    })

    if (!page) {
      return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 현재 사용자가 잠금을 소유하고 있는지 확인
    if (!page.editLock?.isLocked || page.editLock?.lockedById?.toString() !== user._id.toString()) {
      return NextResponse.json({ success: false, error: '편집 잠금을 소유하고 있지 않습니다.' }, { status: 403 })
    }

    // 잠금 시간 연장
    const now = new Date()
    const lockExpiry = new Date(now.getTime() + LOCK_DURATION)
    
    page.editLock.lockExpiry = lockExpiry
    await page.save()

    return NextResponse.json({
      success: true,
      message: '편집 잠금이 갱신되었습니다.',
      lockExpiry
    })
  } catch (error) {
    console.error('편집 잠금 갱신 오류:', error)
    return NextResponse.json({ success: false, error: '편집 잠금 갱신 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

// DELETE - 문서 편집 잠금 해제
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getUserFromToken(request)
    
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    
    if (!title) {
      return NextResponse.json({ success: false, error: 'title이 필요합니다.' }, { status: 400 })
    }

    const page = await WikiPage.findOne({
      $or: [{ title }, { slug: title }],
      isDeleted: { $ne: true }
    })

    if (!page) {
      return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 현재 사용자가 잠금을 소유하고 있거나 관리자인지 확인
    const canRelease = page.editLock?.lockedById?.toString() === user._id.toString() || 
                      user.role === 'admin' || user.role === 'moderator'
    
    if (!canRelease) {
      return NextResponse.json({ success: false, error: '편집 잠금을 해제할 권한이 없습니다.' }, { status: 403 })
    }

    // 잠금 해제
    if (page.editLock) {
      page.editLock.isLocked = false
      page.editLock.lockedBy = undefined
      page.editLock.lockedById = undefined
      page.editLock.lockStartTime = undefined
      page.editLock.lockExpiry = undefined
      page.editLock.lockReason = undefined
    }

    await page.save()

    return NextResponse.json({
      success: true,
      message: '편집 잠금이 해제되었습니다.'
    })
  } catch (error) {
    console.error('편집 잠금 해제 오류:', error)
    return NextResponse.json({ success: false, error: '편집 잠금 해제 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
