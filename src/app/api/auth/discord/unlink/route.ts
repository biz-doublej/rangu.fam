import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import { enforceUserAccessPolicy, getAuthenticatedWikiUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedWikiUser(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    await dbConnect()

    const user = await WikiUser.findById(authUser._id)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    user.discordId = undefined
    user.discordUsername = undefined
    user.discordAvatar = undefined
    await user.save()
    await enforceUserAccessPolicy(user)

    return NextResponse.json({
      success: true,
      message: '디스코드 연결이 해제되었습니다.',
    })
  } catch (error) {
    console.error('Discord 연결 해제 오류:', error)
    return NextResponse.json(
      { success: false, error: '디스코드 연결 해제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
