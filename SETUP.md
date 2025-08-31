# 🚀 Quick Setup Guide

This guide will help you get the RangU.FAM application up and running quickly.

## 📋 Prerequisites

- Node.js 18+ installed
- MongoDB installed locally OR MongoDB Atlas account
- Git

## ⚡ Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd rangu.fam
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Copy environment template
   npm run env:setup
   
   # Or manually:
   cp .env.example .env.local
   ```

3. **Configure Environment**
   Edit `.env.local` with your values:
   ```env
   MONGODB_URI=mongodb://localhost:27017/rangu-fam
   JWT_SECRET=your-super-secret-jwt-key-here
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

4. **Validate Configuration**
   ```bash
   # Check environment setup
   npm run env:check
   
   # Validate configuration
   npm run env:validate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Setup

### Option 1: Local MongoDB
```bash
# Install MongoDB locally
# macOS with Homebrew:
brew install mongodb-community

# Start MongoDB
brew services start mongodb/brew/mongodb-community

# Use in .env.local:
MONGODB_URI=mongodb://localhost:27017/rangu-fam
```

### Option 2: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free cluster
3. Get connection string
4. Add to `.env.local`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rangu-fam
   ```

## 🎮 Seed Database (Optional)

```bash
# Seed basic data
npm run seed

# Seed extended data
npm run seed-extended

# Seed wiki content
npm run seed-wiki

# Seed bookmarks
npm run seed-bookmarks
```

## 🔧 Environment Scripts

| Command | Description |
|---------|-------------|
| `npm run env:setup` | Copy .env.example to .env.local |
| `npm run env:check` | Validate environment configuration |
| `npm run env:validate` | Test configuration loading |

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```bash
   # Check if MongoDB is running
   brew services list | grep mongodb
   
   # Start MongoDB if not running
   brew services start mongodb-community
   ```

2. **Environment Variables Not Loading**
   ```bash
   # Check file exists
   ls -la .env.local
   
   # Validate configuration
   npm run env:check
   ```

3. **JWT Secret Too Short**
   Generate a secure secret:
   ```bash
   # Generate random JWT secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Port Already in Use**
   ```bash
   # Kill process on port 3000
   npx kill-port 3000
   
   # Or use different port
   PORT=3001 npm run dev
   ```

## 🌐 Discord Integration (Optional)

1. Go to Discord Server Settings
2. Navigate to Integrations > Webhooks
3. Create New Webhook
4. Copy webhook URL
5. Add to `.env.local`:
   ```env
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
   ```

## 📚 Next Steps

After setup:

1. **Visit the Application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Check console for any errors

2. **Test Features**
   - Create wiki pages
   - Upload images
   - Test card system

3. **Production Deployment**
   - See `ENV_CONFIGURATION.md` for production setup
   - Configure environment variables on your platform

## 🆘 Getting Help

1. **Check Environment Configuration**
   ```bash
   npm run env:check
   ```

2. **View Configuration Details**
   ```bash
   npm run env:validate
   ```

3. **Check Application Logs**
   ```bash
   npm run dev
   # Look for error messages in console
   ```

4. **Documentation**
   - `ENV_CONFIGURATION.md` - Detailed environment guide
   - `README.md` - General application documentation

## ✅ Verification Checklist

- [ ] Node.js 18+ installed
- [ ] MongoDB running (local or Atlas)
- [ ] `.env.local` file created
- [ ] Required environment variables set
- [ ] `npm run env:check` passes
- [ ] `npm run dev` starts without errors
- [ ] Application loads at http://localhost:3000

---

🎉 **You're ready to go!** The application should now be running at [http://localhost:3000](http://localhost:3000)