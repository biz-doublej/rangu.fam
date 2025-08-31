import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { Card } from '@/models/Card'
import { generateCardImageUrl } from '@/lib/memberUtils'
export const dynamic = 'force-dynamic'

// POST: Regenerate all card image URLs
export async function POST() {
  try {
    await connectDB()
    
    const cards = await Card.find({})
    let updated = 0
    
    for (const card of cards) {
      if (card.member) {
        const newImageUrl = generateCardImageUrl(
          card.member,
          card.type,
          card.year,
          card.period
        )
        
        if (newImageUrl !== card.imageUrl) {
          card.imageUrl = newImageUrl
          await card.save()
          console.log(`Updated ${card.name}: ${card.imageUrl}`)
          updated++
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updated} card image URLs`,
      updated
    })
    
  } catch (error) {
    console.error('Error regenerating card images:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to regenerate card images' },
      { status: 500 }
    )
  }
}
