# 🔐 Quick Keys Reference Card

## 🚀 Most Common Commands

```bash
# Generate all secrets at once (recommended)
npm run keys:generate

# Generate JWT secret (most important)
npm run keys:jwt

# Generate strong password
npm run keys:password

# Auto-setup complete environment
npm run keys:setup

# Check environment is ready
npm run env:check
```

## 📝 Manual Generation

```bash
# JWT Secret (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Session Secret (32 chars)  
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Random Password (20 chars)
node -e "
const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
let pwd='';
for(let i=0;i<20;i++)pwd+=chars[Math.floor(Math.random()*chars.length)];
console.log(pwd);
"
```

## 🗄️ Database URLs

```bash
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/rangu-fam

# MongoDB Atlas (get from atlas dashboard)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rangu-fam
```

## 🤖 Discord Webhook

1. Discord Server → Channel Settings → Integrations → Webhooks
2. Create Webhook → Copy URL
3. `DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/ID/TOKEN`

## ✅ Essential Environment Variables

```env
# Required
JWT_SECRET=<64-char-hex>
MONGODB_URI=<connection-string>
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Optional but recommended
SESSION_SECRET=<32-char-hex>
DISCORD_WEBHOOK_URL=<webhook-url>
DEBUG=true
```

## 🔄 Quick Setup Flow

```bash
# 1. Generate secrets
npm run keys:generate

# 2. Copy to .env.local
echo 'JWT_SECRET=<generated-secret>' >> .env.local
echo 'MONGODB_URI=mongodb://localhost:27017/rangu-fam' >> .env.local
echo 'NEXT_PUBLIC_BASE_URL=http://localhost:3000' >> .env.local

# 3. Validate
npm run env:check

# 4. Start app
npm run dev
```

## 🚨 Security Reminders

- ✅ Store secrets in `.env.local` (gitignored)
- ❌ Never commit secrets to git
- 🔄 Rotate secrets every 30-90 days
- 💪 Use strong, random secrets (32+ chars)