import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import CalendarEvent from '@/models/CalendarEvent'

export const dynamic = 'force-dynamic'

const sanitizeGallery = (gallery: any[]) => {
  if (!Array.isArray(gallery)) return []
  return gallery
    .filter((item) => item?.url)
    .map((item) => ({
      url: item.url,
      title: item.title?.slice(0, 80),
      description: item.description?.slice(0, 280),
      uploadedBy: item.uploadedBy?.slice(0, 80)
    }))
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const filter: Record<string, any> = {}
    if (from || to) {
      filter.startDate = {}
      if (from) filter.startDate.$gte = new Date(from)
      if (to) filter.startDate.$lte = new Date(to)
    }

    const events = await CalendarEvent.find(filter).sort({ startDate: 1 }).lean()
    return NextResponse.json({ success: true, events })
  } catch (error) {
    console.error('[calendar][GET]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    if (!payload.title || !payload.startDate || !payload.endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await dbConnect()

    const event = await CalendarEvent.create({
      title: payload.title,
      description: payload.description,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      allDay: Boolean(payload.allDay),
      createdById: session.user.id,
      createdByName: session.user.name || session.user.email || 'Unknown',
      isPrivate: Boolean(payload.isPrivate),
      attendees: Array.isArray(payload.attendees) ? payload.attendees : [],
      location: payload.location,
      color: payload.color || '#6b5bff',
      capsulePrompt: payload.capsulePrompt,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      gallery: sanitizeGallery(payload.gallery)
    })

    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error('[calendar][POST]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create event' },
      { status: 500 }
    )
  }
}
