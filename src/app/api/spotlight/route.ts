import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { spotlightSlides } from '@/db/schema'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const db = getDb()
    const slides = await db
      .select()
      .from(spotlightSlides)
      .where(eq(spotlightSlides.isActive, true))
      .orderBy(asc(spotlightSlides.order), asc(spotlightSlides.createdAt))

    const payload = slides.map((s) => ({
      id: s.id,
      title: s.title,
      type: s.type,
      description: s.description ?? undefined,
      src: s.srcPath.startsWith('/') ? s.srcPath : `/${s.srcPath}`,
      poster: s.posterPath
        ? s.posterPath.startsWith('/')
          ? s.posterPath
          : `/${s.posterPath}`
        : undefined,
      durationSeconds: s.durationSeconds,
      tags: s.tags ?? [],
    }))

    return NextResponse.json({ slides: payload })
  } catch (error) {
    console.error('Failed to load spotlight slides:', error)
    return NextResponse.json({ slides: [] }, { status: 200 })
  }
}
