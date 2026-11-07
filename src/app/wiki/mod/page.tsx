import { redirect } from 'next/navigation'

// 편집 검수는 운영 대시보드로 합쳐졌다.
export default function WikiModRedirect() {
  redirect('/admin?tab=review')
}
