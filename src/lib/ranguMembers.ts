export const RANGU_TACTICS_MEMBERS = [
  { id: 'hanul', name: '강한울', avatar: '/images/profile/hu.jpg' },
  { id: 'jaewon', name: '정재원', avatar: '/images/profile/jw.jpg' },
  { id: 'minseok', name: '정민석', avatar: '/images/profile/ms.png' },
  { id: 'seungchan', name: '이승찬', avatar: '/images/profile/sc.jpg' },
  { id: 'jinkyu', name: '정진규', avatar: '/images/profile/jq.jpg' },
] as const

export type RanguTacticsMemberId = (typeof RANGU_TACTICS_MEMBERS)[number]['id']

const memberIdSet = new Set<string>(RANGU_TACTICS_MEMBERS.map((member) => member.id))

export function isRanguTacticsMemberId(value: string): value is RanguTacticsMemberId {
  return memberIdSet.has(value)
}
