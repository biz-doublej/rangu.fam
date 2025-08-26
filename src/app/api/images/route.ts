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
  // Try wiki token first
  let token = request.cookies.get('wiki-token')?.value
  if (!token) {
    // Try auth header
    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }
  
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
    
    // For general uploads, we might allow anonymous uploads in some cases
    // But for now, require authentication
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file') as File
    const category = (form.get('category') as string) || 'general'
    const description = form.get('description') as string
    const isPublic = form.get('isPublic') === 'true' // default to false

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
    const uniqueFilename = `${category}_${randomUUID()}.${fileExtension}`

    // 이미지 데이터베이스에 저장
    const imageDoc = new Image({
      filename: uniqueFilename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      data: base64Data,
      uploadedBy: user.username,
      uploadedById: user._id.toString(),
      category: category,
      description: description || undefined,
      isPublic: isPublic
    })

    await imageDoc.save()

    // 이미지 접근 URL 생성
    const imageUrl = `/api/images/serve/${uniqueFilename}`

    return NextResponse.json({
      success: true,
      url: imageUrl,
      id: imageDoc._id.toString(),
      filename: uniqueFilename,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
      category: category,
      message: '이미지가 성공적으로 업로드되었습니다.'
    })

  } catch (error) {
    console.error('이미지 업로드 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: '이미지 업로드 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}

// GET endpoint to list user's images
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // 쿼리 조건 구성
    const query: any = { 
      uploadedById: user._id.toString() 
    }
    
    if (category && category !== 'all') {
      query.category = category
    }

    // 이미지 목록 조회 (data 필드 제외하여 성능 최적화)
    const images = await Image.find(query)
      .select('-data') // data 필드 제외
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // 총 개수 조회
    const total = await Image.countDocuments(query)

    // URL 추가
    const imagesWithUrls = images.map(img => ({
      ...img,
      url: `/api/images/serve/${img.filename}`
    }))

    return NextResponse.json({
      success: true,
      images: imagesWithUrls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('이미지 목록 조회 오류:', error)
    return NextResponse.json({ 
      success: false, 
      error: '이미지 목록 조회 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}