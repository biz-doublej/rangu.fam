import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Image from '@/models/Image'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    await dbConnect()
    
    const { filename } = params

    // 데이터베이스에서 이미지 찾기
    const imageDoc = await Image.findOne({ filename })

    if (!imageDoc) {
      return NextResponse.json({ 
        error: '이미지를 찾을 수 없습니다.' 
      }, { status: 404 })
    }

    // base64 데이터를 Buffer로 변환
    const imageBuffer = Buffer.from(imageDoc.data, 'base64')

    // 적절한 Content-Type 헤더와 함께 이미지 반환
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': imageDoc.mimeType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // 1년 캐시
        'Content-Disposition': `inline; filename="${imageDoc.originalName}"`
      }
    })

  } catch (error) {
    console.error('이미지 서빙 오류:', error)
    return NextResponse.json({ 
      error: '이미지를 로드할 수 없습니다.' 
    }, { status: 500 })
  }
}