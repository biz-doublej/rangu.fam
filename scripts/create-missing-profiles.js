const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// User 모델 정의
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  name: String,
  bio: String
});

const User = mongoose.model('User', userSchema);

// Profile 모델 정의  
const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  displayName: String,
  bio: String,
  avatar: String,
  socialLinks: {
    github: String,
    twitter: String,
    instagram: String
  },
  stats: {
    posts: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    likes: { type: Number, default: 0 }
  },
  preferences: {
    theme: { type: String, default: 'dark' },
    notifications: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Profile = mongoose.model('Profile', profileSchema);

async function createMissingProfiles() {
  try {
    console.log('MongoDB Atlas에 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('연결 성공!');

    // 모든 사용자 조회
    const users = await User.find({});
    console.log(`총 ${users.length}명의 사용자 발견`);

    // 기존 프로필들 조회  
    const existingProfiles = await Profile.find({});
    const existingUserIds = existingProfiles.map(p => p.userId);
    console.log(`기존 프로필 ${existingProfiles.length}개`);

    let createdCount = 0;

    for (const user of users) {
      const userIdStr = user._id.toString();
      
      // 이미 프로필이 있는지 확인
      if (existingUserIds.includes(userIdStr)) {
        console.log(`✓ ${user.username}: 프로필 이미 존재`);
        continue;
      }

      try {
        // 새 프로필 생성
        const newProfile = new Profile({
          userId: userIdStr,
          displayName: user.name || user.username,
          bio: user.bio || `${user.username}의 프로필`,
          avatar: null,
          socialLinks: {},
          stats: {
            posts: 0,
            comments: 0, 
            likes: 0
          },
          preferences: {
            theme: 'dark',
            notifications: true
          }
        });

        await newProfile.save();
        console.log(`✅ ${user.username}: 프로필 생성 완료`);
        createdCount++;

      } catch (error) {
        console.error(`❌ ${user.username}: 프로필 생성 실패 -`, error.message);
      }
    }

    console.log(`\n📊 새로 생성된 프로필: ${createdCount}개`);
    
    // 최종 확인
    const finalProfileCount = await Profile.countDocuments();
    console.log(`📊 총 프로필: ${finalProfileCount}개`);

    await mongoose.disconnect();
    console.log('작업 완료!');

  } catch (error) {
    console.error('오류:', error.message);
    process.exit(1);
  }
}

createMissingProfiles();
