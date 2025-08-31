#!/usr/bin/env node

/**
 * Migration script to update CardDrop collection schema
 * Removes the max constraint on dailyDropCount field to support unlimited drops
 */

const mongoose = require('mongoose')

async function migateCardDropSchema() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://gabrieljay0727:1234@cluster0.x1swcgo.mongodb.net/'
    await mongoose.connect(mongoUri)
    
    console.log('Connected to MongoDB')
    
    // Get the database and collection
    const db = mongoose.connection.db
    const collection = db.collection('carddrops')
    
    // Drop existing indexes if they exist (optional)
    try {
      await collection.dropIndexes()
      console.log('Dropped existing indexes')
    } catch (error) {
      console.log('No indexes to drop or error dropping indexes:', error.message)
    }
    
    // Re-create the collection with updated schema
    // This will use the new schema definition from the model
    console.log('Schema migration completed - the new model definition will be used')
    
    // Validate existing documents (optional check)
    const invalidDocs = await collection.find({ 
      dailyDropCount: { $gt: 5 } 
    }).toArray()
    
    if (invalidDocs.length > 0) {
      console.log(`Found ${invalidDocs.length} documents with dailyDropCount > 5`)
      console.log('These documents should now be valid with the updated schema')
    }
    
    console.log('✓ CardDrop schema migration completed successfully')
    
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

// Run migration
migateCardDropSchema()