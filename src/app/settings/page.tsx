import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// /settings 으로 들어오면 기본 하위 라우트(/settings/account)로 보냄.
export default function SettingsIndex() {
  redirect('/settings/account')
}
