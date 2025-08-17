const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function fixProfileIndex() {
  try {
    console.log('MongoDB Atlas에 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('연결 성공!');

    const db = mongoose.connection.db;
    const collection = db.collection('profiles');
    
    try {
      // 현재 인덱스 확인
      const indexes = await collection.indexes();
      console.log('현재 인덱스들:');
      indexes.forEach(index => {
        console.log('  -', JSON.stringify(index.key));
      });

      // username_1 인덱스 제거
      await collection.dropIndex('username_1');
      console.log('✅ username_1 인덱스 제거 완료');
      
    } catch (error) {
      console.log('인덱스 제거 중 오류 (이미 제거되었을 수 있음):', error.message);
    }

    // 기존 잘못된 프로필 데이터 정리
    const result = await collection.deleteMany({ userId: { $exists: false } });
    console.log(`✅ 잘못된 프로필 ${result.deletedCount}개 제거`);

    await mongoose.disconnect();
    console.log('인덱스 수정 완료!');

  } catch (error) {
    console.error('오류:', error.message);
    process.exit(1);
  }
}

fixProfileIndex();
