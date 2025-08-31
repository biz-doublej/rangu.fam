#!/usr/bin/env node

/**
 * Key Generation Script for RangU.FAM
 * Generates secure keys for environment variables
 */

const crypto = require('crypto')
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

/**
 * Key generators
 */
const keyGenerators = {
  /**
   * Generate JWT secret (32 bytes = 64 hex chars)
   */
  jwtSecret() {
    return crypto.randomBytes(32).toString('hex')
  },

  /**
   * Generate session secret (16 bytes = 32 hex chars)
   */
  sessionSecret() {
    return crypto.randomBytes(16).toString('hex')
  },

  /**
   * Generate random password
   */
  password(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  },

  /**
   * Generate API key with prefix
   */
  apiKey(prefix = 'rfa') {
    const randomPart = crypto.randomBytes(20).toString('hex')
    return `${prefix}_${randomPart}`
  },

  /**
   * Generate MongoDB connection string template
   */
  mongodbUri(dbName = 'rangu-fam') {
    return {
      local: `mongodb://localhost:27017/${dbName}`,
      atlas: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/${dbName}?retryWrites=true&w=majority`
    }
  },

  /**
   * Generate Discord webhook URL template
   */
  discordWebhook() {
    return 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN'
  }
}

/**
 * Generate all secrets at once
 */
function generateAllSecrets() {
  return {
    JWT_SECRET: keyGenerators.jwtSecret(),
    SESSION_SECRET: keyGenerators.sessionSecret(),
    ADMIN_PASSWORD: keyGenerators.password(20),
    API_KEY: keyGenerators.apiKey(),
    MONGODB_URI_LOCAL: keyGenerators.mongodbUri().local,
    MONGODB_URI_ATLAS: keyGenerators.mongodbUri().atlas,
    DISCORD_WEBHOOK_URL: keyGenerators.discordWebhook()
  }
}

/**
 * Display help information
 */
function showHelp() {
  console.log(colorize('\n🔐 RangU.FAM Key Generator', 'bold'))
  console.log('============================')
  console.log('\nUsage:')
  console.log('  node scripts/generate-keys.js [command]')
  console.log('\nCommands:')
  console.log(`  ${colorize('jwt', 'cyan')}        Generate JWT secret`)
  console.log(`  ${colorize('session', 'cyan')}    Generate session secret`)
  console.log(`  ${colorize('password', 'cyan')}   Generate random password`)
  console.log(`  ${colorize('api', 'cyan')}        Generate API key`)
  console.log(`  ${colorize('all', 'cyan')}        Generate all secrets`)
  console.log(`  ${colorize('env', 'cyan')}        Generate .env file template`)
  console.log(`  ${colorize('help', 'cyan')}       Show this help`)
  console.log('\nExamples:')
  console.log('  node scripts/generate-keys.js jwt')
  console.log('  node scripts/generate-keys.js password 20')
  console.log('  node scripts/generate-keys.js all')
  console.log('  node scripts/generate-keys.js env > .env.generated')
}

/**
 * Generate individual key
 */
function generateKey(type, ...args) {
  switch (type) {
    case 'jwt':
      console.log(keyGenerators.jwtSecret())
      break
    case 'session':
      console.log(keyGenerators.sessionSecret())
      break
    case 'password':
      const length = args[0] ? parseInt(args[0]) : 16
      console.log(keyGenerators.password(length))
      break
    case 'api':
      const prefix = args[0] || 'rfa'
      console.log(keyGenerators.apiKey(prefix))
      break
    default:
      console.log(colorize(`❌ Unknown key type: ${type}`, 'red'))
      showHelp()
  }
}

/**
 * Display all generated secrets
 */
function showAllSecrets() {
  const secrets = generateAllSecrets()
  
  console.log(colorize('\n🔑 Generated Secrets', 'bold'))
  console.log('===================')
  console.log(colorize('\n⚠️  IMPORTANT: Store these securely!', 'yellow'))
  console.log(colorize('Never commit these values to version control.\n', 'yellow'))
  
  Object.entries(secrets).forEach(([key, value]) => {
    const isSecret = key.includes('SECRET') || key.includes('PASSWORD')
    const displayValue = isSecret ? 
      colorize(value, 'magenta') : 
      value.includes('YOUR_') ? 
        colorize(value, 'yellow') :
        colorize(value, 'green')
    
    console.log(`${colorize(key.padEnd(20), 'cyan')} = ${displayValue}`)
  })
  
  console.log(colorize('\n📋 Copy Commands:', 'blue'))
  console.log('==================')
  Object.entries(secrets).forEach(([key, value]) => {
    if (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('API_KEY')) {
      console.log(`echo '${key}=${value}' >> .env.local`)
    }
  })
}

/**
 * Generate .env file template
 */
function generateEnvTemplate() {
  const secrets = generateAllSecrets()
  
  const template = `# =============================================================================
# RangU.FAM Environment Configuration - GENERATED
# =============================================================================
# Generated on: ${new Date().toISOString()}
# IMPORTANT: Review and customize these values before use
# =============================================================================

# -----------------------------------------------------------------------------
# Database Configuration
# -----------------------------------------------------------------------------
# Choose one:
# For local development:
MONGODB_URI=${secrets.MONGODB_URI_LOCAL}
# For MongoDB Atlas:
# MONGODB_URI=${secrets.MONGODB_URI_ATLAS}

# -----------------------------------------------------------------------------
# Authentication & Security
# -----------------------------------------------------------------------------
JWT_SECRET=${secrets.JWT_SECRET}
SESSION_SECRET=${secrets.SESSION_SECRET}

# -----------------------------------------------------------------------------
# Application Configuration
# -----------------------------------------------------------------------------
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development

# -----------------------------------------------------------------------------
# Discord Integration (Optional)
# -----------------------------------------------------------------------------
# Get your webhook URL from Discord Server Settings > Integrations > Webhooks
DISCORD_WEBHOOK_URL=${secrets.DISCORD_WEBHOOK_URL}

# -----------------------------------------------------------------------------
# Admin Configuration (Optional)
# -----------------------------------------------------------------------------
ADMIN_PASSWORD=${secrets.ADMIN_PASSWORD}
API_KEY=${secrets.API_KEY}

# -----------------------------------------------------------------------------
# File Upload Configuration
# -----------------------------------------------------------------------------
MAX_FILE_SIZE=5242880
ALLOWED_MIME_TYPES=image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml

# -----------------------------------------------------------------------------
# Wiki Configuration
# -----------------------------------------------------------------------------
WIKI_RATE_LIMIT_WINDOW=900000
WIKI_MAX_REQUESTS=10
WIKI_LOCK_DURATION=600000

# -----------------------------------------------------------------------------
# Game Configuration
# -----------------------------------------------------------------------------
TETRIS_SESSION_TIMEOUT=3600000
TETRIS_MAX_PLAYERS=8

# -----------------------------------------------------------------------------
# Card System Configuration
# -----------------------------------------------------------------------------
CARD_DROP_DAILY_LIMIT=5
CARD_DROP_RESET_HOUR=0
CARD_CRAFT_SUCCESS_RATE=0.7
CARD_MAX_INVENTORY=1000

# -----------------------------------------------------------------------------
# Development Configuration
# -----------------------------------------------------------------------------
DEBUG=true
LOG_LEVEL=info
ENABLE_DEBUG_ROUTES=true

# -----------------------------------------------------------------------------
# Security Configuration
# -----------------------------------------------------------------------------
CORS_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# -----------------------------------------------------------------------------
# Performance Configuration
# -----------------------------------------------------------------------------
NEXT_TELEMETRY_DISABLED=1
NODE_OPTIONS=--max-old-space-size=4096
`

  console.log(template)
}

/**
 * Quick setup helper
 */
function quickSetup() {
  console.log(colorize('\n🚀 Quick Environment Setup', 'bold'))
  console.log('===========================')
  
  const envLocalPath = path.join(process.cwd(), '.env.local')
  const envExamplePath = path.join(process.cwd(), '.env.example')
  
  // Check if .env.local already exists
  if (fs.existsSync(envLocalPath)) {
    console.log(colorize('⚠️  .env.local already exists!', 'yellow'))
    console.log('Choose an option:')
    console.log('1. Backup existing and create new')
    console.log('2. Show generated values only') 
    console.log('3. Cancel')
    return
  }
  
  // Generate new .env.local
  const secrets = generateAllSecrets()
  let envContent = ''
  
  // Try to use .env.example as template
  if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8')
    
    // Replace template values with generated ones
    Object.entries(secrets).forEach(([key, value]) => {
      if (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('API_KEY')) {
        const regex = new RegExp(`${key}=.*`, 'g')
        envContent = envContent.replace(regex, `${key}=${value}`)
      }
    })
  } else {
    // Generate from scratch if no example exists
    envContent = generateEnvTemplate()
  }
  
  // Write to .env.local
  fs.writeFileSync(envLocalPath, envContent)
  
  console.log(colorize('✅ Created .env.local with generated secrets!', 'green'))
  console.log(colorize('📝 Please review and customize the values as needed.', 'cyan'))
  console.log(colorize('🔒 Your secrets are ready to use!', 'magenta'))
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  if (!command || command === 'help') {
    showHelp()
    return
  }
  
  switch (command) {
    case 'all':
      showAllSecrets()
      break
    case 'env':
      generateEnvTemplate()
      break
    case 'setup':
      quickSetup()
      break
    case 'jwt':
    case 'session':
    case 'password':
    case 'api':
      generateKey(command, ...args.slice(1))
      break
    default:
      console.log(colorize(`❌ Unknown command: ${command}`, 'red'))
      showHelp()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { keyGenerators, generateAllSecrets }