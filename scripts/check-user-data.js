const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkUserData() {
  try {
    console.log('MongoDB Atlas에 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('연결 성공!');

    const db = mongoose.connection.db;
    
    // 사용자 관련 컬렉션들 확인
    const userCollections = ['users', 'wikiusers', 'profiles'];
    
    for (const collectionName of userCollections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`\n👤 ${collectionName}: ${count}개 문서`);
        
        if (count > 0) {
          const samples = await collection.find().limit(3).toArray();
          samples.forEach((sample, index) => {
            console.log(`   [${index + 1}] ID: ${sample._id}`);
            if (sample.username) console.log(`       Username: ${sample.username}`);
            if (sample.email) console.log(`       Email: ${sample.email}`);
            if (sample.name) console.log(`       Name: ${sample.name}`);
            if (sample.userId) console.log(`       UserID: ${sample.userId}`);
          });
        }
      } catch (error) {
        console.log(`❌ ${collectionName}: 컬렉션이 존재하지 않거나 접근 불가`);
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('확인 중 오류:', error.message);
    process.exit(1);
  }
}

checkUserData();
