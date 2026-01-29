import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const simpleProfiles = {
  jaewon: {
    id: 'jaewon',
    username: 'jaewon',
    name: '정재원',
    role: '소프트웨어 엔지니어, DoubleJ CEO',
    intro: '코딩과 패션을 사랑하는 다재다능한 개발자입니다.',
    bio: '코딩과 패션을 사랑하는 다재다능한 개발자입니다.',
    location: '서울, 대한민국',
    profileImage: '/images/profile/jw.jpg'
  },
  minseok: {
    id: 'minseok',
    username: 'minseok',
    name: '정민석',
    role: 'IMI 재학생',
    intro: '스위스에서 새로운 꿈을 키워가고 있습니다.',
    bio: '스위스에서 새로운 꿈을 키워가고 있습니다.',
    location: '취리히, 스위스',
    profileImage: '/images/profile/ms.png'
  },
  jingyu: {
    id: 'jingyu',
    username: 'jingyu',
    name: '정진규',
    role: '군 복무 중',
    intro: '현재 군 복무 중이며 전역 후 새로운 도전을 계획하고 있습니다.',
    bio: '현재 군 복무 중이며 전역 후 새로운 도전을 계획하고 있습니다.',
    location: '춘천, 대한민국',
    profileImage: '/images/profile/jq.jpg'
  },
  hanul: {
    id: 'hanul',
    username: 'hanul',
    name: '강한울',
    role: '철도차량시스템학과 진학 예정',
    intro: '자유로운 영혼으로 다양한 취미와 관심사를 탐구합니다.',
    bio: '자유로운 영혼으로 다양한 취미와 관심사를 탐구합니다.',
    location: '서울, 대한민국',
    profileImage: '/images/profile/hu.jpg'
  },
  seungchan: {
    id: 'seungchan',
    username: 'seungchan',
    name: '이승찬',
    role: '마술사 & 호그와트 재학생',
    intro: '마술과 마법으로 사람들에게 즐거움을 선사합니다.',
    bio: '마술과 마법으로 사람들에게 즐거움을 선사합니다.',
    location: '영국, 호그와트',
    profileImage: '/images/profile/sc.jpg'
  }
} as const

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id
  const normalizedId = id?.toLowerCase()

  const profile =
    (simpleProfiles as Record<string, (typeof simpleProfiles)[keyof typeof simpleProfiles]>)[normalizedId] ||
    (normalizedId === 'jq' ? simpleProfiles.jingyu :
     normalizedId === 'jw' ? simpleProfiles.jaewon :
     normalizedId === 'ms' ? simpleProfiles.minseok :
     normalizedId === 'hu' ? simpleProfiles.hanul :
     normalizedId === 'sc' ? simpleProfiles.seungchan :
     undefined)

  if (!profile) {
    return NextResponse.json({
      success: false,
      error: '프로필을 찾을 수 없습니다.'
    }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    profile,
    stats: {
      projects: 0,
      followers: 0,
      following: 0,
      posts: 0,
      views: 0
    }
  })
}
