const mongoose = require('mongoose')
require('dotenv').config()

// MongoDB 연결
async function connectDB() {
  try {
    // 기존 API와 같은 방식으로 연결
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

// 스키마 정의 (간단한 버전)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
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

async function seedJaewonProfile() {
  try {
    // 기존 정재원 데이터 확인
    let jaewonUser = await User.findOne({ username: 'jaewon' })
    
    if (!jaewonUser) {
      // 사용자 생성
      jaewonUser = new User({
        username: 'jaewon',
        email: 'jaewon@rangu.fam',
        role: '소프트웨어 엔지니어 & 패션 모델',
        profileImage: null
      })
      await jaewonUser.save()
      console.log('정재원 사용자 생성 완료')
    } else {
      console.log('정재원 사용자 이미 존재')
    }

    // 기존 프로필 확인
    let jaewonProfile = await Profile.findOne({ userId: jaewonUser._id })
    
    if (jaewonProfile) {
      // 기존 프로필 업데이트
      await Profile.findByIdAndDelete(jaewonProfile._id)
      console.log('기존 정재원 프로필 삭제')
    }

    // 새 프로필 생성
    const profileData = {
      userId: jaewonUser._id,
      username: 'jaewon',
      intro: '소프트웨어 엔지니어 & 패션 모델',
      bio: '코딩과 패션을 사랑하는 다재다능한 개발자입니다. 기술과 미학의 완벽한 조화를 추구하며, 사용자 경험을 최우선으로 하는 개발을 지향합니다.',
      location: '서울, 대한민국',
      website: 'https://jaewon.dev',
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
          title: 'Portfolio Website',
          description: '개인 포트폴리오 및 블로그 사이트',
          tech: ['React', 'Gatsby', 'GraphQL', 'Styled Components'],
          status: 'completed',
          featured: true,
          liveUrl: 'https://jaewon.dev'
        },
        {
          title: 'Fashion Gallery',
          description: '패션 작품 갤러리 웹앱',
          tech: ['Vue.js', 'Firebase', 'Nuxt.js'],
          status: 'in-progress',
          featured: false
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
        },
        {
          company: 'Fashion Model Agency',
          position: '패션 모델',
          period: '2022.01 - 현재',
          description: '브랜드 모델링 및 패션쇼 참여',
          achievements: ['주요 브랜드 5개 계약', '패션위크 참여'],
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
          createdAt: new Date('2025-01-20')
        },
        {
          content: '오늘 패션쇼 촬영이 있었어요. 기술과 패션의 만남이 정말 흥미롭네요! 📸',
          type: 'image',
          mediaUrl: '/images/jaewon-fashion.jpg',
          tags: ['패션', '모델링', '촬영'],
          likes: 67,
          createdAt: new Date('2025-01-18')
        },
        {
          content: 'TypeScript의 새로운 기능들을 정리한 블로그 포스트를 올렸습니다.',
          type: 'link',
          linkUrl: 'https://jaewon.dev/blog/typescript-new-features',
          tags: ['TypeScript', '개발', '블로그'],
          likes: 23,
          createdAt: new Date('2025-01-15')
        }
      ],
      viewCount: 156,
      likesReceived: 128,
      projectCount: 3,
      followers: [],
      following: [],
      isPublic: true,
      showEmail: true,
      showPhone: false,
      allowComments: true
    }

    const newProfile = new Profile(profileData)
    await newProfile.save()

    console.log('정재원 프로필 생성 완료!')
    console.log('프로필 ID:', newProfile._id)
    console.log('사용자 ID:', jaewonUser._id)

  } catch (error) {
    console.error('시드 실행 중 오류:', error)
  }
}

async function main() {
  await connectDB()
  await seedJaewonProfile()
  await mongoose.connection.close()
  console.log('시드 작업 완료')
}

if (require.main === module) {
  main()
}

module.exports = { seedJaewonProfile }