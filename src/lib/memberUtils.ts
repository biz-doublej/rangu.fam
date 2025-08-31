/**
 * Member utilities for name mapping and image URL generation
 */

// Member name to abbreviation mapping
export const memberAbbreviations: Record<string, string> = {
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

// Abbreviation to full name mapping
export const memberNames: Record<string, string> = {
  'JAE': '재원',
  'HAN': '한울', 
  'LEE': '승찬',
  'MIN': '민석',
  'JIN': '진규'
}

// Member emojis
export const memberEmojis: Record<string, string> = {
  '재원': '👨‍💻',
  '한울': '🎮', 
  '승찬': '🌟',
  '민석': '🏔️',
  '진규': '🪖'
}

/**
 * Generate card image URL based on member, type, and other parameters
 * Matches the actual file structure in /public/images/cards/
 */
export function generateCardImageUrl(
  member: string,
  type: string,
  year?: number,
  period?: string
): string {
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
      // Available files: SIG_HAN_20/22/23, SIG_JAE_22/24/25
      if (memberAbbr === 'HAN') {
        return `${baseUrl}/SIG_HAN_23.jpg` // Use most recent available
      } else if (memberAbbr === 'JAE') {
        return `${baseUrl}/SIG_JAE_24.jpg` // Use most recent available
      }
      // For members without signature images, fallback to background
      return `${baseUrl}/BG_SIGNATURE.jpg`
    
    case 'prestige':
      return `${baseUrl}/BG_${memberAbbr}_PRE.jpg`
    
    case 'special':
      // Use BACKNUM_ prefix for special cards
      return `${baseUrl}/BACKNUM_${memberAbbr}.jpg`
    
    case 'material':
      // Material directory is empty, use a generic placeholder
      return `/images/cards/default.jpg`
    
    default:
      return `${baseUrl}/${memberAbbr}.jpg`
  }
}

/**
 * Get member abbreviation from full name
 */
export function getMemberAbbreviation(memberName: string): string {
  return memberAbbreviations[memberName] || memberName
}

/**
 * Get full member name from abbreviation
 */
export function getMemberName(abbreviation: string): string {
  return memberNames[abbreviation] || abbreviation
}

/**
 * Get member emoji
 */
export function getMemberEmoji(memberName: string): string {
  return memberEmojis[memberName] || '👤'
}