import { eq } from 'drizzle-orm'
import { Member } from '@/types'
import { getDb } from '@/db/client'
import { users } from '@/db/schema/users'

export class MemberService {
  static async getAllMembers(): Promise<Member[]> {
    return this.getDefaultMembers()
  }

  // 특정 멤버 가져오기
  static async getMember(memberId: string): Promise<Member | null> {
    try {
      const db = getDb()
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, memberId))
        .limit(1)

      if (!user) return null

      return {
        id: user.username,
        name: user.username,
        role: user.role,
        description: user.bio || '',
        avatar: user.profileImage || '/images/default-avatar.jpg',
        email: user.email,
        status: 'active',
        location: '대한민국',
        joinDate: user.createdAt || new Date(),
        personalPageUrl: `/members/${user.username}`,
      }
    } catch (error) {
      console.error('멤버 조회 오류:', error)
      return null
    }
  }

  // 멤버 정보 업데이트
  static async updateMember(memberId: string, updates: Partial<Member>): Promise<Member | null> {
    try {
      const db = getDb()

      const updateData: Record<string, any> = { updatedAt: new Date() }
      if (updates.role) updateData.role = updates.role
      if (updates.description) updateData.bio = updates.description
      if (updates.avatar) updateData.profileImage = updates.avatar
      if (updates.email) updateData.email = updates.email

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.username, memberId))
        .returning()

      if (!updated) return null

      return {
        id: updated.username,
        name: updated.username,
        role: updated.role,
        description: updated.bio || '',
        avatar: updated.profileImage || '/images/default-avatar.jpg',
        email: updated.email,
        status: 'active',
        location: '대한민국',
        joinDate: updated.createdAt || new Date(),
        personalPageUrl: `/members/${updated.username}`,
      }
    } catch (error) {
      console.error('멤버 업데이트 오류:', error)
      return null
    }
  }

  // 오류 시 기본 멤버 데이터 (백업용)
  private static getDefaultMembers(): Member[] {
    return [
      {
        id: 'jaewon',
        name: '정재원',
        role: '소프트웨어 엔지니어, DoubleJ CEO',
        description: '코딩과 패션을 사랑하는 다재다능한 개발자입니다.',
        avatar: '/images/jaewon.jpg',
        email: 'jaewon@rangu.fam',
        status: 'active',
        location: '서울, 대한민국',
        joinDate: new Date('2020-01-01'),
        personalPageUrl: '/members/jaewon',
      },
      {
        id: 'minseok',
        name: '정민석',
        role: 'IMI 재학생',
        description: '스위스에서 새로운 꿈을 키워가고 있습니다.',
        avatar: '/images/minseok.jpg',
        email: 'minseok@rangu.fam',
        status: 'active',
        location: '취리히, 스위스',
        joinDate: new Date('2020-01-01'),
        personalPageUrl: '/members/minseok',
      },
      {
        id: 'jinkyu',
        name: '정진규',
        role: '군 복무 중',
        description: '현재 군 복무 중이며, 전역 후 새로운 도전을 계획하고 있습니다.',
        avatar: '/images/jingyu.jpg',
        email: 'jingyu@rangu.fam',
        status: 'active',
        location: '춘천, 대한민국',
        joinDate: new Date('2020-01-01'),
        personalPageUrl: '/members/jinkyu',
      },
      {
        id: 'hanul',
        name: '강한울',
        role: '무직(편돌이)',
        description: '자유로운 영혼으로 다양한 취미와 관심사를 탐구합니다.',
        avatar: '/images/hanul.jpg',
        email: 'hanul@rangu.fam',
        status: 'active',
        location: '서울, 대한민국',
        joinDate: new Date('2020-01-01'),
        personalPageUrl: '/members/hanul',
      },
      {
        id: 'seungchan',
        name: '이승찬',
        role: '마술사 & 호그와트 재학생',
        description: '마술과 마법을 통해 사람들에게 즐거움을 선사하는 마술사입니다.',
        avatar: '/images/seungchan.jpg',
        email: 'seungchan@rangu.fam',
        status: 'active',
        location: '호그와트 마법학교, 영국',
        joinDate: new Date('2025-01-21'),
        personalPageUrl: '/members/seungchan',
      },
    ]
  }
}
