import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import dbConnect from '@/lib/mongodb'
import Track from '@/models/Track'
import { validateAudioFile } from '@/services/musicService'
import { parseBuffer } from 'music-metadata'


export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const formData = await request.formData()
    
    // 폼 데이터 추출
    const file = formData.get('audioFile') as File
    const coverImage = formData.get('coverImage') as File | null
    const title = formData.get('title') as string
    const artist = formData.get('artist') as string
    const album = formData.get('album') as string
    const genre = formData.get('genre') as string
    const tags = formData.get('tags') as string
    const description = formData.get('description') as string
    const uploadedBy = formData.get('uploadedBy') as string
    const uploadedById = formData.get('uploadedById') as string

    // 필수 필드 검증
    if (!file || !title || !artist || !uploadedBy || !uploadedById) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 파일 유효성 검사
    const validation = validateAudioFile(file)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // 오디오 파일 저장 경로 설정
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'audio')
    await mkdir(uploadsDir, { recursive: true })

    // 고유한 파일명 생성
    const timestamp = Date.now()
    const fileExtension = path.extname(file.name)
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = path.join(uploadsDir, fileName)

    // 오디오 파일 저장
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // 커버 이미지 처리
    let coverImagePath = '/images/default-music-cover.jpg' // 기본 커버
    if (coverImage && coverImage.size > 0) {
      try {
        // 이미지 저장 경로 설정
        const coverUploadsDir = path.join(process.cwd(), 'public', 'uploads', 'covers')
        await mkdir(coverUploadsDir, { recursive: true })

        // 고유한 커버 이미지 파일명 생성
        const coverExtension = path.extname(coverImage.name)
        const coverFileName = `cover_${timestamp}_${coverImage.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const coverFilePath = path.join(coverUploadsDir, coverFileName)

        // 커버 이미지 저장
        const coverBytes = await coverImage.arrayBuffer()
        const coverBuffer = Buffer.from(coverBytes)
        await writeFile(coverFilePath, coverBuffer)

        coverImagePath = `/uploads/covers/${coverFileName}`
        console.log(`커버 이미지 저장 완료: ${coverImagePath}`)
      } catch (error) {
        console.warn('커버 이미지 저장 실패, 기본 커버 사용:', error)
      }
    }

    // 오디오 파일의 실제 메타데이터 추출
    let duration = 180 // 기본값 3분
    let extractedArtist = artist || 'Unknown Artist'
    let extractedTitle = title || fileName
    
    try {
      const metadata = await parseBuffer(buffer, { mimeType: file.type })
      if (metadata.format.duration) {
        duration = Math.round(metadata.format.duration)
      }
      
      // 메타데이터에서 아티스트와 제목 정보 가져오기 (폼 데이터가 없을 때만)
      if (!artist && metadata.common.artist) {
        extractedArtist = metadata.common.artist
      }
      if (!title && metadata.common.title) {
        extractedTitle = metadata.common.title
      }
      
      console.log(`음악 메타데이터 추출 완료: ${extractedTitle} - ${extractedArtist} (${duration}초)`)
    } catch (error) {
      console.warn('메타데이터 추출 실패, 기본값 사용:', error)
    }

    // 기본 커버 이미지 URL


    // 태그 처리
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : []

    // 데이터베이스에 트랙 정보 저장
    const newTrack = new Track({
      title: extractedTitle,
      artist: extractedArtist,
      album: album || undefined,
      duration,
      audioFile: `/uploads/audio/${fileName}`,
      audioFileName: file.name,
      audioFileSize: file.size,
      sourceType: 'file',
      coverImage: coverImagePath, // Use uploaded cover or default
      uploadedBy,
      uploadedById,
      genre: genre || 'Other',
      tags: tagsArray,
      description: description || undefined,
      likes: 0,
      dislikes: 0,
      plays: 0,
      commentsIds: [],
      isPublic: true,
      isFeatured: false
    })

    const savedTrack = await newTrack.save()

    return NextResponse.json({
      success: true,
      track: savedTrack,
      message: '음악 파일이 성공적으로 업로드되었습니다.'
    })

  } catch (error) {
    console.error('파일 업로드 오류:', error)
    return NextResponse.json(
      { error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
