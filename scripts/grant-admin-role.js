const mongoose = require('mongoose')

// 위키 사용자 스키마 정의
const WikiUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  displayName: { type: String },
  avatar: { type: String },
  bio: { type: String },
  signature: { type: String },
  role: { 
    type: String, 
    enum: ['viewer', 'editor', 'moderator', 'admin', 'owner'],
    default: 'editor'
  },
  permissions: {
    canEdit: { type: Boolean, default: true },
    canDelete: { type: Boolean, default: false },
    canProtect: { type: Boolean, default: false },
    canBan: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false }
  },
  edits: { type: Number, default: 0 },
  pagesCreated: { type: Number, default: 0 },
  discussionPosts: { type: Number, default: 0 },
  reputation: { type: Number, default: 0 },
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    timezone: { type: String, default: 'Asia/Seoul' },
    emailNotifications: { type: Boolean, default: true },
    showEmail: { type: Boolean, default: false },
    autoWatchPages: { type: Boolean, default: true }
  },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String },
  banExpiry: { type: Date },
  lastLogin: { type: Date },
  lastActivity: { type: Date },
  mainUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
})

const WikiUser = mongoose.model('WikiUser', WikiUserSchema)

async function grantAdminRole(username, role = 'moderator') {
  try {
    // MongoDB URI 시도 (여러 가능성 체크)
    const possibleUris = [
      'mongodb://localhost:27017/rangu-fam',
      'mongodb://127.0.0.1:27017/rangu-fam',
      'mongodb://localhost:27017/rangufam',
      'mongodb://127.0.0.1:27017/rangufam'
    ]
    
    let connected = false
    for (const uri of possibleUris) {
      try {
        console.log(`MongoDB 연결 시도: ${uri}`)
        await mongoose.connect(uri, { 
          serverSelectionTimeoutMS: 3000,
          connectTimeoutMS: 3000
        })
        console.log('MongoDB 연결 성공!')
        connected = true
        break
      } catch (error) {
        console.log(`연결 실패: ${uri}`)
      }
    }
    
    if (!connected) {
      console.log('MongoDB에 연결할 수 없습니다.')
      console.log('수동으로 MongoDB에서 다음 명령을 실행하세요:')
      console.log(`db.wikiusers.updateOne(`)
      console.log(`  { username: "${username}" },`)
      console.log(`  { $set: { `)
      console.log(`    role: "${role}",`)
      console.log(`    "permissions.canEdit": true,`)
      console.log(`    "permissions.canDelete": true,`)
      console.log(`    "permissions.canProtect": true,`)
      console.log(`    "permissions.canBan": true,`)
      console.log(`    "permissions.canManageUsers": true`)
      console.log(`  } }`)
      console.log(`)`)
      return
    }
    
    console.log(`${username} 사용자에게 ${role} 권한 부여 중...`)
    
    // 사용자 찾기
    const user = await WikiUser.findOne({ username: username })
    
    if (!user) {
      console.log(`❌ ${username} 사용자를 찾을 수 없습니다.`)
      console.log('먼저 위키에 회원가입하세요: /wiki/register')
      await mongoose.disconnect()
      return
    }
    
    // 권한 업데이트
    const updateData = {
      role: role,
      permissions: {
        canEdit: true,
        canDelete: role === 'admin' || role === 'owner' || role === 'moderator',
        canProtect: role === 'admin' || role === 'owner' || role === 'moderator',
        canBan: role === 'admin' || role === 'owner' || role === 'moderator',
        canManageUsers: role === 'admin' || role === 'owner' || role === 'moderator'
      }
    }
    
    await WikiUser.findByIdAndUpdate(user._id, updateData)
    
    console.log(`✅ ${username} 사용자에게 ${role} 권한이 부여되었습니다!`)
    console.log('새로운 권한:')
    console.log('- 역할:', role)
    console.log('- 편집 권한:', updateData.permissions.canEdit)
    console.log('- 삭제 권한:', updateData.permissions.canDelete)
    console.log('- 보호 권한:', updateData.permissions.canProtect)
    console.log('- 차단 권한:', updateData.permissions.canBan)
    console.log('- 사용자 관리 권한:', updateData.permissions.canManageUsers)
    
    await mongoose.disconnect()
    console.log('\n🎉 이제 위키에 다시 로그인하면 운영자 버튼이 표시됩니다!')
    
  } catch (error) {
    console.error('오류 발생:', error)
  }
}

// 명령줄 인수에서 사용자명과 역할 가져오기
const username = process.argv[2] || 'gabriel0727'
const role = process.argv[3] || 'moderator'

console.log(`👑 ${username}에게 ${role} 권한을 부여합니다...`)
grantAdminRole(username, role)