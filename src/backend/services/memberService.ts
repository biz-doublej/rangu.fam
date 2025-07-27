import { Member } from '@/types'
import dbConnect from '@/lib/mongodb'
import User, { IUser } from '@/models/User'

export class MemberService {
  // MongoDB에서 모든 멤버 가져오기
  static async getAllMembers(): Promise<Member[]> {
    try {
      await dbConnect()
      
      const users = await User.find({}).lean() as any[]
      
      return users.map((user: any) => ({
        id: user.username,
        name: user.username,
        role: user.role,
        description: user.bio || '',
        avatar: user.profileImage || '/images/default-avatar.jpg',
        email: user.email,
        status: 'active',
        location: '대한민국', // TODO: 사용자 위치 필드 추가 시 업데이트
        joinDate: user.createdAt || new Date(),
        personalPageUrl: `/members/${user.username}`
      }))
    } catch (error) {
      console.error('멤버 조회 오류:', error)
      // 오류 시 기본 멤버 반환
      return this.getDefaultMembers()
    }
  }

  // 특정 멤버 가져오기
  static async getMember(memberId: string): Promise<Member | null> {
    try {
      await dbConnect()
      
      const user = await User.findOne({ username: memberId }).lean() as any
      
      if (!user) {
        return null
      }
      
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
        personalPageUrl: `/members/${user.username}`
      }
    } catch (error) {
      console.error('멤버 조회 오류:', error)
      return null
    }
  }

  // 멤버 정보 업데이트
  static async updateMember(memberId: string, updates: Partial<Member>): Promise<Member | null> {
    try {
      await dbConnect()
      
      const updateData: any = {}
      
      if (updates.role) updateData.role = updates.role
      if (updates.description) updateData.bio = updates.description
      if (updates.avatar) updateData.profileImage = updates.avatar
      if (updates.email) updateData.email = updates.email
      
      const updatedUser = await User.findOneAndUpdate(
        { username: memberId },
        updateData,
        { new: true }
      ).lean() as any
      
      if (!updatedUser) {
        return null
      }
      
      return {
        id: updatedUser.username,
        name: updatedUser.username,
        role: updatedUser.role,
        description: updatedUser.bio || '',
        avatar: updatedUser.profileImage || '/images/default-avatar.jpg',
        email: updatedUser.email,
        status: 'active',
        location: '대한민국',
        joinDate: updatedUser.createdAt || new Date(),
        personalPageUrl: `/members/${updatedUser.username}`
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
        role: '소프트웨어 엔지니어, 패션 모델',
        description: '코딩과 패션을 사랑하는 다재다능한 개발자입니다.',
        avatar: '/images/jaewon.jpg',
        email: 'jaewon@rangu.fam',
        status: 'active',
        location: '서울, 대한민국',
        joinDate: new Date('2020-01-01'),
        personalPageUrl: '/members/jaewon'
      },
      {
        id: 'minseok',
        name: '정민석',
        role: '스위스 거주',
        description: '스위스에서 새로운 꿈을 키워가고 있습니다.',
        avatar: '/images/minseok.jpg',
        email: 'minseok@rangu.fam',
        status: 'active',
        location: '취리히, 스위스',
        joinDate: new Date('2020-01-01'),
        personalPageUrl: '/members/minseok'
      },
      {
        id: 'jinkyu',
        name: '정진규',
        role: '군 입대 중',
        description: '현재 군 복무 중이며, 전역 후 새로운 도전을 계획하고 있습니다.',
        avatar: '/images/jinkyu.jpg',
        email: 'jinkyu@rangu.fam',
        status: 'active',
        location: '대한민국',
        joinDate: new Date('2020-01-01'),
        personalPageUrl: '/members/jinkyu'
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
        personalPageUrl: '/members/hanul'
      }
    ]
  }
} 