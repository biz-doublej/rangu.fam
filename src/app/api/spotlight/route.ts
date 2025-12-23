import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import SpotlightSlide from '@/models/SpotlightSlide'
import { Types } from 'mongoose'

type SpotlightSlideLean = {
  _id: Types.ObjectId | string
  title: string
  type: 'video' | 'image'
  description?: string
  srcPath: string
  posterPath?: string
  durationSeconds?: number
  tags?: string[]
  order: number
  isActive: boolean
}

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    await dbConnect()

    const slides = (await SpotlightSlide.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean()) as unknown as SpotlightSlideLean[]

    const payload = slides.map(slide => ({
      id: typeof slide._id === 'string' ? slide._id : slide._id.toHexString(),
      title: slide.title,
      type: slide.type,
      description: slide.description,
      src: slide.srcPath.startsWith('/') ? slide.srcPath : `/${slide.srcPath}`,
      poster: slide.posterPath ? (slide.posterPath.startsWith('/') ? slide.posterPath : `/${slide.posterPath}`) : undefined,
      durationSeconds: slide.durationSeconds,
      tags: slide.tags || [],
    }))

    return NextResponse.json({ slides: payload })
  } catch (error) {
    console.error('Failed to load spotlight slides:', error)
    return NextResponse.json({ slides: [] }, { status: 200 })
  }
}
