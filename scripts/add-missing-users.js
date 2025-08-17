const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// User 모델 정의
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  name: String,
  bio: String,
  avatar: String,
  joinDate: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
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

async function addMissingUsers() {
  try {
    console.log('MongoDB Atlas에 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('연결 성공!');

    // 추가할 사용자들 (rangu.fam 멤버들)
    const missingUsers = [
      {
        username: 'seungchan',
        email: 'seungchan@rangu.fam',
        password: '123456',
        name: '승찬',
        role: 'admin',
        bio: 'Rangu.fam 멤버'
      },
      {
        username: 'hanul',
        email: 'hanul@rangu.fam', 
        password: '123456',
        name: '하늘',
        role: 'user',
        bio: 'Rangu.fam 멤버'
      },
      {
        username: 'heeyeol',
        email: 'heeyeol@rangu.fam',
        password: '123456', 
        name: '희열',
        role: 'user',
        bio: 'Rangu.fam 멤버'
      }
    ];

    for (const userData of missingUsers) {
      try {
        // 사용자가 이미 존재하는지 확인
        const existingUser = await User.findOne({ 
          $or: [{ username: userData.username }, { email: userData.email }] 
        });

        if (existingUser) {
          console.log(`✓ ${userData.username} 이미 존재합니다.`);
          continue;
        }

        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        // 사용자 생성
        const newUser = new User({
          ...userData,
          password: hashedPassword
        });

        const savedUser = await newUser.save();
        console.log(`✅ ${userData.username} 사용자 생성 완료`);

        // 프로필 생성
        const newProfile = new Profile({
          userId: savedUser._id.toString(),
          displayName: userData.name,
          bio: userData.bio,
          preferences: {
            theme: 'dark',
            notifications: true
          }
        });

        await newProfile.save();
        console.log(`✅ ${userData.username} 프로필 생성 완료`);

      } catch (error) {
        console.error(`❌ ${userData.username} 생성 실패:`, error.message);
      }
    }

    // 최종 사용자 수 확인
    const totalUsers = await User.countDocuments();
    const totalProfiles = await Profile.countDocuments();
    console.log(`\n📊 총 사용자: ${totalUsers}명`);
    console.log(`📊 총 프로필: ${totalProfiles}개`);

    await mongoose.disconnect();
    console.log('작업 완료!');

  } catch (error) {
    console.error('오류:', error.message);
    process.exit(1);
  }
}

addMissingUsers();
