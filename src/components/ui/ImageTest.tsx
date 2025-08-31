'use client'

import React, { useState } from 'react'

interface ImageTestProps {
  imageUrl: string
  cardName: string
}

export function ImageTest({ imageUrl, cardName }: ImageTestProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully:', imageUrl)
    setImageLoaded(true)
  }

  const handleImageError = (e: any) => {
    console.error('❌ Image failed to load:', imageUrl, e)
    setImageError(true)
  }

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-bold mb-2">{cardName}</h3>
      <p className="text-sm text-gray-600 mb-2">URL: {imageUrl}</p>
      
      <div className="w-48 h-64 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden mb-2">
        {!imageError ? (
          <img 
            src={imageUrl}
            alt={cardName}
            className="w-full h-full object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="text-center text-red-500">
            <p>❌ Image failed to load</p>
          </div>
        )}
      </div>
      
      <div className="text-xs">
        <p>Loaded: {imageLoaded ? '✅ Yes' : '❌ No'}</p>
        <p>Error: {imageError ? '❌ Yes' : '✅ No'}</p>
      </div>
    </div>
  )
}
