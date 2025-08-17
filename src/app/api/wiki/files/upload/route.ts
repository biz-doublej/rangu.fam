import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import jwt from 'jsonwebtoken'
export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']

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
    if (!user) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })

    const form = await request.formData()
    const file = form.get('file') as File
    if (!file) return NextResponse.json({ success: false, error: '파일이 필요합니다.' }, { status: 400 })

    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json({ success: false, error: '허용되지 않는 파일 형식입니다.' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: '파일이 너무 큽니다. 최대 5MB' }, { status: 400 })
    }

    const baseDir = path.join(process.cwd(), 'public', 'uploads', 'wiki')
    await mkdir(baseDir, { recursive: true })

    const id = randomUUID()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${id}_${safeName}`
    const filePath = path.join(baseDir, fileName)

    const buf = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buf)

    const urlPath = `/uploads/wiki/${fileName}`
    return NextResponse.json({ success: true, url: urlPath, name: safeName, size: file.size, type: ext })
  } catch (e) {
    console.error('위키 파일 업로드 오류:', e)
    return NextResponse.json({ success: false, error: '파일 업로드 중 오류' }, { status: 500 })
  }
}


