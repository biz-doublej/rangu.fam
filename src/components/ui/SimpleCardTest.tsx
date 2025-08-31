'use client'

import React from 'react'

interface SimpleCardTestProps {
  card: {
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
}

export function SimpleCardTest({ card }: SimpleCardTestProps) {
  return (
    <div className="w-48 h-72 bg-white border rounded-lg shadow-lg overflow-hidden">
      <div className="p-3 bg-blue-500 text-white">
        <h3 className="font-bold text-sm">{card.name}</h3>
        <p className="text-xs opacity-90">{card.rarity}</p>
      </div>
      
      <div className="p-3">
        {/* Simple Image Display */}
        <div className="w-full h-40 bg-gray-100 border rounded overflow-hidden mb-3">
          {card.imageUrl ? (
            <img 
              src={card.imageUrl}
              alt={card.name}
              className="w-full h-full object-cover"
              onLoad={() => {
                console.log('🎉 SIMPLE TEST: Image loaded successfully!', card.imageUrl)
              }}
              onError={(e) => {
                console.log('❌ SIMPLE TEST: Image failed to load!', card.imageUrl, e)
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              No Image
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-600">
          <p className="mb-1">{card.description}</p>
          <p>URL: {card.imageUrl}</p>
          {card.member && <p>Member: {card.member}</p>}
        </div>
      </div>
    </div>
  )
}