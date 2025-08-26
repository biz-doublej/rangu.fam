import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import dbConnect from '@/lib/mongodb'
import Image from '@/models/Image'
import { WikiUser } from '@/models/Wiki'
import jwt from 'jsonwebtoken'
export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
]

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

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file') as File
    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: '파일이 필요합니다.' 
      }, { status: 400 })
    }

    // MIME 타입 검증
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: '허용되지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP, SVG만 허용)' 
      }, { status: 400 })
    }

    // 파일 크기 검증
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ 
        success: false, 
        error: '파일이 너무 큽니다. 최대 5MB까지 허용됩니다.' 
      }, { status: 400 })
    }

    // 파일을 base64로 변환
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64Data = buffer.toString('base64')

    // 고유한 파일명 생성
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const uniqueFilename = `wiki_${randomUUID()}.${fileExtension}`

    // 이미지 데이터베이스에 저장
    const imageDoc = new Image({
      filename: uniqueFilename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      data: base64Data,
      uploadedBy: user.username,
      uploadedById: user._id.toString(),
      category: 'wiki',
      isPublic: true
    })

    await imageDoc.save()

    // 이미지 접근 URL 생성
    const imageUrl = `/api/images/serve/${uniqueFilename}`

    return NextResponse.json({
      success: true,
      url: imageUrl,
      name: file.name,
      size: file.size,
      type: `.${fileExtension}`
    })
    
  } catch (error) {
    console.error('위키 파일 업로드 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: '파일 업로드 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}