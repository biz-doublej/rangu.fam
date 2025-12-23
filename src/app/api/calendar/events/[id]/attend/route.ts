import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import CalendarEvent from '@/models/CalendarEvent'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const event = await CalendarEvent.findById(params.id)
    if (!event) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const attendeeId = session.user.id || session.user.email || 'user'
    const already = event.attendees.includes(attendeeId)
    if (already) {
      event.attendees = event.attendees.filter((id: string) => id !== attendeeId)
    } else {
      event.attendees.push(attendeeId)
    }

    await event.save()
    return NextResponse.json({ success: true, attendees: event.attendees })
  } catch (error) {
    console.error('[calendar][attend]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update attendance' },
      { status: 500 }
    )
  }
}
