import { describe, expect, it } from 'vitest'
import { isRanguTacticsMemberId, RANGU_TACTICS_MEMBERS } from '@/lib/ranguMembers'

describe('Rangu tactics roster', () => {
  it('contains the five canonical members in sidebar order', () => {
    expect(RANGU_TACTICS_MEMBERS.map((member) => member.id)).toEqual([
      'hanul', 'jaewon', 'minseok', 'seungchan', 'jinkyu',
    ])
  })

  it('accepts only canonical member IDs', () => {
    expect(isRanguTacticsMemberId('jinkyu')).toBe(true)
    expect(isRanguTacticsMemberId('jingyu')).toBe(false)
  })
})
