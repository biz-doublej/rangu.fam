import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Notice from '@/models/Notice'

// GET /api/notices - 공개 공지사항 조회 (관리자 권한 불필요)
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    // 모든 공지사항을 고정 공지사항 먼저, 그 다음 최신순으로 정렬
    const notices = await Notice.find({})
      .sort({ isPinned: -1, date: -1 })
      .lean()

    console.log(`📋 공개 공지사항 ${notices.length}개 조회됨`)
    
    return NextResponse.json({ 
      success: true, 
      notices: notices.map((notice: any) => ({
        ...notice,
        _id: notice._id.toString()
      }))
    })
  } catch (error) {
    console.error('공개 공지사항 조회 오류:', error)
    
    // 데이터베이스 오류 시 기본 공지사항 반환
    const defaultNotices = [
      {
        id: 1,
        title: '랑구팸 v2.0 업데이트 완료 (25.08.26)',
        content: '새로운 기능들과 개선된 UI로 더욱 편리해진 랑구팸을 만나보세요. 카드 드랍 시스템과 게임 기능이 추가되었고, 알림 시스템 중복 방지 기능이 개선되었습니다.',
        type: 'update',
        isPinned: true,
        author: 'DoubleJ Tech Team',
        date: new Date('2025-08-26'),
        category: '시스템 업데이트'
      },
      {
        id: 2,
        title: '이용약관 및 개인정보처리방침 업데이트',
        content: '사용자 보호를 위한 정책이 업데이트되었습니다. 변경된 내용을 확인해주세요.',
        type: 'policy',
        isPinned: true,
        author: 'Legal Team',
        date: new Date('2025-01-10'),
        category: '정책 변경'
      },
      {
        id: 3,
        title: '디스코드 알림 시스템 도입',
        content: '이제 중요한 공지사항을 디스코드로도 받아보실 수 있습니다! 더 빠르고 편리한 소식 전달을 위해 최선을 다하겠습니다.',
        type: 'announcement',
        isPinned: false,
        author: 'Dev Team',
        date: new Date('2025-01-15'),
        category: '새 기능'
      },
      {
        id: 4,
        title: '디스코드 웹훅 시스템 v2.0 업데이트',
        content: '더 아름답고 기능적인 디스코드 알림 시스템이 완성되었습니다. 다양한 이모지와 컬러, 썸네일 이미지가 추가되어 더욱 세련된 알림을 받아보실 수 있습니다!',
        type: 'update',
        isPinned: false,
        author: 'gabriel0727',
        date: new Date('2025-01-23'),
        category: '시스템 개선'
      },
      {
        id: 5,
        title: '사용자 관리 시스템 도입',
        content: '운영자들이 사용자를 더 효율적으로 관리할 수 있도록 새로운 관리 도구가 추가되었습니다. 경고, 차단, 권한 관리 등의 기능을 제공합니다.',
        type: 'announcement',
        isPinned: false,
        author: 'Admin Team',
        date: new Date('2025-01-18'),
        category: '관리 도구'
      },
      {
        id: 6,
        title: '음악 플레이어 성능 최적화',
        content: '음악 재생 시 발생하던 지연 현상을 해결하고, 더 빠른 로딩과 안정적인 재생을 위한 최적화 작업을 완료했습니다.',
        type: 'improvement',
        isPinned: false,
        author: 'Dev Team',
        date: new Date('2025-01-15'),
        category: '성능 개선'
      },
      {
        id: 7,
        title: '새로운 카드 게임 기능',
        content: '랑구팸에 새로운 카드 게임 시스템이 추가되었습니다! 다양한 카드를 수집하고 친구들과 함께 즐겨보세요.',
        type: 'announcement',
        isPinned: false,
        author: 'Game Team',
        date: new Date('2025-01-10'),
        category: '새 기능'
      }
    ]
    
    return NextResponse.json({ 
      success: true, 
      notices: defaultNotices 
    })
  }
}
