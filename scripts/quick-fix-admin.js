// MongoDB Atlas 또는 원격 MongoDB 연결 시도
const mongoose = require('mongoose')

async function quickFixAdmin() {
  // 가능한 MongoDB URI들을 시도
  const uris = [
    // Atlas URI (제공받은 URI)
    'mongodb+srv://gabrieljay0727:1234@cluster0.x1swcgo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
    // 환경변수
    process.env.MONGODB_URI,
    process.env.DATABASE_URL,
    // 로컬 스타일
    'mongodb://localhost:27017/rangu-fam',
    'mongodb://127.0.0.1:27017/rangu-fam',
    'mongodb://localhost:27017/rangufam',
    'mongodb://127.0.0.1:27017/rangufam'
  ].filter(Boolean)

  console.log('🔍 MongoDB 연결 시도 중...')
  
  for (const uri of uris) {
    try {
      console.log(`연결 시도: ${uri.replace(/\/\/.*@/, '//***@')}`)
      
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      })
      
      console.log('✅ MongoDB 연결 성공!')
      
      // 위키 사용자 스키마 정의 (간단 버전)
      const WikiUser = mongoose.model('WikiUser', new mongoose.Schema({
        username: String,
        role: String,
        permissions: Object
      }))
      
      // gabriel0727 사용자 찾기
      const user = await WikiUser.findOne({ username: 'gabriel0727' })
      
      if (!user) {
        console.log('❌ gabriel0727 사용자를 찾을 수 없습니다.')
        console.log('먼저 /wiki/register에서 계정을 생성하세요.')
        return
      }
      
      console.log('📋 현재 gabriel0727 상태:')
      console.log('- 역할:', user.role)
      console.log('- 권한:', user.permissions)
      
      // 관리자 권한 부여
      const result = await WikiUser.updateOne(
        { username: 'gabriel0727' },
        {
          $set: {
            role: 'admin',
            permissions: {
              canEdit: true,
              canDelete: true,
              canProtect: true,
              canBan: true,
              canManageUsers: true
            }
          }
        }
      )
      
      if (result.modifiedCount > 0) {
        console.log('🎉 gabriel0727에게 관리자 권한이 성공적으로 부여되었습니다!')
        console.log('이제 위키를 새로고침하면 운영자 버튼이 보일 것입니다.')
      } else {
        console.log('⚠️ 업데이트가 적용되지 않았습니다.')
      }
      
      await mongoose.disconnect()
      return
      
    } catch (error) {
      console.log(`연결 실패: ${error.message}`)
    }
  }
  
  console.log('\n❌ 모든 MongoDB 연결 시도가 실패했습니다.')
  console.log('\n🔧 수동 해결 방법:')
  console.log('1. MongoDB Compass 또는 MongoDB Shell 사용')
  console.log('2. 다음 명령어 실행:')
  console.log('')
  console.log('use rangu-fam')
  console.log('db.wikiusers.updateOne(')
  console.log('  { username: "gabriel0727" },')
  console.log('  { $set: {')
  console.log('    role: "admin",')
  console.log('    "permissions.canEdit": true,')
  console.log('    "permissions.canDelete": true,')
  console.log('    "permissions.canProtect": true,')
  console.log('    "permissions.canBan": true,')
  console.log('    "permissions.canManageUsers": true')
  console.log('  } }')
  console.log(')')
  console.log('')
  console.log('3. 위키 페이지 새로고침')
}

quickFixAdmin().catch(console.error)
