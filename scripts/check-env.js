#!/usr/bin/env node

/**
 * Environment Configuration Checker
 * Run this script to validate your environment setup
 */

const fs = require('fs')
const path = require('path')

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

function checkEnvFiles() {
  console.log(colorize('\n🔍 Checking Environment Files...', 'blue'))
  console.log('=====================================')

  const envFiles = [
    { file: '.env', required: false, description: 'Base configuration' },
    { file: '.env.local', required: true, description: 'Local development' },
    { file: '.env.example', required: false, description: 'Example template' },
  ]

  let allGood = true

  envFiles.forEach(({ file, required, description }) => {
    const exists = fs.existsSync(path.join(process.cwd(), file))
    const status = exists 
      ? colorize('✓ EXISTS', 'green') 
      : required 
        ? colorize('✗ MISSING', 'red')
        : colorize('- OPTIONAL', 'yellow')
    
    console.log(`${file.padEnd(15)} ${status} ${colorize(description, 'cyan')}`)
    
    if (required && !exists) {
      allGood = false
    }
  })

  if (!allGood) {
    console.log(colorize('\n❌ Missing required environment files!', 'red'))
    console.log(colorize('Run: cp .env.example .env.local', 'yellow'))
  }

  return allGood
}

function loadEnvFile() {
  // Simple .env file loader
  const envFiles = ['.env.local', '.env']
  let envVars = {}

  for (const file of envFiles) {
    const envPath = path.join(process.cwd(), file)
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const lines = content.split('\n')
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '')
            envVars[key] = value
          }
        }
      }
    }
  }

  return envVars
}

function checkRequiredVariables() {
  console.log(colorize('\n🔧 Checking Required Variables...', 'blue'))
  console.log('=====================================')

  const envVars = loadEnvFile()
  const requiredVars = [
    { name: 'MONGODB_URI', description: 'MongoDB connection string' },
    { name: 'JWT_SECRET', description: 'JWT signing secret' },
    { name: 'NEXT_PUBLIC_BASE_URL', description: 'Application base URL' },
  ]

  let allGood = true

  requiredVars.forEach(({ name, description }) => {
    const value = envVars[name] || process.env[name]
    const status = value 
      ? colorize('✓ SET', 'green')
      : colorize('✗ MISSING', 'red')
    
    console.log(`${name.padEnd(25)} ${status} ${colorize(description, 'cyan')}`)
    
    if (value) {
      // Show masked value for security
      const maskedValue = name.includes('SECRET') || name.includes('PASSWORD')
        ? '*'.repeat(Math.min(value.length, 8))
        : value.length > 50 
          ? value.substring(0, 47) + '...'
          : value
      
      console.log(`${' '.repeat(27)} ${colorize(`→ ${maskedValue}`, 'magenta')}`)
    }
    
    if (!value) {
      allGood = false
    }
  })

  return allGood
}

function checkOptionalVariables() {
  console.log(colorize('\n⚙️  Checking Optional Variables...', 'blue'))
  console.log('=====================================')

  const envVars = loadEnvFile()
  const optionalVars = [
    { name: 'DISCORD_WEBHOOK_URL', description: 'Discord webhook for notifications' },
    { name: 'MAX_FILE_SIZE', description: 'Maximum upload file size' },
    { name: 'CARD_DROP_DAILY_LIMIT', description: 'Daily card drop limit' },
    { name: 'DEBUG', description: 'Debug mode flag' },
  ]

  optionalVars.forEach(({ name, description }) => {
    const value = envVars[name] || process.env[name]
    const status = value 
      ? colorize('✓ SET', 'green')
      : colorize('- DEFAULT', 'yellow')
    
    console.log(`${name.padEnd(25)} ${status} ${colorize(description, 'cyan')}`)
  })
}

function validateValues() {
  console.log(colorize('\n🔍 Validating Variable Values...', 'blue'))
  console.log('=====================================')

  const envVars = loadEnvFile()
  const validations = []

  // MongoDB URI validation
  const mongoUri = envVars.MONGODB_URI || process.env.MONGODB_URI
  if (mongoUri) {
    if (mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://')) {
      validations.push({ check: 'MongoDB URI format', status: 'valid' })
    } else {
      validations.push({ check: 'MongoDB URI format', status: 'invalid', message: 'Must start with mongodb:// or mongodb+srv://' })
    }
  }

  // JWT Secret validation
  const jwtSecret = envVars.JWT_SECRET || process.env.JWT_SECRET
  if (jwtSecret) {
    if (jwtSecret.length >= 32) {
      validations.push({ check: 'JWT Secret length', status: 'valid' })
    } else {
      validations.push({ check: 'JWT Secret length', status: 'warning', message: 'Should be at least 32 characters for security' })
    }
  }

  // Base URL validation
  const baseUrl = envVars.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL
  if (baseUrl) {
    try {
      new URL(baseUrl)
      validations.push({ check: 'Base URL format', status: 'valid' })
    } catch {
      validations.push({ check: 'Base URL format', status: 'invalid', message: 'Must be a valid URL' })
    }
  }

  validations.forEach(({ check, status, message }) => {
    const statusColor = status === 'valid' ? 'green' : status === 'warning' ? 'yellow' : 'red'
    const statusText = status === 'valid' ? '✓ VALID' : status === 'warning' ? '⚠ WARNING' : '✗ INVALID'
    
    console.log(`${check.padEnd(25)} ${colorize(statusText, statusColor)}`)
    if (message) {
      console.log(`${' '.repeat(27)} ${colorize(`→ ${message}`, 'magenta')}`)
    }
  })

  return validations.every(v => v.status === 'valid' || v.status === 'warning')
}

function checkDatabaseConnection() {
  console.log(colorize('\n🗄️  Database Connection Test...', 'blue'))
  console.log('=====================================')
  
  console.log(colorize('ℹ️  Database connection test requires running the application', 'yellow'))
  console.log(colorize('   Run: npm run dev', 'cyan'))
  console.log(colorize('   Check the console for MongoDB connection status', 'cyan'))
}

function printSummary(envFilesOk, requiredVarsOk, validationOk) {
  console.log(colorize('\n📊 Environment Setup Summary', 'blue'))
  console.log('=====================================')
  
  const overallStatus = envFilesOk && requiredVarsOk && validationOk
  
  console.log(`Environment Files: ${envFilesOk ? colorize('✓ OK', 'green') : colorize('✗ ISSUES', 'red')}`)
  console.log(`Required Variables: ${requiredVarsOk ? colorize('✓ OK', 'green') : colorize('✗ MISSING', 'red')}`)
  console.log(`Validation: ${validationOk ? colorize('✓ OK', 'green') : colorize('⚠ WARNINGS', 'yellow')}`)
  
  console.log(`\nOverall Status: ${overallStatus ? colorize('✓ READY', 'green') : colorize('✗ NEEDS ATTENTION', 'red')}`)
  
  if (!overallStatus) {
    console.log(colorize('\n📚 Quick Fix Guide:', 'yellow'))
    if (!envFilesOk) {
      console.log('   1. Copy .env.example to .env.local')
    }
    if (!requiredVarsOk) {
      console.log('   2. Fill in required environment variables')
    }
    console.log('   3. Refer to ENV_CONFIGURATION.md for details')
  } else {
    console.log(colorize('\n🚀 Your environment is ready! Run: npm run dev', 'green'))
  }
}

function main() {
  console.log(colorize('🌟 RangU.FAM Environment Configuration Checker', 'bold'))
  console.log(colorize('================================================', 'bold'))
  
  const envFilesOk = checkEnvFiles()
  const requiredVarsOk = checkRequiredVariables()
  checkOptionalVariables()
  const validationOk = validateValues()
  checkDatabaseConnection()
  printSummary(envFilesOk, requiredVarsOk, validationOk)
  
  console.log()
}

// Run the checker
main()