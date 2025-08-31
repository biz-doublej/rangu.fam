const { MongoClient } = require('mongodb')

// Connection URL - update this to match your MongoDB connection
const url = process.env.MONGODB_URI || 'mongodb+srv://gabrieljay0727:1234@cluster0.x1swcgo.mongodb.net/'

// Member name to abbreviation mapping
const memberAbbreviations = {
  '재원': 'JAE',
  '정재원': 'JAE', 
  '한울': 'HAN',
  '강한울': 'HAN',
  '승찬': 'LEE', 
  '이승찬': 'LEE',
  '민석': 'MIN',
  '정민석': 'MIN', 
  '진규': 'JIN',
  '정진규': 'JIN'
}

// Generate correct image URL based on actual file structure
function generateCorrectImageUrl(member, type, year, period) {
  const memberAbbr = memberAbbreviations[member]
  if (!memberAbbr) {
    return `/images/cards/default.jpg`
  }

  const baseUrl = `/images/cards/${type}`
  
  switch (type) {
    case 'year':
      if (year && period) {
        // Convert full year to 2-digit and period to version
        const yearShort = year.toString().slice(-2) // 2024 -> 24
        const version = period === 'h1' ? 'V1' : 'V2' // h1 -> V1, h2 -> V2
        return `${baseUrl}/${memberAbbr}_${yearShort}_${version}.jpg`
      }
      // Fallback to most recent available
      return `${baseUrl}/${memberAbbr}_24_V1.jpg`
    
    case 'signature':
      // Use naming convention: SIG_ABBR_YEAR.jpg
      if (year) {
        const yearShort = year.toString().slice(-2)
        return `${baseUrl}/SIG_${memberAbbr}_${yearShort}.jpg`
      }
      return `${baseUrl}/SIG_${memberAbbr}_24.jpg`
    
    case 'prestige':
      return `${baseUrl}/${memberAbbr}_prestige.jpg`
    
    case 'special':
      return `${baseUrl}/${memberAbbr}_special.jpg`
    
    case 'material':
      return `${baseUrl}/${memberAbbr}_material.jpg`
    
    default:
      return `${baseUrl}/${memberAbbr}.jpg`
  }
}

async function updateCardImages() {
  const client = new MongoClient(url)

  try {
    await client.connect()
    console.log('Connected to MongoDB')
    
    const db = client.db()
    const cardsCollection = db.collection('cards')
    
    // Get all cards
    const cards = await cardsCollection.find({}).toArray()
    console.log(`Found ${cards.length} cards to update`)
    
    let updated = 0
    
    for (const card of cards) {
      if (card.member) {
        const newImageUrl = generateCorrectImageUrl(
          card.member, 
          card.type, 
          card.year, 
          card.period
        )
        
        if (newImageUrl !== card.imageUrl) {
          await cardsCollection.updateOne(
            { _id: card._id },
            { 
              $set: { 
                imageUrl: newImageUrl,
                updatedAt: new Date()
              } 
            }
          )
          
          console.log(`Updated ${card.name}: ${card.imageUrl} -> ${newImageUrl}`)
          updated++
        }
      }
    }
    
    console.log(`✅ Successfully updated ${updated} cards with correct image URLs`)
    
  } catch (error) {
    console.error('Error updating card images:', error)
  } finally {
    await client.close()
  }
}

updateCardImages()