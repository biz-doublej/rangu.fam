# Environment Configuration Guide

This guide explains how to set up environment variables for the RangU.FAM application.

## 📁 Environment Files

The project uses multiple environment files for different purposes:

- **`.env`** - Base environment configuration (tracked in git for reference)
- **`.env.local`** - Local development configuration (not tracked in git)
- **`.env.example`** - Example configuration template (tracked in git)
- **`.env.production`** - Production configuration (not tracked in git)
- **`.env.test`** - Test configuration (not tracked in git)

## 🚀 Quick Setup

1. **For Local Development:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

2. **For Production:**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

## 🔧 Configuration Sections

### Database Configuration

```env
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/rangu-fam
```

**Local Development:** Use local MongoDB instance
**Production:** Use MongoDB Atlas or hosted MongoDB service

### Authentication & Security

```env
# JWT secret for token signing
JWT_SECRET=your-super-secret-jwt-key
```

**Important:** Use a strong, randomly generated key for production!

### Application Configuration

```env
# Base URL for the application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development
```

### Discord Integration

```env
# Discord webhook URLs for notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN
DISCORD_WEBHOOK_URL_ADMIN=https://discord.com/api/webhooks/ADMIN_WEBHOOK_ID/ADMIN_TOKEN
```

**Setup Steps:**
1. Go to your Discord server settings
2. Navigate to Integrations > Webhooks
3. Create a new webhook
4. Copy the webhook URL
5. Add it to your environment file

### File Upload Configuration

```env
# Maximum file size (5MB in bytes)
MAX_FILE_SIZE=5242880
# Allowed MIME types for image uploads
ALLOWED_MIME_TYPES=image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml
```

### Wiki System Configuration

```env
# Rate limiting settings
WIKI_RATE_LIMIT_WINDOW=900000  # 15 minutes
WIKI_MAX_REQUESTS=10           # Max requests per window
WIKI_LOCK_DURATION=600000      # 10 minutes for edit locks
```

### Game Configuration

```env
# Tetris multiplayer settings
TETRIS_SESSION_TIMEOUT=3600000 # 1 hour session timeout
TETRIS_MAX_PLAYERS=8           # Maximum players per game
```

### Card System Configuration

```env
# Card drop system settings
CARD_DROP_DAILY_LIMIT=5        # Daily drops per user
CARD_DROP_RESET_HOUR=0         # Reset at midnight UTC
CARD_CRAFT_SUCCESS_RATE=0.7    # 70% crafting success rate
CARD_MAX_INVENTORY=1000        # Max cards per user
```

## 🔒 Security Best Practices

1. **Never commit sensitive values to git**
2. **Use strong, randomly generated secrets**
3. **Rotate secrets regularly in production**
4. **Use different secrets for different environments**
5. **Restrict database access by IP when possible**

## 🏗️ Environment-Specific Setup

### Local Development

```bash
# Use .env.local for local development
# MongoDB: Local instance or Docker container
# JWT_SECRET: Any secure string for development
# DISCORD_WEBHOOK_URL: Optional for development
```

### Production (Vercel)

In your Vercel dashboard:
1. Go to Project Settings > Environment Variables
2. Add each variable with production values
3. Set appropriate environment (Production/Preview/Development)

### Production (Other Platforms)

For Docker, Railway, Render, etc.:
1. Create `.env.production` file
2. Use platform-specific methods to load environment variables
3. Ensure all required variables are set

## 🧪 Testing Configuration

For running tests:

```env
# .env.test
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/rangu-fam-test
JWT_SECRET=test-secret-key
# ... other test-specific values
```

## 📊 Monitoring Variables (Optional)

```env
# Performance monitoring
NEXT_TELEMETRY_DISABLED=1
DEBUG=true
LOG_LEVEL=info

# Analytics (if implemented)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
SENTRY_DSN=your-sentry-dsn
```

## 🚨 Required Variables

The following variables are **required** for the application to work:

- `MONGODB_URI` - Database connection
- `JWT_SECRET` - Authentication
- `NEXT_PUBLIC_BASE_URL` - Application URLs

## 📝 Optional Variables

These variables have defaults but can be customized:

- `DISCORD_WEBHOOK_URL` - Discord notifications (falls back to console logging)
- `MAX_FILE_SIZE` - File upload limits (default: 5MB)
- `CARD_DROP_DAILY_LIMIT` - Card system limits (default: 5)
- All rate limiting and timeout values

## 🔍 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check `MONGODB_URI` format
   - Verify database server is running
   - Check network access/firewall settings

2. **JWT Token Errors**
   - Ensure `JWT_SECRET` is set and consistent
   - Check token expiration settings

3. **Discord Webhooks Not Working**
   - Verify webhook URL format
   - Check Discord server permissions
   - Test webhook manually

### Debug Mode

Enable debug mode for detailed logging:

```env
DEBUG=true
LOG_LEVEL=debug
ENABLE_DEBUG_ROUTES=true
```

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [MongoDB Connection Strings](https://docs.mongodb.com/manual/reference/connection-string/)
- [Discord Webhooks](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

## 🆘 Support

If you encounter issues with environment configuration:

1. Check this documentation
2. Verify all required variables are set
3. Test with minimal configuration first
4. Check application logs for specific errors
5. Refer to the `.env.example` file for correct format