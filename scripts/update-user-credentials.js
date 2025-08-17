const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
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

const User = mongoose.models.User || mongoose.model('User', UserSchema)

// 사용자 정보 업데이트
const userCredentials = [
  {
    oldUsername: '강한울',
    username: 'kanghu05',
    password: 'rkdgksdnf05',
    email: 'hanul@rangu.fam',
    role: '강한울 (대한민국 대학 입시 예정)'
  },
  {
    oldUsername: '이승찬',
    username: 'mushbit',
    password: '-5MNa4skn*ntPQQ',
    email: 'seungchan@rangu.fam',
    role: '이승찬 (마술사 & 호그와트 재학생)'
  },
  {
    oldUsername: '정재원',
    username: 'jung051004',
    password: 'wodnjsjung050727!',
    email: 'jaewon@rangu.fam',
    role: '정재원 (소프트웨어 엔지니어 & 패션 모델)'
  },
  {
    oldUsername: '정민석',
    username: 'qudtls',
    password: 'qudtlstoRl',
    email: 'minseok@rangu.fam',
    role: '정민석 (IMI Switzerland)'
  }
]

async function updateUserCredentials() {
  try {
    console.log('🔐 사용자 로그인 정보 업데이트를 시작합니다...\n')

    for (const userData of userCredentials) {
      console.log(`\n👤 ${userData.oldUsername || userData.username} 정보 업데이트 중...`)
      
      // 기존 사용자 찾기 (username 또는 email로)
      let existingUser = await User.findOne({
        $or: [
          { username: userData.oldUsername || userData.username },
          { username: userData.username },
          { email: userData.email }
        ]
      })

      if (existingUser) {
        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(userData.password, 10)
        
        // 사용자 정보 업데이트
        await User.findByIdAndUpdate(existingUser._id, {
          username: userData.username,
          password: hashedPassword,
          email: userData.email,
          role: userData.role
        })
        
        console.log(`✅ ${userData.username} 업데이트 완료`)
        console.log(`   - 새 사용자명: ${userData.username}`)
        console.log(`   - 이메일: ${userData.email}`)
        console.log(`   - 역할: ${userData.role}`)
      } else {
        // 새 사용자 생성
        const hashedPassword = await bcrypt.hash(userData.password, 10)
        
        const newUser = new User({
          username: userData.username,
          password: hashedPassword,
          email: userData.email,
          role: userData.role,
          profileImage: null
        })
        
        await newUser.save()
        console.log(`✨ ${userData.username} 새 사용자 생성 완료`)
        console.log(`   - 사용자명: ${userData.username}`)
        console.log(`   - 이메일: ${userData.email}`)
        console.log(`   - 역할: ${userData.role}`)
      }
    }

    console.log('\n🎉 모든 사용자 로그인 정보 업데이트가 완료되었습니다!')
    console.log('\n📋 업데이트된 로그인 정보:')
    console.log('강한울: kanghu05 / rkdgksdnf05')
    console.log('이승찬: mushbit / -5MNa4skn*ntPQQ')
    console.log('정재원: jung051004 / wodnjsjung050727!')
    console.log('정민석: qudtls / qudtlstoRl')

  } catch (error) {
    console.error('❌ 사용자 정보 업데이트 중 오류:', error)
  }
}

async function main() {
  await connectDB()
  await updateUserCredentials()
  await mongoose.connection.close()
  console.log('\n✅ 사용자 로그인 정보 업데이트 작업 완료')
}

if (require.main === module) {
  main()
}

module.exports = { updateUserCredentials }
