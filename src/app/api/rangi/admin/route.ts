import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

const parseAdminIds = () => {
  const raw = process.env.RANGI_BOT_ADMIN_IDS || process.env.DISCORD_BOT_ADMIN_IDS || ''
  return raw
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const adminIds = parseAdminIds()

  const isAdmin =
    !!session?.user?.discordId && adminIds.includes(session.user.discordId)

  return NextResponse.json({ isAdmin })
}
