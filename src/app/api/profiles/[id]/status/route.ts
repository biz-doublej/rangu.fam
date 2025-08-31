import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

// 사용자 상태 타입
export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline'

// 메모리에 저장되는 사용자 상태 (기본값: 오프라인)
let userStatuses: { [userId: string]: { status: UserStatus, customMessage?: string, lastUpdated: Date } } = {
  jaewon: { status: 'offline', customMessage: '오프라인', lastUpdated: new Date() },
  minseok: { status: 'offline', customMessage: '오프라인', lastUpdated: new Date() },
  jingyu: { status: 'offline', customMessage: '오프라인', lastUpdated: new Date() },
  hanul: { status: 'offline', customMessage: '오프라인', lastUpdated: new Date() },
  seungchan: { status: 'offline', customMessage: '오프라인', lastUpdated: new Date() },
  heeyeol: { status: 'offline', customMessage: '오프라인', lastUpdated: new Date() }
}

// GET - 현재 상태 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const userStatus = userStatuses[id]

    if (!userStatus) {
      return NextResponse.json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      status: userStatus.status,
      customMessage: userStatus.customMessage,
      lastUpdated: userStatus.lastUpdated
    })
  } catch (error) {
    console.error('상태 조회 오류:', error)
    return NextResponse.json({
      success: false,
      error: '상태 조회 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// PUT - 상태 변경
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { status, customMessage } = await request.json()

    // 유효한 상태인지 확인
    const validStatuses: UserStatus[] = ['online', 'idle', 'dnd', 'offline']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 상태입니다.'
      }, { status: 400 })
    }

    // 상태 업데이트
    userStatuses[id] = {
      status,
      customMessage: customMessage || getDefaultMessage(status),
      lastUpdated: new Date()
    }

    console.log(`${id} 상태 변경:`, userStatuses[id])

    return NextResponse.json({
      success: true,
      status: userStatuses[id].status,
      customMessage: userStatuses[id].customMessage,
      lastUpdated: userStatuses[id].lastUpdated
    })
  } catch (error) {
    console.error('상태 변경 오류:', error)
    return NextResponse.json({
      success: false,
      error: '상태 변경 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// 상태별 기본 메시지
function getDefaultMessage(status: UserStatus): string {
  switch (status) {
    case 'online':
      return '온라인'
    case 'idle':
      return '자리 비움'
    case 'dnd':
      return '방해금지'
    case 'offline':
      return '오프라인'
    default:
      return '온라인'
  }
}

// 내부 유틸리티 함수들 (export 제거)
function getUserStatus(userId: string) {
  return userStatuses[userId]
}

function getAllUserStatuses() {
  return userStatuses
}