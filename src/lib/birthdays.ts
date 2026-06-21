// 랑구팸 멤버 생일 — 멤버 식별자는 members 페이지/`memberSites` 와 동일한 slug 사용.
// (DB profiles.birthdate 와 별개로, 멤버가 하드코딩 소스이므로 여기서 단일 출처로 관리)

export interface MemberBirthday {
  id: string
  name: string
  cardCode: string
  year: number
  month: number // 1-12
  day: number // 1-31
  avatar?: string
}

export const MEMBER_BIRTHDAYS: MemberBirthday[] = [
  { id: 'minseok', name: '정민석', cardCode: 'R20', year: 2005, month: 2, day: 23, avatar: '/images/profile/ms.png' },
  { id: 'hanul', name: '강한울', cardCode: 'R17', year: 2005, month: 3, day: 2, avatar: '/images/profile/hu.jpg' },
  { id: 'seungchan', name: '이승찬', cardCode: 'R1', year: 2005, month: 3, day: 2, avatar: '/images/profile/sc.jpg' },
  { id: 'jaewon', name: '정재원', cardCode: 'R27', year: 2005, month: 7, day: 27, avatar: '/images/profile/jw.jpg' },
  { id: 'jingyu', name: '정진규', cardCode: 'R7', year: 2005, month: 9, day: 1, avatar: '/images/profile/jq.jpg' },
]

export interface UpcomingBirthday extends MemberBirthday {
  next: Date // 다음 생일 날짜
  daysUntil: number // 오늘 기준 남은 일수 (0 = 오늘)
  turningAge: number // 기준일 연도 기준 나이 (예: 2005년생이면 2026년 내내 21). 한국식(세는나이) 아님
  isToday: boolean
}

/**
 * 기준일(ref)로부터 다가오는 생일을 남은 일수 오름차순으로 반환.
 * 오늘이 생일인 멤버는 daysUntil=0 으로 맨 앞에 온다.
 */
export function getUpcomingBirthdays(ref: Date, count?: number): UpcomingBirthday[] {
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const items = MEMBER_BIRTHDAYS.map((b) => {
    let next = new Date(today.getFullYear(), b.month - 1, b.day)
    if (next.getTime() < today.getTime()) {
      next = new Date(today.getFullYear() + 1, b.month - 1, b.day)
    }
    const daysUntil = Math.round((next.getTime() - today.getTime()) / 86_400_000)
    return {
      ...b,
      next,
      daysUntil,
      turningAge: today.getFullYear() - b.year,
      isToday: daysUntil === 0,
    }
  })
  items.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name, 'ko-KR'))
  return typeof count === 'number' ? items.slice(0, count) : items
}

/** 기준일 기준 이번 달 생일 멤버 (일 오름차순) */
export function getThisMonthBirthdays(ref: Date): MemberBirthday[] {
  const m = ref.getMonth() + 1
  return MEMBER_BIRTHDAYS.filter((b) => b.month === m).sort((a, b) => a.day - b.day)
}
