import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import CalendarEvent from '@/models/CalendarEvent'

const sanitizeGallery = (gallery: any[]) => {
  if (!Array.isArray(gallery)) return undefined
  return gallery
    .filter((item) => item?.url)
    .map((item) => ({
      url: item.url,
      title: item.title?.slice(0, 80),
      description: item.description?.slice(0, 280),
      uploadedBy: item.uploadedBy?.slice(0, 80)
    }))
}

const findEvent = async (id: string) => {
  await dbConnect()
  return CalendarEvent.findById(id)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await findEvent(params.id)
    if (!event) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error('[calendar][GET:id]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const event = await findEvent(params.id)
    if (!event) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    if (event.createdById && event.createdById !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const payload = await request.json()
    if (payload.title !== undefined) event.title = payload.title
    if (payload.description !== undefined) event.description = payload.description
    if (payload.startDate) event.startDate = new Date(payload.startDate)
    if (payload.endDate) event.endDate = new Date(payload.endDate)
    if (payload.allDay !== undefined) event.allDay = Boolean(payload.allDay)
    if (payload.location !== undefined) event.location = payload.location
    if (payload.color) event.color = payload.color
    if (payload.isPrivate !== undefined) event.isPrivate = Boolean(payload.isPrivate)
    if (payload.capsulePrompt !== undefined) event.capsulePrompt = payload.capsulePrompt
    if (Array.isArray(payload.tags)) event.tags = payload.tags
    if (Array.isArray(payload.attendees)) event.attendees = payload.attendees
    const gallery = sanitizeGallery(payload.gallery)
    if (gallery) event.gallery = gallery

    await event.save()
    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error('[calendar][PUT:id]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const event = await findEvent(params.id)
    if (!event) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    if (event.createdById && event.createdById !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await event.deleteOne()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[calendar][DELETE:id]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}
