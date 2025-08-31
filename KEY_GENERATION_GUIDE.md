# 🔐 Environment Key Generation Guide

This guide shows you how to generate secure keys and secrets for your environment variables.

## 🚀 Quick Commands

### Generate Individual Keys

```bash
# Generate JWT secret (for authentication)
npm run keys:jwt
# Output: 64-character hex string

# Generate session secret
node scripts/generate-keys.js session
# Output: 32-character hex string

# Generate random password (default 16 chars)
npm run keys:password
# Custom length:
node scripts/generate-keys.js password 32

# Generate API key
node scripts/generate-keys.js api
# With custom prefix:
node scripts/generate-keys.js api myapp
```

### Generate All Keys at Once

```bash
# Show all generated secrets with copy commands
npm run keys:generate
```

### Auto-Setup Environment

```bash
# Automatically create .env.local with generated secrets
npm run keys:setup
```

## 📋 Manual Key Generation Commands

### 1. JWT Secret (Most Important!)

```bash
# Method 1: Using our script
npm run keys:jwt

# Method 2: Using Node.js directly
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Method 3: Using OpenSSL (if available)
openssl rand -hex 32

# Method 4: Online generator (use with caution)
# Visit: https://generate-random.org/api-token-generator
```

**Example output:** `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`

### 2. Session Secret

```bash
# Using our script
node scripts/generate-keys.js session

# Using Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Using OpenSSL
openssl rand -hex 16
```

### 3. Random Passwords

```bash
# 16 character password
npm run keys:password

# 32 character password
node scripts/generate-keys.js password 32

# Using Node.js with special characters
node -e "
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
let result = '';
for(let i = 0; i < 20; i++) {
  result += chars.charAt(Math.floor(Math.random() * chars.length));
}
console.log(result);
"
```

### 4. API Keys

```bash
# Standard API key
node scripts/generate-keys.js api

# Custom prefix
node scripts/generate-keys.js api myproject
# Output: myproject_a1b2c3d4e5f6...
```

## 🔧 Platform-Specific Commands

### macOS/Linux Terminal

```bash
# Generate UUID (alternative format)
uuidgen

# Generate random string using /dev/urandom
cat /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Windows PowerShell

```powershell
# Generate random bytes
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Generate GUID
[System.Guid]::NewGuid().ToString()
```

### Windows Command Prompt

```cmd
# Using PowerShell from CMD
powershell -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))"
```

## 📚 Database Connection Strings

### MongoDB Local

```bash
# Default local connection
MONGODB_URI=mongodb://localhost:27017/rangu-fam

# With authentication
MONGODB_URI=mongodb://username:password@localhost:27017/rangu-fam

# Custom port
MONGODB_URI=mongodb://localhost:27018/rangu-fam
```

### MongoDB Atlas (Cloud)

1. **Get Connection String:**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

2. **Format:**
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster-name.mongodb.net/rangu-fam?retryWrites=true&w=majority
   ```

3. **Example:**
   ```bash
   MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/rangu-fam?retryWrites=true&w=majority
   ```

## 🎯 Discord Webhook URLs

### Get Discord Webhook URL:

1. **Go to your Discord server**
2. **Right-click on channel → Edit Channel**
3. **Go to Integrations → Webhooks**
4. **Create Webhook**
5. **Copy Webhook URL**

**Format:**
```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1234567890123456789/AbCdEfGhIjKlMnOpQrStUvWxYz1234567890-AbCdEfGhIjKlMnOpQrStUvWxYz123456
```

## 🔄 Complete Environment Setup

### Option 1: Automated Setup

```bash
# Generate all keys and create .env.local automatically
npm run keys:setup
```

### Option 2: Manual Setup

```bash
# 1. Generate all secrets
npm run keys:generate

# 2. Copy .env.example to .env.local
cp .env.example .env.local

# 3. Edit .env.local with generated values
nano .env.local  # or use your preferred editor

# 4. Validate configuration
npm run env:check
```

### Option 3: Generate Template File

```bash
# Generate complete .env template with secrets
node scripts/generate-keys.js env > .env.generated
```

## ✅ Validation Commands

```bash
# Check if all required variables are set
npm run env:check

# Validate configuration format
npm run env:validate

# Test database connection (requires app to be running)
npm run dev
```

## 🔒 Security Best Practices

### 1. **JWT Secret Requirements**
- **Minimum:** 32 characters (256 bits)
- **Recommended:** 64 characters (512 bits)
- **Use:** Random hex or base64 string

### 2. **Password Requirements**
- **Minimum:** 12 characters
- **Recommended:** 20+ characters
- **Include:** Upper, lower, numbers, symbols

### 3. **Storage Security**
- ✅ **DO:** Store in `.env.local` (gitignored)
- ✅ **DO:** Use environment variables in production
- ❌ **DON'T:** Commit secrets to git
- ❌ **DON'T:** Share secrets in chat/email

### 4. **Rotation Policy**
- **JWT secrets:** Rotate every 90 days
- **API keys:** Rotate every 30 days  
- **Passwords:** Rotate every 60 days

## 🚨 Emergency Recovery

### Lost JWT Secret
```bash
# Generate new JWT secret
npm run keys:jwt

# Update .env.local
# Note: This will invalidate all existing user sessions
```

### Compromised Keys
```bash
# 1. Generate all new secrets
npm run keys:generate

# 2. Update all environment files
# 3. Deploy to production immediately
# 4. Notify users if sessions are affected
```

## 📖 Environment Variable Reference

| Variable | Command | Purpose | Length |
|----------|---------|---------|---------|
| `JWT_SECRET` | `npm run keys:jwt` | Authentication tokens | 64 chars |
| `SESSION_SECRET` | `node scripts/generate-keys.js session` | Session encryption | 32 chars |
| `MONGODB_URI` | Manual setup | Database connection | Variable |
| `DISCORD_WEBHOOK_URL` | Manual setup | Notifications | Variable |
| `ADMIN_PASSWORD` | `npm run keys:password` | Admin access | 20+ chars |

## 🆘 Troubleshooting

### Command Not Found
```bash
# Make sure you're in the project directory
cd /path/to/rangu.fam

# Check if scripts exist
ls scripts/generate-keys.js

# Make script executable
chmod +x scripts/generate-keys.js
```

### Permission Denied
```bash
# On macOS/Linux
chmod +x scripts/generate-keys.js

# On Windows, run as Administrator
```

### Node.js Not Installed
```bash
# Install Node.js from nodejs.org
# Or using package manager:

# macOS with Homebrew
brew install node

# Ubuntu/Debian
sudo apt install nodejs npm

# Windows with Chocolatey
choco install nodejs
```

---

🔐 **Remember:** Keep your secrets secret! Never share or commit them to version control.