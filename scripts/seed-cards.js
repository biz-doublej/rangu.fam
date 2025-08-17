const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rangu-fam';

// 멤버 정보
const members = ['재원', '민석', '진규', '한울', '승찬', '희열'];
const memberEmojis = {
  '재원': '👨‍💻',
  '민석': '🏔️', 
  '진규': '🪖',
  '한울': '🎮',
  '승찬': '🌟',
  '희열': '🔮'
};

// 년도별 카드 생성
function generateYearCards() {
  const cards = [];
  const years = [2021, 2022, 2023, 2024, 2025];
  
  for (const year of years) {
    for (const member of members) {
      for (const period of ['h1', 'h2']) {
        cards.push({
          cardId: `${member.toLowerCase()}_${year}_${period}`,
          name: `${member} ${year}년 ${period === 'h1' ? '상반기' : '하반기'}`,
          type: 'year',
          rarity: 'basic',
          description: `${year}년 ${period === 'h1' ? '상반기' : '하반기'} ${member}의 모습`,
          imageUrl: `/images/cards/year/${member.toLowerCase()}_${year}_${period}.jpg`,
          member: member,
          year: year,
          period: period,
          isGroupCard: false,
          dropRate: 0.04167, // 50% / 12명 / 2기간 = 약 4.17%
          canBeUsedForCrafting: true
        });
      }
    }
    
    // 년도별 단체 카드
    cards.push({
      cardId: `group_${year}`,
      name: `랑구 ${year}년`,
      type: 'year',
      rarity: 'basic',
      description: `${year}년 랑구 단체 사진`,
      imageUrl: `/images/cards/year/group_${year}.jpg`,
      year: year,
      isGroupCard: true,
      dropRate: 0.02, // 약 2%
      canBeUsedForCrafting: true
    });
  }
  
  return cards;
}

// 스페셜 카드 생성
function generateSpecialCards() {
  return [
    {
      cardId: 'group_formation',
      name: '랑구 결성',
      type: 'special',
      rarity: 'rare',
      description: '여섯 친구가 처음 만나 랑구를 결성한 순간',
      imageUrl: '/images/cards/special/formation.jpg',
      isGroupCard: true,
      dropRate: 0.1, // 10%
      canBeUsedForCrafting: true
    },
    {
      cardId: 'group_anniversary_1',
      name: '랑구 1주년',
      type: 'special', 
      rarity: 'rare',
      description: '랑구 결성 1주년 기념',
      imageUrl: '/images/cards/special/anniversary_1.jpg',
      isGroupCard: true,
      dropRate: 0.1, // 10%
      canBeUsedForCrafting: true
    },
    {
      cardId: 'group_anniversary_2',
      name: '랑구 2주년',
      type: 'special',
      rarity: 'rare', 
      description: '랑구 결성 2주년 기념',
      imageUrl: '/images/cards/special/anniversary_2.jpg',
      isGroupCard: true,
      dropRate: 0.1, // 10%
      canBeUsedForCrafting: true
    }
  ];
}

// 시그니처 카드 생성
function generateSignatureCards() {
  const cards = [];
  const years = [2021, 2022, 2023, 2024, 2025];
  
  for (const year of years) {
    for (const member of members) {
      for (const period of ['h1', 'h2']) {
        cards.push({
          cardId: `signature_${member.toLowerCase()}_${year}_${period}`,
          name: `${member} 시그니처 ${year}년 ${period === 'h1' ? '상반기' : '하반기'}`,
          type: 'signature',
          rarity: 'epic',
          description: `${year}년 ${period === 'h1' ? '상반기' : '하반기'} ${member}의 특별한 순간`,
          imageUrl: `/images/cards/signature/${member.toLowerCase()}_${year}_${period}.jpg`,
          member: member,
          year: year,
          period: period,
          isGroupCard: false,
          dropRate: 0.00833, // 10% / 12명 / 2기간 = 약 0.83%
          canBeUsedForCrafting: true
        });
      }
    }
  }
  
  return cards;
}

// 재료 카드 생성
function generateMaterialCards() {
  return [
    {
      cardId: 'material_friendship',
      name: '우정의 조각',
      type: 'material',
      rarity: 'material',
      description: '진정한 우정으로 만들어진 신비한 재료',
      imageUrl: '/images/cards/material/friendship.jpg',
      dropRate: 0.05, // 5%
      canBeUsedForCrafting: true
    },
    {
      cardId: 'material_memory',
      name: '추억의 파편',
      type: 'material',
      rarity: 'material',
      description: '소중한 추억이 응축된 마법의 재료',
      imageUrl: '/images/cards/material/memory.jpg',
      dropRate: 0.05, // 5%
      canBeUsedForCrafting: true
    }
  ];
}

// 프레스티지 카드 생성
function generatePrestigeCards() {
  const cards = [];
  
  // 멤버별 프레스티지 카드
  for (const member of members) {
    cards.push({
      cardId: `prestige_${member.toLowerCase()}`,
      name: `${member} 프레스티지`,
      type: 'prestige',
      rarity: 'legendary',
      description: `${member}의 모든 추억과 성장이 담긴 전설의 카드`,
      imageUrl: `/images/cards/prestige/${member.toLowerCase()}.jpg`,
      member: member,
      isGroupCard: false,
      dropRate: 0, // 드랍 불가, 조합으로만 획득
      maxCopies: 1, // 한 장만 소장 가능
      craftingRecipe: {
        requiredCards: [
          { type: 'year', count: 7 },
          { type: 'special', count: 3 },
          { type: 'signature', count: 1 }
        ],
        successRate: 0.7 // 70% 성공률
      }
    });
  }
  
  // 특별 프레스티지 카드들
  cards.push(
    {
      cardId: 'prestige_group_legend',
      name: '랑구 레전드',
      type: 'prestige',
      rarity: 'legendary',
      description: '여섯 친구의 영원한 우정을 상징하는 전설의 카드',
      imageUrl: '/images/cards/prestige/group_legend.jpg',
      isGroupCard: true,
      dropRate: 0,
      maxCopies: 1,
      craftingRecipe: {
        requiredCards: [
          { type: 'year', count: 7 },
          { type: 'special', count: 3 },
          { type: 'signature', count: 1 }
        ],
        successRate: 0.7
      }
    },
    {
      cardId: 'prestige_group_ultimate',
      name: '랑구 얼티밋',
      type: 'prestige',
      rarity: 'legendary',
      description: '모든 것을 초월한 궁극의 랑구 카드',
      imageUrl: '/images/cards/prestige/group_ultimate.jpg',
      isGroupCard: true,
      dropRate: 0,
      maxCopies: 1,
      craftingRecipe: {
        requiredCards: [
          { type: 'year', count: 7 },
          { type: 'special', count: 3 },
          { type: 'signature', count: 1 }
        ],
        successRate: 0.7
      }
    }
  );
  
  return cards;
}

// 기본 카드 데이터 생성
function generateAllCards() {
  const allCards = [
    ...generateYearCards(),
    ...generateSpecialCards(),
    ...generateSignatureCards(),
    ...generateMaterialCards(),
    ...generatePrestigeCards()
  ];
  
  // 현재 시간으로 createdAt, updatedAt 설정
  const now = new Date();
  return allCards.map(card => ({
    ...card,
    createdAt: now,
    updatedAt: now
  }));
}

async function seedCards() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('MongoDB에 연결되었습니다.');
    
    const db = client.db();
    const cardsCollection = db.collection('cards');
    
    // 기존 카드 데이터 삭제 (선택사항)
    const existingCount = await cardsCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`기존 카드 ${existingCount}개를 발견했습니다.`);
      const shouldDelete = process.argv.includes('--force');
      
      if (shouldDelete) {
        await cardsCollection.deleteMany({});
        console.log('기존 카드 데이터를 삭제했습니다.');
      } else {
        console.log('기존 데이터를 유지합니다. 강제 삭제하려면 --force 옵션을 사용하세요.');
        return;
      }
    }
    
    // 새 카드 데이터 생성
    const cards = generateAllCards();
    
    // 카드 데이터 삽입
    const result = await cardsCollection.insertMany(cards);
    console.log(`${result.insertedCount}개의 카드가 성공적으로 생성되었습니다.`);
    
    // 통계 출력
    console.log('\n=== 카드 생성 통계 ===');
    const stats = await cardsCollection.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalDropRate: { $sum: '$dropRate' }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    stats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count}개 (총 드랍률: ${(stat.totalDropRate * 100).toFixed(1)}%)`);
    });
    
    const totalDropRate = stats.reduce((sum, stat) => sum + stat.totalDropRate, 0);
    console.log(`\n전체 드랍률 합계: ${(totalDropRate * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('카드 시딩 중 오류 발생:', error);
  } finally {
    await client.close();
    console.log('데이터베이스 연결이 종료되었습니다.');
  }
}

// 스크립트 실행
if (require.main === module) {
  seedCards().catch(console.error);
}

module.exports = { seedCards, generateAllCards };
