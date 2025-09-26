'use client'

import React from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-red-500">문제가 발생했습니다</h1>
        <p className="text-gray-400 mt-2">잠시 후 다시 시도해주세요.</p>
        {error?.digest && (
          <p className="text-xs text-gray-500 mt-2">Error id: {error.digest}</p>
        )}
        <button onClick={() => reset()} className="mt-6 px-4 py-2 rounded-lg bg-primary-600 text-white">다시 시도</button>
      </div>
    </div>
  )
}

