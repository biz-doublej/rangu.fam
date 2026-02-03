import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import { WikiWorkshopStatement } from '@/models/WikiWorkshopStatement'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

type JwtPayload = {
  userId?: string
}

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('wiki-token')?.value
  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    if (!decoded?.userId) return null
    const user = await WikiUser.findById(decoded.userId)
    return user
  } catch {
    return null
  }
}

function toSafeStatement(doc: any) {
  return {
    id: String(doc._id),
    issueNumber: doc.issueNumber,
    issueLabel: `${doc.issueNumber}호`,
    speaker: doc.speaker,
    message: doc.message,
    listAuthor: doc.listAuthor,
    listAuthorDisplayName: doc.listAuthorDisplayName || doc.listAuthor,
    listAuthorDiscordId: doc.listAuthorDiscordId || null,
    createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString?.() || new Date().toISOString()
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const limitRaw = Number(searchParams.get('limit') || 200)
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 200

    const docs = await WikiWorkshopStatement.find({})
      .sort({ issueNumber: -1, createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({
      success: true,
      data: {
        statements: docs.map(toSafeStatement)
      }
    })
  } catch (error) {
    console.error('워크숍 발언 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '발언 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '작성하려면 위키 로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const speaker = String(body?.speaker || '').trim()
    const message = String(body?.message || '').trim()

    if (!speaker || !message) {
      return NextResponse.json(
        { success: false, error: '발언자와 발언 메시지를 모두 입력해주세요.' },
        { status: 400 }
      )
    }

    if (speaker.length > 40) {
      return NextResponse.json(
        { success: false, error: '발언자 이름은 40자 이하여야 합니다.' },
        { status: 400 }
      )
    }

    if (message.length > 1200) {
      return NextResponse.json(
        { success: false, error: '발언 메시지는 1200자 이하여야 합니다.' },
        { status: 400 }
      )
    }

    const listAuthor = user.discordUsername || user.username || user.displayName || 'unknown'
    const listAuthorDisplayName = user.displayName || user.discordUsername || user.username || 'unknown'
    const listAuthorDiscordId = user.discordId || null

    let created: any = null
    let retryCount = 0
    let lastError: unknown = null

    while (!created && retryCount < 4) {
      const latest = (await WikiWorkshopStatement.findOne({})
        .sort({ issueNumber: -1 })
        .select('issueNumber')
        .lean()) as any
      const nextIssueNumber = (latest?.issueNumber || 0) + 1

      try {
        created = await WikiWorkshopStatement.create({
          issueNumber: nextIssueNumber,
          speaker,
          message,
          listAuthor,
          listAuthorDisplayName,
          listAuthorDiscordId
        })
      } catch (error: any) {
        lastError = error
        // issueNumber unique 충돌 시 다음 번호로 재시도
        if (error?.code === 11000) {
          retryCount += 1
          continue
        }
        throw error
      }
    }

    if (!created) {
      throw lastError || new Error('issueNumber를 배정하지 못했습니다.')
    }

    return NextResponse.json({
      success: true,
      data: {
        statement: toSafeStatement(created)
      }
    })
  } catch (error) {
    console.error('워크숍 발언 작성 오류:', error)
    return NextResponse.json(
      { success: false, error: '발언을 작성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
