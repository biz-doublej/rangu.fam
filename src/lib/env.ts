/**
 * Environment Configuration Utility
 * Validates and provides type-safe access to environment variables
 */

export interface AppConfig {
  // Database
  mongodbUri: string
  
  // Authentication
  jwtSecret: string
  
  // Application
  baseUrl: string
  nodeEnv: 'development' | 'production' | 'test'
  
  // Discord
  discordWebhookUrl?: string
  discordWebhookUrlAdmin?: string
  
  // File Upload
  maxFileSize: number
  allowedMimeTypes: string[]
  
  // Wiki
  wikiRateLimitWindow: number
  wikiMaxRequests: number
  wikiLockDuration: number
  
  // Games
  tetrisSessionTimeout: number
  tetrisMaxPlayers: number
  
  // Cards
  cardDropDailyLimit: number
  cardDropResetHour: number
  cardCraftSuccessRate: number
  cardMaxInventory: number
  
  // Development
  debug: boolean
  logLevel: string
  enableDebugRoutes: boolean
  
  // Security
  corsOrigins: string[]
  sessionSecret: string
  sessionMaxAge: number
  rateLimitWindowMs: number
  rateLimitMaxRequests: number
}

/**
 * Validates and loads environment configuration
 */
export function loadConfig(): AppConfig {
  // Required environment variables
  const requiredVars = {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  }

  // Check for required variables
  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key, _]) => key)

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file or environment configuration.'
    )
  }

  // Parse and validate configuration
  const config: AppConfig = {
    // Database
    mongodbUri: requiredVars.MONGODB_URI!,
    
    // Authentication
    jwtSecret: requiredVars.JWT_SECRET!,
    
    // Application
    baseUrl: requiredVars.NEXT_PUBLIC_BASE_URL!,
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    
    // Discord
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
    discordWebhookUrlAdmin: process.env.DISCORD_WEBHOOK_URL_ADMIN,
    
    // File Upload
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml')
      .split(',')
      .map(type => type.trim()),
    
    // Wiki
    wikiRateLimitWindow: parseInt(process.env.WIKI_RATE_LIMIT_WINDOW || '900000', 10),
    wikiMaxRequests: parseInt(process.env.WIKI_MAX_REQUESTS || '10', 10),
    wikiLockDuration: parseInt(process.env.WIKI_LOCK_DURATION || '600000', 10),
    
    // Games
    tetrisSessionTimeout: parseInt(process.env.TETRIS_SESSION_TIMEOUT || '3600000', 10),
    tetrisMaxPlayers: parseInt(process.env.TETRIS_MAX_PLAYERS || '8', 10),
    
    // Cards
    cardDropDailyLimit: parseInt(process.env.CARD_DROP_DAILY_LIMIT || '5', 10),
    cardDropResetHour: parseInt(process.env.CARD_DROP_RESET_HOUR || '0', 10),
    cardCraftSuccessRate: parseFloat(process.env.CARD_CRAFT_SUCCESS_RATE || '0.7'),
    cardMaxInventory: parseInt(process.env.CARD_MAX_INVENTORY || '1000', 10),
    
    // Development
    debug: process.env.DEBUG === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
    enableDebugRoutes: process.env.ENABLE_DEBUG_ROUTES === 'true',
    
    // Security
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map(origin => origin.trim()),
    sessionSecret: process.env.SESSION_SECRET || 'rangu-fam-session-secret',
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '604800000', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  }

  // Validate configuration values
  validateConfig(config)

  return config
}

/**
 * Validates configuration values
 */
function validateConfig(config: AppConfig): void {
  const errors: string[] = []

  // Validate MongoDB URI format
  if (!config.mongodbUri.startsWith('mongodb://') && !config.mongodbUri.startsWith('mongodb+srv://')) {
    errors.push('MONGODB_URI must be a valid MongoDB connection string')
  }

  // Validate JWT secret length
  if (config.jwtSecret.length < 32) {
    errors.push('JWT_SECRET should be at least 32 characters long for security')
  }

  // Validate base URL format
  try {
    new URL(config.baseUrl)
  } catch {
    errors.push('NEXT_PUBLIC_BASE_URL must be a valid URL')
  }

  // Validate numeric ranges
  if (config.maxFileSize <= 0) {
    errors.push('MAX_FILE_SIZE must be a positive number')
  }

  if (config.cardDropResetHour < 0 || config.cardDropResetHour > 23) {
    errors.push('CARD_DROP_RESET_HOUR must be between 0 and 23')
  }

  if (config.cardCraftSuccessRate < 0 || config.cardCraftSuccessRate > 1) {
    errors.push('CARD_CRAFT_SUCCESS_RATE must be between 0 and 1')
  }

  // Validate MIME types
  const validMimePattern = /^[a-zA-Z]+\/[a-zA-Z0-9\-\+]+$/
  const invalidMimeTypes = config.allowedMimeTypes.filter(type => !validMimePattern.test(type))
  if (invalidMimeTypes.length > 0) {
    errors.push(`Invalid MIME types: ${invalidMimeTypes.join(', ')}`)
  }

  if (errors.length > 0) {
    throw new Error(
      'Environment configuration validation failed:\n' +
      errors.map(error => `- ${error}`).join('\n')
    )
  }
}

/**
 * Singleton configuration instance
 */
let _config: AppConfig | null = null

/**
 * Get application configuration (cached)
 */
export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig()
  }
  return _config
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getConfig().nodeEnv === 'development'
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getConfig().nodeEnv === 'production'
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getConfig().nodeEnv === 'test'
}

/**
 * Get environment-specific database name
 */
export function getDatabaseName(): string {
  const config = getConfig()
  const url = new URL(config.mongodbUri.replace('mongodb://', 'http://').replace('mongodb+srv://', 'https://'))
  const dbName = url.pathname.slice(1) || 'rangu-fam'
  
  if (isTest()) {
    return `${dbName}-test`
  }
  
  return dbName
}

/**
 * Generate secure keys for environment variables
 */
export const KeyGenerator = {
  /**
   * Generate a secure JWT secret (64 characters)
   */
  generateJWTSecret(): string {
    const crypto = require('crypto')
    return crypto.randomBytes(32).toString('hex')
  },

  /**
   * Generate a session secret (32 characters)
   */
  generateSessionSecret(): string {
    const crypto = require('crypto')
    return crypto.randomBytes(16).toString('hex')
  },

  /**
   * Generate a random password (16 characters)
   */
  generatePassword(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  },

  /**
   * Generate API key format string
   */
  generateAPIKey(prefix: string = 'rfa'): string {
    const crypto = require('crypto')
    const randomPart = crypto.randomBytes(20).toString('hex')
    return `${prefix}_${randomPart}`
  },

  /**
   * Generate all common secrets needed for the application
   */
  generateAllSecrets(): Record<string, string> {
    return {
      JWT_SECRET: this.generateJWTSecret(),
      SESSION_SECRET: this.generateSessionSecret(),
      API_KEY: this.generateAPIKey(),
      ADMIN_PASSWORD: this.generatePassword(20)
    }
  },

  /**
   * Print generated keys in env format
   */
  printEnvFormat(): void {
    const secrets = this.generateAllSecrets()
    console.log('\n🔑 Generated Environment Variables:')
    console.log('====================================')
    console.log('# Copy these to your .env.local file')
    console.log()
    Object.entries(secrets).forEach(([key, value]) => {
      console.log(`${key}=${value}`)
    })
    console.log('\n⚠️  IMPORTANT: Store these securely and never commit to version control!')
    console.log('====================================')
  }
}

/**
 * Print configuration summary (for debugging)
 */
export function printConfigSummary(): void {
  if (!isDevelopment()) return

  const config = getConfig()
  console.log('\n🔧 Environment Configuration Summary:')
  console.log('=====================================')
  console.log(`Environment: ${config.nodeEnv}`)
  console.log(`Base URL: ${config.baseUrl}`)
  console.log(`Database: ${config.mongodbUri.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@')}`)
  console.log(`JWT Secret: ${config.jwtSecret.substring(0, 8)}...`)
  console.log(`Discord Webhook: ${config.discordWebhookUrl ? 'Configured' : 'Not configured'}`)
  console.log(`Max File Size: ${(config.maxFileSize / 1024 / 1024).toFixed(1)}MB`)
  console.log(`Card Drop Limit: ${config.cardDropDailyLimit}/day`)
  console.log(`Debug Mode: ${config.debug ? 'ON' : 'OFF'}`)
  console.log('=====================================\n')
}