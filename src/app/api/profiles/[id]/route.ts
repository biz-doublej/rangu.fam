import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Profile from '@/models/Profile'
import User from '@/models/User'
export const dynamic = 'force-dynamic'

// GET - 특정 사용자 ID 또는 username으로 프로필 가져오기
// 실제 저장되는 더미 데이터 (메모리에 유지)
let dummyProfiles: { [key: string]: any } = {
  jaewon: {
    _id: '507f1f77bcf86cd799439011',
    userId: {
      _id: '507f1f77bcf86cd799439011',
      username: 'jaewon',
      email: 'jaewon@rangu.fam',
      role: '소프트웨어 엔지니어 & 패션 모델',
      profileImage: null
    },
    username: 'jaewon',
    intro: '다양한 프로젝트 진행 중인 풀스택 개발자',
    bio: '현재 여러 프로젝트를 동시에 진행하며 개발과 학업을 병행하고 있습니다. 효율적인 시간 관리와 목표 달성을 위해 노력하고 있어요.',
    location: '서울, 대한민국',
    website: 'https://jaewon.dev',
    // 프로젝트 진행 상황 정보
    activeProjects: [
      {
        name: 'PawDay',
        description: '시간 및 일정 관리 앱',
        category: '앱 개발',
        startDate: '2025-07-01',
        endDate: '2025-08-31',
        currentProgress: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          const start = new Date('2025-07-01T09:00:00+09:00');
          const end = new Date('2025-08-31T23:59:59+09:00');
          const total = end.getTime() - start.getTime();
          const current = kstNow.getTime() - start.getTime();
          return Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
        })(),
        status: '출시 준비 중',
        color: 'blue'
      },
      {
        name: 'POSCO 분석',
        description: '포스코 회사 미래 분석 프로젝트',
        category: '기업',
        startDate: '2025-09-01',
        endDate: '2025-10-31',
        currentProgress: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          const start = new Date('2025-09-01T09:00:00+09:00');
          const end = new Date('2025-10-31T23:59:59+09:00');
          const total = end.getTime() - start.getTime();
          const current = kstNow.getTime() - start.getTime();
          return Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
        })(),
        status: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          return kstNow < new Date('2025-09-01') ? '시작 예정' : '진행 중';
        })(),
        color: 'green'
      },
      {
        name: 'EduScope',
        description: '초등학생 개개인 맞춤 학습형 앱',
        category: '교육 앱',
        startDate: '2025-08-01',
        endDate: '2026-01-31',
        currentProgress: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          const start = new Date('2025-08-01T09:00:00+09:00');
          const end = new Date('2026-01-31T23:59:59+09:00');
          const total = end.getTime() - start.getTime();
          const current = kstNow.getTime() - start.getTime();
          return Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
        })(),
        status: '개발 중',
        color: 'purple'
      },
      {
        name: 'MFDS 안전분석',
        description: '식약처 안전분석 프로젝트',
        category: '정부',
        startDate: '2025-08-01',
        endDate: '2025-08-31',
        currentProgress: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          const start = new Date('2025-08-01T09:00:00+09:00');
          const end = new Date('2025-08-31T23:59:59+09:00');
          const total = end.getTime() - start.getTime();
          const current = kstNow.getTime() - start.getTime();
          return Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
        })(),
        status: '진행 중',
        color: 'red'
      },
      {
        name: '대학교 개학',
        description: '2학기 시작',
        category: '학업',
        startDate: '2025-08-01',
        endDate: '2025-09-01',
        currentProgress: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          const start = new Date('2025-08-01T09:00:00+09:00');
          const end = new Date('2025-09-01T09:00:00+09:00');
          const total = end.getTime() - start.getTime();
          const current = kstNow.getTime() - start.getTime();
          return Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
        })(),
        status: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          return kstNow < new Date('2025-09-01') ? '개학 준비' : '학기 시작';
        })(),
        color: 'yellow'
      },
      {
        name: 'CampusON',
        description: '대학생 개개인 AI맞춤형 학습',
        category: '교육 플랫폼',
        startDate: '2025-08-01',
        endDate: '2025-12-31',
        currentProgress: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          const start = new Date('2025-08-01T09:00:00+09:00');
          const end = new Date('2025-12-31T23:59:59+09:00');
          const total = end.getTime() - start.getTime();
          const current = kstNow.getTime() - start.getTime();
          return Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
        })(),
        status: '개발 중',
        color: 'indigo'
      },
      {
        name: 'MediEdu',
        description: '의료학 전공생 AI맞춤형 학습',
        category: '의료 교육',
        startDate: '2025-08-01',
        endDate: '2025-11-30',
        currentProgress: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          const start = new Date('2025-08-01T09:00:00+09:00');
          const end = new Date('2025-11-30T23:59:59+09:00');
          const total = end.getTime() - start.getTime();
          const current = kstNow.getTime() - start.getTime();
          return Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
        })(),
        status: '개발 중',
        color: 'teal'
      }
    ],
    skills: [
      { name: 'React', level: 95, category: 'Frontend' },
      { name: 'TypeScript', level: 90, category: 'Language' },
      { name: 'Node.js', level: 85, category: 'Backend' },
      { name: 'Python', level: 80, category: 'Language' },
      { name: 'UI/UX Design', level: 85, category: 'Design' },
      { name: 'Photography', level: 75, category: 'Creative' }
    ],
    projects: [
      {
        title: 'Rangu.fam',
        description: '친구들과 함께하는 개인 공간 웹사이트',
        tech: ['Next.js', 'TypeScript', 'MongoDB', 'Tailwind CSS'],
        status: 'completed',
        featured: true,
        liveUrl: 'https://rangu.fam',
        githubUrl: 'https://github.com/jaewon/rangu-fam'
      },
      {
        title: 'PawDay',
        description: '시간 및 일정 관리 앱',
        tech: ['React Native', 'TypeScript', 'Firebase', 'Redux'],
        status: 'in-progress',
        featured: true,
        liveUrl: '',
        githubUrl: 'https://github.com/jaewon/pawday',
        deadline: '2025-08-31',
        category: '앱 개발'
      },
      {
        title: 'POSCO 미래 분석',
        description: '포스코 회사 미래 분석 프로젝트',
        tech: ['Python', 'Data Analysis', 'Machine Learning', 'Tableau'],
        status: 'pending',
        featured: true,
        liveUrl: '',
        githubUrl: '',
        deadline: '2025-10-31',
        category: '기업'
      },
      {
        title: 'EduScope',
        description: '초등학생 개개인 맞춤 학습형 앱',
        tech: ['React Native', 'AI/ML', 'Node.js', 'PostgreSQL'],
        status: 'in-progress',
        featured: true,
        liveUrl: '',
        githubUrl: 'https://github.com/jaewon/eduscope',
        deadline: '2026-01-31',
        category: '교육 앱'
      },
      {
        title: 'MFDS 안전분석',
        description: '식약처 안전분석 프로젝트',
        tech: ['Python', 'Data Science', 'API', 'React'],
        status: 'in-progress',
        featured: true,
        liveUrl: '',
        githubUrl: '',
        deadline: '2025-08-31',
        category: '정부'
      },
      {
        title: 'CampusON',
        description: '대학생 개개인 AI맞춤형 학습 (전국 대학교 프로젝트)',
        tech: ['AI/ML', 'React', 'Python', 'AWS', 'Docker'],
        status: 'in-progress',
        featured: true,
        liveUrl: '',
        githubUrl: 'https://github.com/jaewon/campuson',
        deadline: '2025-12-31',
        category: '교육 플랫폼'
      },
      {
        title: 'MediEdu',
        description: '의료학 전공생의 AI맞춤형 학습 및 AI자세 지도 (정부 프로젝트)',
        tech: ['AI/ML', 'Computer Vision', 'React', 'Python', 'TensorFlow'],
        status: 'in-progress',
        featured: true,
        liveUrl: '',
        githubUrl: 'https://github.com/jaewon/mediedu',
        deadline: '2025-11-30',
        category: '의료 교육'
      }
    ],
    experience: [
      {
        company: 'Tech Startup',
        position: '프론트엔드 개발자',
        period: '2023.03 - 현재',
        description: 'React 기반 웹 애플리케이션 개발 및 사용자 경험 개선',
        achievements: ['성능 30% 향상', '사용자 만족도 95% 달성'],
        isCurrent: true
      }
    ],
    socialLinks: {
      github: 'https://github.com/GabrielJung0727',
      linkedin: 'https://www.linkedin.com/in/gabriel-jung-76a074356/',
      instagram: 'https://instagram.com/dev.gabrieljung',
      website: 'https://jaewon.dev'
    },
    recentPosts: [
      {
        content: '새로운 프로젝트 Rangu.fam을 완성했습니다! 친구들과 함께 만든 특별한 공간이에요. 🚀',
        type: 'text',
        tags: ['개발', '프로젝트', 'Next.js'],
        likes: 34,
        createdAt: '2025-01-20T00:00:00.000Z'
      }
    ],
    viewCount: 156,
    likesReceived: 128,
    followers: [],
    following: []
  },
  minseok: {
    _id: '507f1f77bcf86cd799439012',
    userId: {
      _id: '507f1f77bcf86cd799439012',
      username: 'minseok',
      email: 'minseok@rangu.fam',
      role: '정민석 (IMI Switzerland)',
      profileImage: null
    },
    username: 'minseok',
    intro: '스위스 유학 준비 중 (2025.01 출국 예정)',
    bio: '2025년 1월 스위스로 유학을 떠날 예정입니다. 새로운 환경에서 더 넓은 세상을 경험하고 성장하고 싶습니다.',
    location: '대한민국 → 스위스',
    website: '',
    // 유학 관련 특별 정보
    studyAbroadInfo: {
      country: '스위스',
      city: 'Kastanienbaum, Luzern',
      university: 'IMI International Management Institute Switzerland',
      major: 'International Hospitality Management',
      departureDate: '2025-01-15',
      program: 'BA (Hons) Degree',
      duration: '3년',
      daysUntilDeparture: (() => {
        const now = new Date();
        const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const departureDate = new Date('2025-01-15T10:00:00+09:00');
        return Math.floor((departureDate.getTime() - kstNow.getTime()) / (1000 * 60 * 60 * 24));
      })(),
      motto: 'Setting you on a pathway to success! 🇨🇭'
    },
    skills: [
      { name: '독일어', level: 75, category: '언어' },
      { name: '영어', level: 90, category: '언어' },
      { name: '프랑스어', level: 65, category: '언어' },
      { name: '호스피탈리티', level: 80, category: '전문분야' },
      { name: '커뮤니케이션', level: 88, category: '소프트스킬' },
      { name: '리더십', level: 75, category: '소프트스킬' },
      { name: '고객서비스', level: 82, category: '전문분야' },
      { name: '적응력', level: 90, category: '개인역량' }
    ],
    projects: [
      {
        title: '스위스 유학 준비 프로젝트',
        description: '비자 신청, 기숙사 신청, 어학 준비 등 체계적인 유학 준비',
        tech: ['독일어', '서류준비', '계획수립'],
        featured: true,
        liveUrl: '',
        githubUrl: ''
      },
      {
        title: '유럽 여행 계획',
        description: '유학 기간 중 유럽 각국을 여행하며 문화를 체험하는 계획',
        tech: ['여행계획', '문화탐방', '네트워킹'],
        featured: false,
        liveUrl: '',
        githubUrl: ''
      }
    ],
    experience: [
      {
        position: '호텔경영학과 학생 예정',
        company: 'IMI International Management Institute Switzerland',
        period: '2025.01 - 2028.01 (예정)',
        startDate: '2025-01-15',
        endDate: '2028-01-15',
        isCurrent: false,
        description: 'IMI Switzerland에서 국제 호스피탈리티 경영학을 전공하며 영국 Manchester Metropolitan University 학위를 받을 예정입니다.',
        achievements: [
          'IMI Switzerland 입학 허가 취득',
          'Manchester Met University 파트너십 혜택',
          '97% 취업률 보장 프로그램 참여',
          '35개국 이상 다국적 환경에서 학습'
        ]
      }
    ],
    socialLinks: {
      instagram: '',
      blog: '',
      github: ''
    },
    recentPosts: [
      {
        content: '드디어 IMI Switzerland 입학허가를 받았습니다! QS 랭킹 톱20 호텔경영학교이고 Manchester Met University와 파트너십도 있어서 정말 기대돼요 🏨🇨🇭',
        type: 'text',
        likes: 78,
        tags: ['IMI', 'Manchester Met', '스위스유학'],
        createdAt: '2024-12-10T15:30:00Z'
      },
      {
        content: 'IMI는 97% 취업률을 자랑한다고 하네요! 35개국 이상에서 온 학생들과 함께 공부할 생각하니 정말 설레요 ✨',
        type: 'text',
        likes: 52,
        tags: ['취업률', '다국적', '글로벌'],
        createdAt: '2024-12-05T19:20:00Z'
      },
      {
        content: 'Kastanienbaum 캠퍼스가 루체른 호수 옆에 있다고 해요! 아름다운 호숫가에서 공부할 생각하니 상상만 해도 멋져요 🏔️💙',
        type: 'text',
        likes: 63,
        tags: ['Kastanienbaum', 'Luzern', '호숫가'],
        createdAt: '2024-11-28T14:45:00Z'
      }
    ],
    followers: [],
    following: [],
    viewCount: 0,
    likesReceived: 0
  },
  jingyu: {
    _id: '507f1f77bcf86cd799439013',
    userId: {
      _id: '507f1f77bcf86cd799439013',
      username: 'jingyu',
      email: 'jingyu@rangu.fam',
      role: '정진규 (육군 이등병)',
      profileImage: null
    },
    username: 'jingyu',
    intro: '대한민국 육군 복무 중',
    bio: '2025년 7월 21일 입대하여 현재 육군에서 복무 중입니다. 군 생활을 통해 성장하고 있습니다.',
    location: '육군 부대',
    website: '',
    // 군대 관련 특별 정보
    militaryInfo: {
      branch: '육군',
      rank: '이등병',
      unit: '제00사단 0연대',
      enlistmentDate: '2025-07-21',
      dischargeDate: '2027-01-20',
      trainingEndDate: '2025-08-08', // 훈련소 18일
      daysServed: (() => {
        const now = new Date();
        const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const enlistmentDate = new Date('2025-07-21T09:00:00+09:00');
        return Math.floor((kstNow.getTime() - enlistmentDate.getTime()) / (1000 * 60 * 60 * 24));
      })(),
      daysRemaining: (() => {
        const now = new Date();
        const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const dischargeDate = new Date('2027-01-20T09:00:00+09:00');
        return Math.floor((dischargeDate.getTime() - kstNow.getTime()) / (1000 * 60 * 60 * 24));
      })(),
      totalServiceDays: 548, // 2025.07.21 ~ 2027.01.20 (18개월)
      motto: '강인한 육군, 필승의 신념!'
    },
    skills: [
      { name: '체력 단련', level: 95, category: '군사' },
      { name: '총기 분해조립', level: 88, category: '군사' },
      { name: '전투 기술', level: 82, category: '군사' },
      { name: '팀워크', level: 90, category: '협업' },
      { name: '인내심', level: 100, category: '정신력' },
      { name: '리더십', level: 75, category: '리더십' }
    ],
    projects: [
      {
        title: '부대 내 IT 시스템 개선',
        description: '부대 내부 업무 효율성을 위한 간단한 시스템 개선 작업',
        tech: ['Excel', 'PowerPoint', '문서작성'],
        featured: true,
        liveUrl: '',
        githubUrl: ''
      },
      {
        title: '전역 후 진로 계획',
        description: '체계적인 전역 후 진로 설계 및 학습 계획 수립',
        tech: ['진로설계', '자기계발', '학습계획'],
        featured: false,
        liveUrl: '',
        githubUrl: ''
      }
    ],
    experience: [
      {
        position: '이등병',
        company: '대한민국 육군',
        period: '2025.07.21 - 2027.01.20 (복무 중)',
        startDate: '2025-07-21',
        endDate: '2027-01-20',
        isCurrent: true,
        description: '육군훈련소에서 기본군사훈련을 마치고 현재 자대에서 성실히 군 복무를 수행하고 있습니다.',
        achievements: [
          '신병교육대 우수 수료',
          '자대 배치 완료',
          '기본군사훈련 수료',
          '동료들과의 원활한 협력'
        ]
      }
    ],
    socialLinks: {
      instagram: '',
      blog: '',
      github: ''
    },
    recentPosts: [
      {
        content: '자대 배치받고 벌써 몇 주가 지났네요! 훈련소에서 배운 걸 실전에 적용하고 있어요. 동기들과도 잘 지내고 있습니다 🪖',
        type: 'text',
        likes: 67,
        tags: ['자대생활', '군복무', '동기들'],
        createdAt: '2025-08-05T14:30:00Z'
      },
      {
        content: '훈련소에서 나온지 얼마 안 됐는데 벌써 군 생활이 익숙해지고 있어요. 규칙적인 생활과 체력 단련이 도움이 되는 것 같아요 💪',
        type: 'text',
        likes: 54,
        tags: ['군생활', '체력단련', '성장'],
        createdAt: '2025-08-02T18:45:00Z'
      },
      {
        content: '기본군사훈련 18일을 무사히 마쳤습니다! 힘들었지만 많이 배웠어요. 이제 자대에서 새로운 시작이네요 🎖️',
        type: 'text',
        likes: 89,
        tags: ['훈련소수료', '새로운시작', '성취감'],
        createdAt: '2025-08-08T20:15:00Z'
      }
    ],
    followers: [],
    following: [],
    viewCount: 0,
    likesReceived: 0
  },
  seungchan: {
    _id: '507f1f77bcf86cd799439015',
    userId: {
      _id: '507f1f77bcf86cd799439015',
      username: 'mushbit',
      email: 'seungchan@rangu.fam',
      role: '이승찬 (마술사 & 호그와트 재학생)',
      profileImage: null
    },
    username: 'mushbit',
    intro: '마술사 & 호그와트 고급 마법반 재학생',
    bio: '현재 호그와트에 재학 중이며, 고급 마법반에서 공부하고 있습니다. 마술과 마법을 통해 사람들에게 즐거움과 놀라움을 선사하는 것이 제 꿈입니다. 사클 API를 통해 프로젝트 정보를 관리하고 있으며, 창의적인 아이디어로 새로운 마법을 연구하고 있습니다.',
    location: '호그와트 마법학교, 영국',
    website: 'https://hogwarts.edu/seungchan',
    // 군대 관련 특별 정보 (마법사 버전)
    militaryInfo: {
      branch: '육군',
      rank: '이등병 (예정)',
      unit: '○○사단 ○○연대 (배정 예정)',
      enlistmentDate: '2025-09-27',
      dischargeDate: '2027-03-28',
      trainingEndDate: '2025-11-03', // 훈련소 18일
      daysServed: (() => {
        const now = new Date();
        const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const enlistmentDate = new Date('2025-09-27T09:00:00+09:00');
        const daysUntilEnlistment = Math.floor((enlistmentDate.getTime() - kstNow.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilEnlistment > 0 ? -daysUntilEnlistment : Math.floor((kstNow.getTime() - enlistmentDate.getTime()) / (1000 * 60 * 60 * 24));
      })(),
      daysRemaining: (() => {
        const now = new Date();
        const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const dischargeDate = new Date('2027-03-28T09:00:00+09:00');
        return Math.floor((dischargeDate.getTime() - kstNow.getTime()) / (1000 * 60 * 60 * 24));
      })(),
      totalServiceDays: 548, // 18개월 복무
      motto: '마법으로 세상을 밝히는 군인이 되겠습니다! ✨🎖️'
    },
    // 사클 API 연동 - 프로젝트 진행 상황 정보
    activeProjects: [
      {
        name: '디지털 마법 카드 게임',
        description: '실제 마술과 디지털 기술을 접목한 인터랙티브 카드 게임',
        category: '게임 개발',
        startDate: '2024-12-01',
        endDate: '2025-03-31',
        currentProgress: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          const start = new Date('2024-12-01T09:00:00+09:00');
          const end = new Date('2025-03-31T23:59:59+09:00');
          const total = end.getTime() - start.getTime();
          const current = kstNow.getTime() - start.getTime();
          return Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
        })(),
        status: '개발 중',
        color: 'purple'
      },
      {
        name: '호그와트 학습 관리 시스템',
        description: '마법학교 학생들을 위한 온라인 학습 플랫폼',
        category: '교육 플랫폼',
        startDate: '2024-09-01',
        endDate: '2025-02-28',
        currentProgress: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          const start = new Date('2024-09-01T09:00:00+09:00');
          const end = new Date('2025-02-28T23:59:59+09:00');
          const total = end.getTime() - start.getTime();
          const current = kstNow.getTime() - start.getTime();
          return Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
        })(),
        status: '완료 예정',
        color: 'indigo'
      },
      {
        name: '마법 트릭 라이브러리',
        description: '다양한 마술 기법과 트릭을 정리한 디지털 라이브러리',
        category: '마법 연구',
        startDate: '2025-02-01',
        endDate: '2025-06-30',
        currentProgress: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          const start = new Date('2025-02-01T09:00:00+09:00');
          const end = new Date('2025-06-30T23:59:59+09:00');
          const total = end.getTime() - start.getTime();
          const current = kstNow.getTime() - start.getTime();
          return Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
        })(),
        status: (() => {
          const now = new Date();
          const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
          return kstNow < new Date('2025-02-01') ? '계획 중' : '연구 중';
        })(),
        color: 'pink'
      }
    ],
    skills: [
      { name: '마술', level: 95, category: 'Performance' },
      { name: '마법학', level: 88, category: 'Academic' },
      { name: '카드 매직', level: 90, category: 'Magic' },
      { name: '멘탈 매직', level: 85, category: 'Magic' },
      { name: '무대 퍼포먼스', level: 80, category: 'Performance' },
      { name: 'JavaScript', level: 70, category: 'Programming' },
      { name: 'React', level: 65, category: 'Frontend' },
      { name: '창의적 사고', level: 92, category: 'Soft Skills' }
    ],
    projects: [
      {
        title: '디지털 마법 카드 게임',
        description: '실제 마술과 디지털 기술을 접목한 인터랙티브 카드 게임',
        tech: ['React', 'TypeScript', 'WebGL', 'Socket.io'],
        status: 'in-progress',
        featured: true,
        deadline: '2025-03-31',
        category: '게임 개발'
      },
      {
        title: '호그와트 학습 관리 시스템',
        description: '마법학교 학생들을 위한 온라인 학습 플랫폼',
        tech: ['Next.js', 'MongoDB', 'Tailwind CSS'],
        status: 'completed',
        featured: true,
        liveUrl: 'https://hogwarts-lms.edu',
        deadline: '2025-02-28',
        category: '교육 플랫폼'
      },
      {
        title: '마법 트릭 라이브러리',
        description: '다양한 마술 기법과 트릭을 정리한 디지털 라이브러리',
        tech: ['Vue.js', 'Firebase', 'PWA'],
        status: 'planned',
        featured: false,
        deadline: '2025-06-30',
        category: '마법 연구'
      }
    ],
    experience: [
      {
        company: '호그와트 마법학교',
        position: '고급 마법반 학생',
        period: '2024.09 - 현재',
        description: '고급 마법 이론과 실전 마법 연구, 마법학과 머글 기술의 융합 연구',
        achievements: ['마법학 우수상 수상', '마법 연구 논문 3편 발표', '머글 기술 융합 프로젝트 주도'],
        isCurrent: true
      },
      {
        company: '매직 서클 엔터테인먼트',
        position: '주니어 마술사',
        period: '2023.06 - 2024.08',
        description: '다양한 이벤트에서 마술 공연 및 마술 교육 프로그램 운영',
        achievements: ['월 평균 20회 공연', '고객 만족도 98% 달성', '신인 마술사상 수상'],
        isCurrent: false
      }
    ],
    socialLinks: {
      instagram: 'https://instagram.com/seungchan_magic',
      website: 'https://hogwarts.edu/seungchan',
      github: 'https://github.com/mushbit'
    },
    recentPosts: [
      {
        content: '호그와트 고급 마법반에서 새로운 변신술을 배웠어요! 머글 기술과 마법의 융합이 정말 흥미롭네요 ✨🪄',
        type: 'text',
        tags: ['마법학', '호그와트', '변신술'],
        likes: 45,
        createdAt: '2025-01-20T00:00:00.000Z'
      },
      {
        content: '오늘 마법학과 프로그래밍을 접목한 새로운 프로젝트를 시작했습니다! 디지털 마법의 세계로 떠나보세요 🎮✨',
        type: 'project',
        linkUrl: 'https://github.com/mushbit/digital-magic',
        tags: ['프로젝트', '마법', '프로그래밍', 'React'],
        likes: 67,
        createdAt: '2025-01-18T00:00:00.000Z'
      },
      {
        content: '입대 전까지 마법 실력을 더욱 갈고 닦아야겠어요! 군대에서도 마법으로 동료들에게 즐거움을 줄 수 있을까요? 🎖️✨',
        type: 'text',
        tags: ['군입대', '마법', '목표'],
        likes: 34,
        createdAt: '2025-01-15T00:00:00.000Z'
      },
      {
        content: '사클 API 연동 테스트 중입니다. 프로젝트 관리가 훨씬 편해졌어요! 🚀',
        type: 'text',
        tags: ['개발', 'API', 'SACL'],
        likes: 23,
        createdAt: '2025-01-12T00:00:00.000Z'
      }
    ],
    viewCount: 89,
    likesReceived: 234,
    followers: [],
    following: []
  },
  hanul: {
    _id: '507f1f77bcf86cd799439014',
    userId: {
      _id: '507f1f77bcf86cd799439014',
      username: 'hanul',
      email: 'hanul@rangu.fam',
      role: '강한울 (대한민국 대학 입시 예정)',
      profileImage: null
    },
    username: 'hanul',
    intro: 'Hanul',
    bio: '2025년 3번째 대학입시에 도전할 예정입니다. 교육계열-이공계열에서 강한 흥미와 능력을 보이고 있습니다.',
    location: '대한민국',
    website: '',
    // 입시 관련 특별 정보
    examInfo: {
      targetDate: '2026-01-01', // 입시 종료 기한
      dDayDate: '2025-09-07', // D-Day 9월 7일
      school: '미정',
      category: '이공-교육 계열',
      attemptNumber: 3, // 3번째 도전
      status: '입시 준비 중',
      daysUntilExam: (() => {
        const now = new Date();
        const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const dDayDate = new Date('2025-09-07T09:00:00+09:00');
        return Math.floor((dDayDate.getTime() - kstNow.getTime()) / (1000 * 60 * 60 * 24));
      })(),
      daysUntilDeadline: (() => {
        const now = new Date();
        const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const deadline = new Date('2026-01-01T23:59:59+09:00');
        return Math.floor((deadline.getTime() - kstNow.getTime()) / (1000 * 60 * 60 * 24));
      })(),
      motto: '세 번째 도전으로 꿈을 이루자! 🎯'
    },
    skills: [
      { name: '한국사', level: 70, category: '역사학' },
      { name: '세계사', level: 50, category: '역사학' },
      { name: '정보교육', level: 50, category: '교육학' },
      { name: '역사교육', level: 70, category: '교육학' },
      { name: '교육심리', level: 65, category: '심리학' }
    ],
    projects: [
      {
        title: '2025년 대학입시 준비',
        description: '교육계열-이공계열 대학 입시를 위한 체계적인 학습 계획',
        tech: ['학습계획', '시간관리', '목표설정'],
        status: 'in-progress',
        featured: true,
        deadline: '2026-01-01',
        category: '입시 준비'
      },
      {
        title: 'D-Day 목표 달성',
        description: '9월 7일 목표 달성을 위한 단계별 학습 프로젝트',
        tech: ['집중학습', '성과측정', '피드백'],
        status: 'in-progress',
        featured: true,
        deadline: '2025-09-07',
        category: '단기 목표'
      }
    ],
    experience: [
      {
        position: '입시 준비생',
        company: '개인 학습',
        period: '2024.01 - 현재',
        startDate: '2024-01-01',
        endDate: '2026-01-01',
        isCurrent: true,
        description: '교육계열과 이공계열 분야에서의 대학 입시를 준비하며 체계적인 학습을 진행하고 있습니다.',
        achievements: [
          '3번째 입시 도전 계획 수립',
          '교육계열-이공계열 진로 방향 설정',
          '한국사, 역사교육 분야 집중 학습',
          '체계적인 학습 계획 및 실행'
        ]
      }
    ],
    socialLinks: {
      blog: '',
      instagram: '',
      github: ''
    },
    recentPosts: [
      {
        content: '2025년 3번째 입시 도전을 시작합니다! 교육계열과 이공계열에서 새로운 가능성을 찾고 있어요. D-Day 9월 7일까지 열심히 준비하겠습니다! 🎓',
        type: 'text',
        likes: 42,
        tags: ['입시준비', 'D-Day', '교육계열'],
        createdAt: '2025-01-15T10:00:00Z'
      },
      {
        content: '한국사와 역사교육 공부가 정말 흥미로워요. 특히 교육심리 분야도 함께 공부하니 더욱 재미있네요! 📚',
        type: 'text',
        likes: 28,
        tags: ['한국사', '역사교육', '교육심리'],
        createdAt: '2025-01-10T15:30:00Z'
      },
      {
        content: '입시 종료 기한까지 체계적으로 준비해서 꼭 좋은 결과 얻고 싶어요. 이번이 마지막 기회라고 생각하고 최선을 다하겠습니다! 💪',
        type: 'text',
        likes: 35,
        tags: ['입시', '목표달성', '최선'],
        createdAt: '2025-01-05T20:15:00Z'
      }
    ],
    followers: [],
    following: [],
    viewCount: 0,
    likesReceived: 0
  },
  heeyeol: {
    _id: '507f1f77bcf86cd799439016',
    userId: {
      _id: '507f1f77bcf86cd799439016',
      username: 'heeyeol',
      email: 'heeyeol@rangu.fam',
      role: '임시멤버 윤희열',
      profileImage: null
    },
    username: 'heeyeol',
    intro: '임시멤버 윤희열',
    bio: '임시멤버 윤희열입니다.',
    location: '대한민국',
    website: '',
    skills: [],
    projects: [],
    experience: [],
    socialLinks: {},
    recentPosts: [],
    followers: [],
    following: [],
    viewCount: 0,
    likesReceived: 0
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log('프로필 API 요청:', id)
    
    // 임시로 더미 데이터 사용 (DB 연결 문제 해결까지)
    let profile = dummyProfiles[id]
    
    // jinkyu -> jingyu 별칭 처리
    if (!profile && id === 'jinkyu') {
      profile = dummyProfiles['jingyu']
    }
    
    console.log('더미 프로필 찾기 결과:', !!profile)
    console.log('사용 가능한 더미 프로필 키:', Object.keys(dummyProfiles))
    
    if (!profile) {
      // DB 연결 시도
      try {
        await dbConnect()

        // ID가 ObjectId 형식인지 username인지 확인
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id)
        
        let dbProfile
        if (isObjectId) {
          // ObjectId로 조회 (userId 기준)
          dbProfile = await Profile.findOne({ userId: id })
            .populate('userId', 'username email profileImage role')
            .populate('followers', 'username')
            .populate('following', 'username')
            .lean()
        } else {
          // username으로 조회
          dbProfile = await Profile.findOne({ username: id })
            .populate('userId', 'username email profileImage role')
            .populate('followers', 'username')
            .populate('following', 'username')
            .lean()
        }

        if (!dbProfile) {
          console.log('DB에서도 프로필을 찾을 수 없음:', id)
          return NextResponse.json(
            { success: false, error: '프로필을 찾을 수 없습니다.' },
            { status: 404 }
          )
        }

        // 조회수 증가
        await Profile.findByIdAndUpdate((dbProfile as any)._id, {
          $inc: { viewCount: 1 }
        })

        profile = dbProfile
        console.log('DB에서 프로필 로드 성공:', id)
      } catch (dbError) {
        console.log('DB 연결 실패, 더미 데이터 없음:', dbError)
        return NextResponse.json(
          { success: false, error: '프로필을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
    }

    // 더미 데이터의 경우 조회수 증가 스킵 (DB 연결 없이는 불가능)

    // 통계 계산
    const stats = {
      projects: (profile as any).projects?.length || 0,
      followers: (profile as any).followers?.length || 0,
      following: (profile as any).following?.length || 0,
      posts: (profile as any).recentPosts?.length || 0,
      views: (profile as any).viewCount || 0
    }

    console.log('프로필 API 응답 준비:', { success: true, profileExists: !!profile })
    
    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        stats
      }
    })

  } catch (error) {
    console.error('프로필 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '프로필을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// PUT - 프로필 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    console.log('PUT 요청 받음:', { id, body })
    
    // 더미 데이터 사용 중인지 확인 (임시로 더미 프로필 ID들)
    const dummyProfileIds = ['jaewon', 'minseok', 'jingyu', 'hanul', 'seungchan', 'heeyeol']
    
    if (dummyProfileIds.includes(id)) {
      // 더미 데이터 실제 업데이트
      console.log('더미 데이터 프로필 실제 업데이트')
      
      if (!dummyProfiles[id]) {
        return NextResponse.json(
          { success: false, error: '프로필을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      
      // 기존 더미 프로필 데이터를 업데이트
      const existingProfile = dummyProfiles[id]
      
      // 업데이트할 필드들만 병합
      Object.keys(body).forEach(key => {
        if (body[key] !== undefined) {
          existingProfile[key] = body[key]
        }
      })
      
      // 통계 재계산
      const stats = {
        projects: existingProfile.projects?.length || 0,
        followers: existingProfile.followers?.length || 0,
        following: existingProfile.following?.length || 0,
        posts: existingProfile.recentPosts?.length || 0,
        views: existingProfile.viewCount || 0
      }
      
      console.log('업데이트된 더미 프로필:', existingProfile)
      
      return NextResponse.json({
        success: true,
        message: '프로필이 성공적으로 업데이트되었습니다.',
        profile: {
          ...existingProfile,
          stats
        }
      })
    }
    
    await dbConnect()
    
    // ID가 ObjectId 형식인지 username인지 확인
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id)
    
    let profile
    if (isObjectId) {
      profile = await Profile.findOne({ userId: id })
    } else {
      profile = await Profile.findOne({ username: id })
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: '프로필을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 업데이트할 수 있는 필드들만 필터링
    const allowedFields = [
      'intro', 'bio', 'location', 'website', 'phone', 'birthdate',
      'skills', 'projects', 'experience', 'education', 'socialLinks',
      'recentPosts', 'isPublic', 'showEmail', 'showPhone', 'allowComments'
    ]

    const filteredUpdate: any = {}
    Object.keys(body).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdate[key] = body[key]
      }
    })

    // 프로젝트 수 업데이트
    if (filteredUpdate.projects) {
      filteredUpdate.projectCount = filteredUpdate.projects.length
    }

    // 프로필 업데이트
    const updatedProfile = await Profile.findByIdAndUpdate(
      profile._id,
      filteredUpdate,
      { new: true, runValidators: true }
    )
      .populate('userId', 'username email profileImage role')
      .populate('followers', 'username')
      .populate('following', 'username')
      .lean()

    if (!updatedProfile) {
      return NextResponse.json(
        { success: false, error: '프로필 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 통계 계산
    const stats = {
      projects: (updatedProfile as any).projects?.length || 0,
      followers: (updatedProfile as any).followers?.length || 0,
      following: (updatedProfile as any).following?.length || 0,
      posts: (updatedProfile as any).recentPosts?.length || 0,
      views: (updatedProfile as any).viewCount || 0
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...updatedProfile,
        stats
      }
    })

  } catch (error) {
    console.error('프로필 업데이트 오류:', error)
    return NextResponse.json(
      { success: false, error: '프로필 업데이트에 실패했습니다.' },
      { status: 500 }
    )
  }
}