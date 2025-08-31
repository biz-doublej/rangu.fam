import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { checkAdminAuth } from '@/lib/adminAuth'
import Notice, { INotice } from '@/models/Notice'
import { DiscordWebhookService } from '@/services/discordWebhookService'

// 디스코드 웹훅 전송 함수 (새로운 서비스 사용)
async function sendDiscordNotification(notice: any) {
  try {
    await DiscordWebhookService.sendNoticeCreate(
      notice.title,
      notice.content,
      notice.author,
      notice.category || '일반',
      notice.type || 'announcement',
      notice.isPinned || false
    )
    console.log('✅ 디스코드 웹훅 전송 성공!')
    console.log(`📢 공지사항 "${notice.title}" 알림 전송됨`)
  } catch (error) {
    console.error('디스코드 웹훅 전송 오류:', error)
  }
}

// GET /api/admin/notices - 공지사항 조회 (데이터베이스에서)
export async function GET(request: NextRequest) {
  try {
    const adminUser = checkAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    await dbConnect()

    // 고정 공지사항을 먼저, 그 다음 최신순으로 정렬
    const notices = await Notice.find({})
      .sort({ isPinned: -1, date: -1 })
      .lean()

    console.log(`📋 공지사항 ${notices.length}개 조회됨`)
    
    return NextResponse.json({ 
      success: true, 
      notices: notices.map((notice: any) => ({
        ...notice,
        _id: notice._id.toString()
      }))
    })
  } catch (error) {
    console.error('공지사항 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST /api/admin/notices - 새 공지사항 추가 (데이터베이스에)
export async function POST(request: NextRequest) {
  try {
    const adminUser = checkAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { title, content, type, category, author, isPinned } = await request.json()
    
    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용은 필수 필드입니다' }, { status: 400 })
    }

    await dbConnect()

    // 다음 ID 계산 (기존 공지사항 중 가장 큰 ID + 1)
    const lastNotice = await Notice.findOne().sort({ id: -1 }).lean() as any
    const nextId = lastNotice ? lastNotice.id + 1 : 1

    // 새 공지사항 생성
    const newNotice = new Notice({
      id: nextId,
      title,
      content,
      type: type || 'announcement',
      isPinned: isPinned || false,
      author: author || 'gabriel0727',
      date: new Date(),
      category: category || '일반'
    })

    const savedNotice = await newNotice.save()

    // 디스코드 웹훅 전송
    console.log(`📝 새 공지사항 DB 저장 완료: "${savedNotice.title}" (ID: ${savedNotice.id})`)
    console.log('🔔 디스코드 웹훅 전송 시도 중...')
    await sendDiscordNotification(savedNotice)

    return NextResponse.json({ 
      success: true, 
      message: '공지사항이 성공적으로 추가되었습니다',
      notice: {
        ...savedNotice.toObject(),
        _id: savedNotice._id.toString()
      }
    })
  } catch (error) {
    console.error('공지사항 추가 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PUT /api/admin/notices - 공지사항 수정 (데이터베이스에서)
export async function PUT(request: NextRequest) {
  try {
    const adminUser = checkAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { id, title, content, type, category, author, isPinned } = await request.json()
    
    if (!id || !title || !content || !category || !author) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다' }, { status: 400 })
    }

    await dbConnect()

    // 공지사항 찾기 및 수정
    const updatedNotice = await Notice.findOneAndUpdate(
      { id: id },
      {
        title,
        content,
        type: type || 'announcement',
        category,
        author,
        isPinned: isPinned !== undefined ? isPinned : false
      },
      { 
        new: true, // 수정된 문서 반환
        runValidators: true // 스키마 검증 실행
      }
    )

    if (!updatedNotice) {
      return NextResponse.json({ error: '공지사항을 찾을 수 없습니다' }, { status: 404 })
    }

    console.log(`✏️ 공지사항 수정 완료: "${updatedNotice.title}" (ID: ${updatedNotice.id})`)

    return NextResponse.json({ 
      success: true, 
      message: '공지사항이 성공적으로 수정되었습니다',
      notice: {
        ...updatedNotice.toObject(),
        _id: updatedNotice._id.toString()
      }
    })
  } catch (error) {
    console.error('공지사항 수정 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE /api/admin/notices - 공지사항 삭제 (데이터베이스에서)
export async function DELETE(request: NextRequest) {
  try {
    const adminUser = checkAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '0')
    
    if (!id) {
      return NextResponse.json({ error: '공지사항 ID가 필요합니다' }, { status: 400 })
    }

    await dbConnect()

    // 공지사항 찾기 및 삭제
    const deletedNotice = await Notice.findOneAndDelete({ id: id })

    if (!deletedNotice) {
      return NextResponse.json({ error: '공지사항을 찾을 수 없습니다' }, { status: 404 })
    }

    console.log(`🗑️ 공지사항 삭제 완료: "${deletedNotice.title}" (ID: ${deletedNotice.id})`)

    return NextResponse.json({ 
      success: true, 
      message: '공지사항이 성공적으로 삭제되었습니다'
    })
  } catch (error) {
    console.error('공지사항 삭제 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
