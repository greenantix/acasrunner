# Leo Runner Environment Setup Guide

This guide will help you properly configure environment variables for Leo Runner.

## 🚀 Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your API keys:**
   Edit `.env` and replace placeholder values with your real API keys.

3. **Verify setup:**
   ```bash
   ./start.sh --skip-checks  # Quick start without validation
   # OR
   ./start.sh                # Full startup with environment validation
   ```

## 📁 Environment File Structure

| File | Purpose | Committed? | Priority |
|------|---------|------------|----------|
| `.env.example` | Template with all options | ✅ Yes | - |
| `.env` | Main environment file | ❌ No | 1 |
| `.env.local` | Personal overrides | ❌ No | 2 (highest) |
| `.env.development` | Development overrides | ❌ No | 3 |
| `.env.production` | Production overrides | ❌ No | 3 |

**Priority:** Higher numbers override lower numbers.

## 🔑 Required API Keys

### LLM Providers (At least one required)

#### Claude (Anthropic) - Recommended
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```
- **Get from:** https://console.anthropic.com/
- **Best for:** Code analysis, security reviews, critical bug fixes
- **Free tier:** Limited requests
- **Paid plans:** Start at $20/month

#### OpenAI
```bash
OPENAI_API_KEY=sk-xxx
```
- **Get from:** https://platform.openai.com/api-keys
- **Best for:** Performance optimization, general coding
- **Free tier:** $5 credit for new accounts
- **Paid plans:** Pay-as-you-go

#### Google Gemini
```bash
GOOGLE_API_KEY=AIzaSyxxx
```
- **Get from:** https://aistudio.google.com/app/apikey
- **Best for:** Documentation, dependency analysis
- **Free tier:** Generous limits
- **Paid plans:** Competitive pricing

### Firebase (Required for full functionality)

#### Client Configuration
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

#### Server Configuration
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Setup:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Go to Project Settings > General tab for client config
4. Go to Project Settings > Service Accounts tab for server config
5. Generate a new private key and download the JSON
6. Extract values to your `.env` file

## 🏠 Local LLM (Ollama) - Optional

```bash
OLLAMA_BASE_URL=http://localhost:11434
```

**Setup:**
1. Install Ollama: https://ollama.ai
2. Pull models:
   ```bash
   ollama pull llama3.2        # General purpose
   ollama pull codellama       # Code-specific
   ollama pull deepseek-coder  # Advanced coding
   ```
3. Start Ollama: `ollama serve`

**Benefits:**
- No API costs
- Privacy (runs locally)
- Fast responses
- No internet required

## 🛠️ Environment-Specific Setup

### Development Environment
```bash
cp .env.development.example .env.development
```
- Enables debugging
- More verbose logging
- Source maps enabled
- Relaxed rate limiting

### Production Environment
```bash
cp .env.production.example .env.production
```
- Optimized for performance
- Security-focused settings
- Error monitoring enabled
- Strict rate limiting

### Personal/Local Overrides
```bash
cp .env.local.example .env.local
```
- Personal API keys
- Individual debugging preferences
- Local development settings

## 🔒 Security Best Practices

### API Key Security
- **Never commit** `.env` files with real keys
- **Use different keys** for development and production
- **Rotate keys regularly** (every 3-6 months)
- **Limit key permissions** when possible
- **Monitor key usage** for unusual activity

### Firebase Security
- **Enable security rules** in Firestore
- **Use least privilege** for service accounts
- **Enable audit logs** in production
- **Monitor authentication** for suspicious activity

### Environment Variables
```bash
# Strong secrets (use a password generator)
JWT_SECRET=your_super_secret_jwt_key_here
SESSION_SECRET=your_session_secret_here

# CORS configuration (production)
CORS_ORIGIN=https://yourdomain.com  # Never use * in production
```

## 🧪 Testing Your Setup

### 1. Basic Connectivity Test
```bash
curl http://localhost:9002/api/health
```

### 2. LLM Provider Test
```bash
curl http://localhost:9002/api/llm-providers/test
```

### 3. Specific Provider Test
```bash
curl -X POST http://localhost:9002/api/llm-providers/test \
  -H "Content-Type: application/json" \
  -d '{"providerId": "claude-sonnet", "prompt": "Hello test"}'
```

### 4. Environment Validation
The startup script automatically validates your environment:
```bash
./start.sh  # Runs full validation
```

## 🚨 Troubleshooting

### Common Issues

#### "No LLM providers available"
- **Cause:** No valid API keys configured
- **Solution:** Add at least one API key to `.env`
- **Check:** API key format and validity

#### "Firebase initialization failed"
- **Cause:** Invalid Firebase configuration
- **Solution:** Verify all Firebase environment variables
- **Check:** Project ID and private key format

#### "Ollama not found"
- **Cause:** Ollama not installed or not running
- **Solution:** Install Ollama and run `ollama serve`
- **Check:** Port 11434 is available

#### "Port already in use"
- **Cause:** Another service using port 9002
- **Solution:** Change port or kill conflicting process
- **Check:** `lsof -i :9002`

### Environment Validation
```bash
# Check what's loaded
node -e "require('dotenv').config(); console.log(process.env.ANTHROPIC_API_KEY ? 'Claude: ✓' : 'Claude: ✗')"

# Validate Firebase
node -e "console.log(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Firebase: ✓' : 'Firebase: ✗')"

# Check Ollama
curl -s http://localhost:11434/api/tags && echo "Ollama: ✓" || echo "Ollama: ✗"
```

## 📚 Additional Resources

- [Anthropic API Docs](https://docs.anthropic.com/)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Google AI Studio](https://aistudio.google.com/)
- [Firebase Setup Guide](https://firebase.google.com/docs/web/setup)
- [Ollama Documentation](https://ollama.ai/docs)

## 🆘 Getting Help

If you're still having issues:

1. **Check the logs:** `./start.sh` provides detailed error messages
2. **Validate manually:** Use the test endpoints above
3. **Compare with examples:** Check the `.env.example` file
4. **Reset and retry:** Start with a fresh `.env` file

---

**Next Steps:** Once your environment is configured, run `./start.sh` to start Leo Runner!