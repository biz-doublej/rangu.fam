import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { checkAdminAuth } from '@/lib/adminAuth'

// 관리자 페이지 데이터 스토어 (실제로는 DB나 파일에 저장하는 것이 좋음)
const pageData = {
  company: {
    title: '회사소개',
    content: `DoubleJ는 미국에 본사를 둔 혁신적인 기술 회사입니다. 
우리는 사용자 중심의 디지털 플랫폼을 개발하여 사람들이 더 나은 온라인 경험을 
할 수 있도록 돕고 있습니다.`
  },
  terms: {
    title: '이용약관',
    content: `본 약관은 DoubleJ(이하 "회사")가 제공하는 랑구팸(Rangu.fam) 및 이랑위키 서비스(이하 "서비스")의 이용에 관한 조건 및 절차, 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.`
  },
  privacy: {
    title: '개인정보처리방침',
    content: `DoubleJ(이하 "회사")는 개인정보보호법에 따라 이용자의 개인정보 보호 및 권익을 보호하고 개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은 처리방침을 두고 있습니다.`
  }
}

// GET /api/admin/pages - 모든 페이지 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const adminUser = checkAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: pageData })
  } catch (error) {
    console.error('페이지 데이터 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// PUT /api/admin/pages - 페이지 데이터 업데이트
export async function PUT(request: NextRequest) {
  try {
    const adminUser = checkAdminAuth(request)
    if (!adminUser) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { pageType, title, content } = await request.json()
    
    if (!pageType || !title || !content) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다' }, { status: 400 })
    }

    if (!pageData[pageType as keyof typeof pageData]) {
      return NextResponse.json({ error: '잘못된 페이지 타입입니다' }, { status: 400 })
    }

    // 페이지 데이터 업데이트
    pageData[pageType as keyof typeof pageData] = { title, content }

    return NextResponse.json({ 
      success: true, 
      message: '페이지가 성공적으로 업데이트되었습니다',
      data: pageData[pageType as keyof typeof pageData]
    })
  } catch (error) {
    console.error('페이지 업데이트 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
