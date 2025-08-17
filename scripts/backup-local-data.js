const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 로컬 MongoDB 연결
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/rangu-fam';

async function backupData() {
  try {
    console.log('로컬 MongoDB에 연결 중...');
    await mongoose.connect(LOCAL_MONGODB_URI);
    console.log('연결 성공!');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const backupDir = path.join(__dirname, '..', 'backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log('발견된 컬렉션들:', collections.map(c => c.name));

    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`컬렉션 ${collectionName} 백업 중...`);
      
      const data = await db.collection(collectionName).find({}).toArray();
      
      const filename = path.join(backupDir, `${collectionName}.json`);
      fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
      
      console.log(`✓ ${collectionName}: ${data.length}개 문서 백업 완료`);
    }

    console.log('모든 데이터 백업 완료!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('백업 중 오류:', error);
    process.exit(1);
  }
}

backupData();
