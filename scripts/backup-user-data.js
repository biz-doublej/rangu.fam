const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 로컬 MongoDB 연결 (만약 로컬에 데이터가 있다면)
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/rangu-fam';

async function backupLocalUserData() {
  try {
    console.log('로컬 MongoDB에 연결 시도 중...');
    await mongoose.connect(LOCAL_MONGODB_URI);
    console.log('로컬 MongoDB 연결 성공!');

    const db = mongoose.connection.db;
    const userCollections = ['users', 'wikiusers', 'profiles'];
    
    const backupDir = path.join(__dirname, '..', 'user-backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    let hasData = false;

    for (const collectionName of userCollections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`${collectionName}: ${count}개 문서`);
        
        if (count > 0) {
          hasData = true;
          const data = await collection.find({}).toArray();
          
          const filename = path.join(backupDir, `${collectionName}.json`);
          fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
          
          console.log(`✓ ${collectionName} 백업 완료: ${data.length}개 문서`);
          
          // 샘플 데이터 출력
          if (data.length > 0) {
            console.log(`  샘플:`, data[0].username || data[0].name || data[0]._id);
          }
        }
      } catch (error) {
        console.log(`${collectionName}: 컬렉션 없음 또는 오류`);
      }
    }

    if (!hasData) {
      console.log('로컬에 추가 사용자 데이터가 없습니다.');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.log('로컬 MongoDB 연결 실패:', error.message);
    console.log('로컬 MongoDB가 실행되지 않거나 데이터가 이미 클라우드에 있을 수 있습니다.');
  }
}

backupLocalUserData();
