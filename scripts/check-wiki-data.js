const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkWikiData() {
  try {
    console.log('MongoDB Atlas에 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('연결 성공!');

    const db = mongoose.connection.db;
    
    // 위키 관련 컬렉션들 확인
    const collections = ['wikipages', 'wikiusers', 'wikisubmissions'];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`📄 ${collectionName}: ${count}개 문서`);
        
        if (count > 0) {
          const sample = await collection.findOne();
          console.log(`   샘플 데이터:`, sample?._id ? sample._id : 'ID 없음');
        }
      } catch (error) {
        console.log(`❌ ${collectionName}: 컬렉션이 존재하지 않거나 접근 불가`);
      }
    }

    // 모든 컬렉션 목록 확인
    console.log('\n모든 컬렉션:');
    const allCollections = await db.listCollections().toArray();
    allCollections.forEach(col => {
      console.log(`  - ${col.name}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('확인 중 오류:', error.message);
    process.exit(1);
  }
}

checkWikiData();
