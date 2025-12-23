import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import CalendarEvent from '@/models/CalendarEvent'
import EventTimeCapsule from '@/models/EventTimeCapsule'
import { addYears } from 'date-fns'

const mapEntry = (entry: any) => {
  const isUnlocked = new Date() >= entry.unlockDate
  return {
    id: entry._id.toString(),
    mood: entry.mood,
    memo: isUnlocked ? entry.memo : null,
    createdAt: entry.createdAt,
    unlockDate: entry.unlockDate,
    isUnlocked
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const entries = await EventTimeCapsule.find({
      eventId: params.id,
      authorId: session.user.id
    })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      capsules: entries.map(mapEntry)
    })
  } catch (error) {
    console.error('[calendar][capsules][GET]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load capsules' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    if (!payload.memo || !payload.mood) {
      return NextResponse.json(
        { success: false, error: 'Mood and memo are required' },
        { status: 400 }
      )
    }

    await dbConnect()
    const event = await CalendarEvent.findById(params.id)
    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 })
    }

    const unlockDate = addYears(new Date(event.startDate), 1)

    const entry = await EventTimeCapsule.findOneAndUpdate(
      { eventId: params.id, authorId: session.user.id },
      {
        $set: {
          eventId: params.id,
          authorId: session.user.id,
          authorName: session.user.name || session.user.email,
          mood: payload.mood,
          memo: payload.memo,
          unlockDate
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return NextResponse.json({ success: true, capsule: mapEntry(entry) })
  } catch (error) {
    console.error('[calendar][capsules][POST]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save capsule' },
      { status: 500 }
    )
  }
}
