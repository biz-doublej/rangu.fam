const { MongoClient } = require('mongodb')

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rangu-fam'

// 샘플 북마크 데이터
const sampleBookmarks = [
  // 정재원용 북마크
  {
    userId: 'jaewon',
    title: 'GitHub',
    url: 'https://github.com',
    description: '코드 저장소',
    icon: '💻',
    order: 0
  },
  {
    userId: 'jaewon',
    title: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    description: '개발 Q&A',
    icon: '📚',
    order: 1
  },
  {
    userId: 'jaewon',
    title: 'Vercel',
    url: 'https://vercel.com',
    description: '배포 플랫폼',
    icon: '🚀',
    order: 2
  },

  // 정민석용 북마크
  {
    userId: 'minseok',
    title: 'Swiss Weather',
    url: 'https://www.meteoswiss.admin.ch',
    description: '스위스 날씨',
    icon: '🌤️',
    order: 0
  },
  {
    userId: 'minseok',
    title: 'SBB CFF FFS',
    url: 'https://www.sbb.ch',
    description: '스위스 기차 시간표',
    icon: '🚂',
    order: 1
  },

  // 정진규용 북마크
  {
    userId: 'jinkyu',
    title: 'YouTube',
    url: 'https://youtube.com',
    description: '동영상 플랫폼',
    icon: '📺',
    order: 0
  },
  {
    userId: 'jinkyu',
    title: 'Netflix',
    url: 'https://netflix.com',
    description: '스트리밍',
    icon: '🎬',
    order: 1
  },

  // 강한울용 북마크
  {
    userId: 'hanul',
    title: 'Vancouver Weather',
    url: 'https://weather.gc.ca/city/pages/bc-74_metric_e.html',
    description: '밴쿠버 날씨',
    icon: '🌧️',
    order: 0
  },
  {
    userId: 'hanul',
    title: 'TransLink',
    url: 'https://www.translink.ca',
    description: '밴쿠버 대중교통',
    icon: '🚌',
    order: 1
  },

  // 이승찬용 북마크
  {
    userId: 'seungchan',
    title: 'Reddit',
    url: 'https://reddit.com',
    description: '커뮤니티',
    icon: '🗨️',
    order: 0
  },
  {
    userId: 'seungchan',
    title: 'Steam',
    url: 'https://store.steampowered.com',
    description: '게임 플랫폼',
    icon: '🎮',
    order: 1
  },

  // 윤희열용 북마크
  {
    userId: 'heeyeol',
    title: 'Spotify',
    url: 'https://spotify.com',
    description: '음악 스트리밍',
    icon: '🎵',
    order: 0
  },
  {
    userId: 'heeyeol',
    title: 'SoundCloud',
    url: 'https://soundcloud.com',
    description: '음악 플랫폼',
    icon: '🎧',
    order: 1
  }
]

async function seedBookmarks() {
  let client

  try {
    console.log('MongoDB에 연결 중...')
    client = new MongoClient(uri)
    await client.connect()
    
    const db = client.db()
    const collection = db.collection('bookmarks')

    console.log('기존 북마크 삭제 중...')
    await collection.deleteMany({})

    console.log('샘플 북마크 삽입 중...')
    const now = new Date()
    const bookmarksWithTimestamps = sampleBookmarks.map(bookmark => ({
      ...bookmark,
      createdAt: now,
      updatedAt: now
    }))

    const result = await collection.insertMany(bookmarksWithTimestamps)
    console.log(`${result.insertedCount}개의 북마크가 성공적으로 추가되었습니다.`)

    // 사용자별 북마크 개수 확인
    const userCounts = await collection.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray()

    console.log('\n사용자별 북마크 개수:')
    userCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count}개`)
    })

  } catch (error) {
    console.error('북마크 시드 실행 중 오류:', error)
  } finally {
    if (client) {
      await client.close()
      console.log('\nMongoDB 연결 종료')
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  seedBookmarks()
}