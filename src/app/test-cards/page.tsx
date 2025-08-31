'use client'

import React, { useState } from 'react'
import { CardFlipReveal } from '@/components/ui/CardFlipReveal'
import { SimpleCardTest } from '@/components/ui/SimpleCardTest'
import { Button } from '@/components/ui/Button'

interface TestCard {
  cardId: string
  name: string
  type: string
  rarity: string
  description: string
  imageUrl: string
  member?: string
  year?: number
  period?: string
}

export default function TestCardsPage() {
  const [testCard, setTestCard] = useState<TestCard | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  
  const dropCard = async () => {
    try {
      const response = await fetch('/api/cards/drop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: 'jaewon' })
      })
      
      const result = await response.json()
      console.log('API Response:', result)
      
      if (result.success && result.card) {
        console.log('Setting test card:', result.card)
        setTestCard(result.card)
        setIsRevealed(false)
        
        // Auto-reveal after a short delay
        setTimeout(() => {
          setIsRevealed(true)
        }, 500)
      }
    } catch (error) {
      console.error('Error dropping card:', error)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Card Drop Test</h1>
        
        <div className="text-center mb-8">
          <Button onClick={dropCard}>
            Drop Test Card
          </Button>
        </div>
        
        {testCard && (
          <div className="flex justify-center space-x-8">
            {/* Debug Info */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-bold mb-2">Card Debug Info</h3>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(testCard, null, 2)}
              </pre>
              
              {/* Direct Image Test */}
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Direct Image Test:</h4>
                <div className="w-48 h-32 bg-gray-100 border rounded">
                  <img 
                    src={testCard.imageUrl}
                    alt={testCard.name}
                    className="w-full h-full object-cover rounded"
                    onLoad={() => console.log('✅ Direct image loaded!')}
                    onError={() => console.log('❌ Direct image failed!')}
                  />
                </div>
              </div>
            </div>
            
            {/* Simple Card Test */}
            <div className="flex flex-col items-center">
              <h3 className="font-bold mb-4">Simple Card Test</h3>
              <SimpleCardTest card={testCard} />
            </div>
            
            {/* CardFlipReveal Test */}
            <div className="flex flex-col items-center">
              <h3 className="font-bold mb-4">CardFlipReveal Component</h3>
              <CardFlipReveal
                card={testCard}
                isRevealed={isRevealed}
                autoReveal={true}
                revealDelay={1000}
                onRevealComplete={() => console.log('🎉 Reveal complete!')}
              />
              
              <Button 
                className="mt-4" 
                onClick={() => setIsRevealed(!isRevealed)}
              >
                {isRevealed ? 'Hide' : 'Reveal'} Card
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}