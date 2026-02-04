import { NextRequest, NextResponse } from 'next/server'
import { CardService } from '@/services/cardService'
import connectDB from '@/lib/mongodb'
import {
  buildClientUser,
  getAuthenticatedWikiUser,
  resolveMemberIdForUser
} from '@/lib/doublejAuth'
export const dynamic = 'force-dynamic'

const DROP_ALLOWED_MEMBER_IDS = new Set(['hanul', 'jaewon', 'jinkyu', 'seungchan', 'minseok'])

const authorizeDropUser = async (request: NextRequest, requestedUserId?: string) => {
  const wikiUser = await getAuthenticatedWikiUser(request)
  if (!wikiUser) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: '카드 드랍은 로그인 후 이용할 수 있습니다.' },
        { status: 401 }
      )
    }
  }

  const memberId = resolveMemberIdForUser(wikiUser)
  if (!memberId || !DROP_ALLOWED_MEMBER_IDS.has(memberId)) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: '카드 드랍은 랑구팸 5인 멤버 전용 기능입니다.' },
        { status: 403 }
      )
    }
  }

  const clientUser = buildClientUser(wikiUser)
  if (requestedUserId && requestedUserId !== clientUser.id) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: '본인 계정으로만 카드 드랍을 사용할 수 있습니다.' },
        { status: 403 }
      )
    }
  }

  return { userId: clientUser.id }
}

// POST: 일일 카드 드랍
export async function POST(request: NextRequest) {
  let userId: string | undefined
  
  try {
    await connectDB()
    
    const body = await request.json().catch(() => ({}))
    const requestedUserId = typeof body?.userId === 'string' ? body.userId : undefined
    const auth = await authorizeDropUser(request, requestedUserId)
    if ('errorResponse' in auth) {
      return auth.errorResponse
    }
    userId = auth.userId
    
    // 카드 드랍 실행
    const result = await CardService.dailyCardDrop(userId)
    
    if (result.success) {
      return NextResponse.json({
        ...result,
        message: `카드를 획득했습니다! 남은 드랍 ${result.remainingDrops}회`
      })
    }

    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Card drop error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userId: userId || 'unknown'
    })
    return NextResponse.json(
      { 
        success: false, 
        message: '카드 드랍 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET: 남은 드랍 횟수 조회
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('userId') || undefined
    const auth = await authorizeDropUser(request, requestedUserId)
    if ('errorResponse' in auth) {
      return auth.errorResponse
    }
    
    const remainingDrops = await CardService.getRemainingDrops(auth.userId)
    
    return NextResponse.json({
      success: true,
      remainingDrops
    })
    
  } catch (error) {
    console.error('Remaining drops check error:', error)
    return NextResponse.json(
      { success: false, message: '드랍 횟수 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
