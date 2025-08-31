#!/usr/bin/env node

/**
 * Test script to verify card drop functionality works without validation errors
 */

const { spawn } = require('child_process')

console.log('🧪 Testing Card Drop Functionality...\n')

// Test the card drop API
const testCardDrop = () => {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '-X', 'POST',
      'http://localhost:3000/api/cards/drop',
      '-H', 'Content-Type: application/json',
      '-d', '{"userId":"jaewon"}',
      '-s'  // Silent mode
    ])
    
    let output = ''
    
    curl.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    curl.stderr.on('data', (data) => {
      console.error(`Error: ${data}`)
    })
    
    curl.on('close', (code) => {
      if (code === 0) {
        try {
          const response = JSON.parse(output)
          resolve(response)
        } catch (error) {
          reject(new Error(`Failed to parse response: ${output}`))
        }
      } else {
        reject(new Error(`curl exited with code ${code}`))
      }
    })
  })
}

// Run the test
async function runTest() {
  try {
    console.log('📡 Making API request to /api/cards/drop...')
    const response = await testCardDrop()
    
    console.log('📋 Response:', JSON.stringify(response, null, 2))
    
    if (response.success) {
      console.log('✅ Card drop test PASSED - No validation errors!')
      if (response.card) {
        console.log(`🎴 Dropped card: ${response.card.name} (${response.card.rarity})`)
      }
    } else {
      console.log('❌ Card drop test FAILED:', response.message)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.log('\n💡 Make sure the development server is running on localhost:3000')
  }
}

// Wait a moment for server to be ready, then run test
setTimeout(runTest, 2000)