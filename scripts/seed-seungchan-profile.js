const mongoose = require('mongoose')
require('dotenv').config()

// MongoDB 연결
async function connectDB() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI
    if (!MONGODB_URI) {
      console.log('MONGODB_URI 환경변수가 없습니다. 기본 URI 사용 시도...')
      await mongoose.connect('mongodb://localhost:27017/rangu-fam')
    } else {
      await mongoose.connect(MONGODB_URI)
    }
    console.log('MongoDB 연결 성공')
  } catch (error) {
    console.error('MongoDB 연결 실패:', error)
    console.log('환경 변수를 확인하거나 MongoDB 서버 상태를 확인해주세요.')
    process.exit(1)
  }
}

// 스키마 정의
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'member' },
  profileImage: { type: String },
}, { timestamps: true })

const SkillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: { type: Number, required: true, min: 0, max: 100 },
  category: { type: String, required: true }
})

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  tech: [{ type: String }],
  image: { type: String },
  liveUrl: { type: String },
  githubUrl: { type: String },
  featured: { type: Boolean, default: false },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { type: String, enum: ['completed', 'in-progress', 'planned'], default: 'completed' }
}, { timestamps: true })

const ExperienceSchema = new mongoose.Schema({
  company: { type: String, required: true },
  position: { type: String, required: true },
  period: { type: String, required: true },
  description: { type: String },
  skills: [{ type: String }],
  achievements: [{ type: String }],
  location: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  isCurrent: { type: Boolean, default: false }
}, { timestamps: true })

const SocialLinksSchema = new mongoose.Schema({
  github: { type: String },
  linkedin: { type: String },
  website: { type: String },
  instagram: { type: String },
  twitter: { type: String },
  blog: { type: String }
})

const RecentPostSchema = new mongoose.Schema({
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'link', 'project'], default: 'text' },
  mediaUrl: { type: String },
  linkUrl: { type: String },
  tags: [{ type: String }],
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  isPrivate: { type: Boolean, default: false }
}, { timestamps: true })

const ProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  username: { type: String, required: true, unique: true },
  intro: { type: String, default: '' },
  bio: { type: String, default: '' },
  location: { type: String, default: '' },
  website: { type: String },
  phone: { type: String },
  birthdate: { type: Date },
  // 군대 관련 정보
  militaryInfo: {
    branch: { type: String },
    rank: { type: String },
    unit: { type: String },
    enlistmentDate: { type: Date },
    dischargeDate: { type: Date },
    trainingEndDate: { type: Date },
    daysServed: { type: Number },
    daysRemaining: { type: Number },
    totalServiceDays: { type: Number },
    motto: { type: String }
  },
  skills: [SkillSchema],
  projects: [ProjectSchema],
  experience: [ExperienceSchema],
  education: [],
  socialLinks: SocialLinksSchema,
  recentPosts: [RecentPostSchema],
  viewCount: { type: Number, default: 0 },
  likesReceived: { type: Number, default: 0 },
  projectCount: { type: Number, default: 0 },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPublic: { type: Boolean, default: true },
  showEmail: { type: Boolean, default: false },
  showPhone: { type: Boolean, default: false },
  allowComments: { type: Boolean, default: true }
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', UserSchema)
const Profile = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema)

async function seedSeungchanProfile() {
  try {
    // 기존 이승찬 데이터 확인
    let seungchanUser = await User.findOne({ username: 'mushbit' })
    
    if (!seungchanUser) {
      // 사용자 생성
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash('-5MNa4skn*ntPQQ', 10)
      
      seungchanUser = new User({
        username: 'mushbit',
        email: 'seungchan@rangu.fam',
        password: hashedPassword,
        role: 'member',
        profileImage: null
      })
      await seungchanUser.save()
      console.log('이승찬 사용자 생성 완료')
    } else {
      console.log('이승찬 사용자 이미 존재')
    }

    // 기존 프로필 확인 및 삭제
    let seungchanProfile = await Profile.findOne({ userId: seungchanUser._id })
    
    if (seungchanProfile) {
      await Profile.findByIdAndDelete(seungchanProfile._id)
      console.log('기존 이승찬 프로필 삭제')
    }

    // 군입대/전역 디데이 계산
    const enlistmentDate = new Date('2025-09-27') // 예정 입대일
    const dischargeDate = new Date('2027-03-28')  // 예정 전역일 (18개월 복무)
    const trainingEndDate = new Date('2025-11-03') // 훈련소 수료 예정일 (18일)
    const today = new Date()
    
    const totalServiceDays = Math.ceil((dischargeDate - enlistmentDate) / (1000 * 60 * 60 * 24))
    let daysServed, daysRemaining
    
    if (today < enlistmentDate) {
      // 아직 입대 전
      daysServed = -Math.ceil((enlistmentDate - today) / (1000 * 60 * 60 * 24))
      daysRemaining = totalServiceDays
    } else if (today >= dischargeDate) {
      // 전역 완료
      daysServed = totalServiceDays
      daysRemaining = 0
    } else {
      // 복무 중
      daysServed = Math.ceil((today - enlistmentDate) / (1000 * 60 * 60 * 24))
      daysRemaining = Math.ceil((dischargeDate - today) / (1000 * 60 * 60 * 24))
    }

    // 새 프로필 생성
    const profileData = {
      userId: seungchanUser._id,
      username: 'mushbit',
      intro: '마술사 & 호그와트 고급 마법반 재학생',
      bio: '현재 호그와트에 재학 중이며, 고급 마법반에서 공부하고 있습니다. 마술과 마법을 통해 사람들에게 즐거움과 놀라움을 선사하는 것이 제 꿈입니다. 사클 API를 통해 프로젝트 정보를 관리하고 있으며, 창의적인 아이디어로 새로운 마법을 연구하고 있습니다.',
      location: '호그와트 마법학교, 영국',
      website: 'https://hogwarts.edu/seungchan',
      militaryInfo: {
        branch: '육군',
        rank: '이등병 (예정)',
        unit: '○○사단 ○○연대 (배정 예정)',
        enlistmentDate: enlistmentDate,
        dischargeDate: dischargeDate,
        trainingEndDate: trainingEndDate,
        daysServed: daysServed,
        daysRemaining: daysRemaining,
        totalServiceDays: totalServiceDays,
        motto: '마법으로 세상을 밝히는 군인이 되겠습니다! ✨🎖️'
      },
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
          startDate: new Date('2024-12-01'),
          githubUrl: 'https://github.com/mushbit/digital-magic'
        },
        {
          title: '호그와트 학습 관리 시스템',
          description: '마법학교 학생들을 위한 온라인 학습 플랫폼',
          tech: ['Next.js', 'MongoDB', 'Tailwind CSS'],
          status: 'completed',
          featured: true,
          startDate: new Date('2024-09-01'),
          endDate: new Date('2024-11-30'),
          liveUrl: 'https://hogwarts-lms.edu'
        },
        {
          title: '마법 트릭 라이브러리',
          description: '다양한 마술 기법과 트릭을 정리한 디지털 라이브러리',
          tech: ['Vue.js', 'Firebase', 'PWA'],
          status: 'planned',
          featured: false,
          startDate: new Date('2025-02-01')
        }
      ],
      experience: [
        {
          company: '호그와트 마법학교',
          position: '고급 마법반 학생',
          period: '2024.09 - 현재',
          description: '고급 마법 이론과 실전 마법 연구, 마법학과 머글 기술의 융합 연구',
          skills: ['마법학', '변신술', '마법약학', '점술학'],
          achievements: ['마법학 우수상 수상', '마법 연구 논문 3편 발표', '머글 기술 융합 프로젝트 주도'],
          location: '호그와트, 영국',
          startDate: new Date('2024-09-01'),
          isCurrent: true
        },
        {
          company: '매직 서클 엔터테인먼트',
          position: '주니어 마술사',
          period: '2023.06 - 2024.08',
          description: '다양한 이벤트에서 마술 공연 및 마술 교육 프로그램 운영',
          skills: ['무대 마술', '클로즈업 매직', '퍼포먼스', '관객 소통'],
          achievements: ['월 평균 20회 공연', '고객 만족도 98% 달성', '신인 마술사상 수상'],
          location: '서울, 대한민국',
          startDate: new Date('2023-06-01'),
          endDate: new Date('2024-08-31'),
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
          createdAt: new Date('2025-01-20')
        },
        {
          content: '오늘 마법학과 프로그래밍을 접목한 새로운 프로젝트를 시작했습니다! 디지털 마법의 세계로 떠나보세요 🎮✨',
          type: 'project',
          linkUrl: 'https://github.com/mushbit/digital-magic',
          tags: ['프로젝트', '마법', '프로그래밍', 'React'],
          likes: 67,
          createdAt: new Date('2025-01-18')
        },
        {
          content: '입대 전까지 마법 실력을 더욱 갈고 닦아야겠어요! 군대에서도 마법으로 동료들에게 즐거움을 줄 수 있을까요? 🎖️✨',
          type: 'text',
          tags: ['군입대', '마법', '목표'],
          likes: 34,
          createdAt: new Date('2025-01-15')
        },
        {
          content: '사클 API 연동 테스트 중입니다. 프로젝트 관리가 훨씬 편해졌어요! 🚀',
          type: 'text',
          tags: ['개발', 'API', 'SACL'],
          likes: 23,
          createdAt: new Date('2025-01-12')
        }
      ],
      viewCount: 89,
      likesReceived: 234,
      projectCount: 3,
      followers: [],
      following: [],
      isPublic: true,
      showEmail: false,
      showPhone: false,
      allowComments: true
    }

    const newProfile = new Profile(profileData)
    await newProfile.save()

    console.log('이승찬 프로필 생성 완료!')
    console.log('프로필 ID:', newProfile._id)
    console.log('사용자 ID:', seungchanUser._id)
    console.log('군입대 D-Day:', daysServed < 0 ? `D${daysServed}` : `D-${daysRemaining}`)

  } catch (error) {
    console.error('시드 실행 중 오류:', error)
  }
}

async function main() {
  await connectDB()
  await seedSeungchanProfile()
  await mongoose.connection.close()
  console.log('이승찬 프로필 시드 작업 완료')
}

if (require.main === module) {
  main()
}

module.exports = { seedSeungchanProfile }
