# Deployment Guide: Vercel (Frontend) + Railway (Backend)

This guide explains how to deploy Ruzn-Lite as a split application with:
- **Frontend**: Vercel (React/Vite app)
- **Backend**: Railway (Express/tRPC API)
- **Database**: Railway PostgreSQL (consolidated from MySQL + pgvector)

## Why This Architecture?

| Concern | Solution | Reason |
|---------|----------|--------|
| Frontend hosting | Vercel | Best for React/Vite, free tier, great DX, edge caching |
| Backend hosting | Railway | Better for Node.js APIs, supports long-running processes |
| Database | Railway PostgreSQL | Built-in support, good for POC, easy to manage |
| Redis (optional) | Railway Redis | Add if you need rate limiting/caching |

### Why Railway over Netlify for Backend?
- Railway supports persistent databases natively
- Better for Express/Node.js backends with long-running processes
- Has PostgreSQL add-on (can consolidate MySQL into PostgreSQL)
- Simpler configuration for stateful backends
- Better logging and monitoring

---

## Prerequisites

1. GitHub account (repo already connected)
2. [Vercel account](https://vercel.com) (free tier available)
3. [Railway account](https://railway.app) (free tier with $5 credit)
4. Domain (optional): ruzn.ai or custom domain

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project

1. Go to [Railway](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select `MAJD-AI78/ruzn-lite` repository
4. Railway will auto-detect the Node.js project

### 1.2 Add PostgreSQL Database

1. In your Railway project, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway creates the database and provides `DATABASE_URL`
3. Copy the connection string (you'll need it for environment variables)

### 1.3 Configure Environment Variables

In Railway dashboard, go to **Variables** and add:

```bash
# Application
NODE_ENV=production
PORT=3000

# Database (Railway provides this automatically)
DATABASE_URL=${POSTGRES_URL}

# Knowledge Base (use same PostgreSQL)
KNOWLEDGE_BACKEND=pgvector
KNOWLEDGE_PGVECTOR_URL=${POSTGRES_URL}

# Deployment mode
PUBLIC_MODE=true
GOV_DEMO_MODE=false
SOVEREIGN_MODE=false

# Authentication (generate with: openssl rand -base64 32)
JWT_SECRET=your-jwt-secret-here
SESSION_SECRET=your-session-secret-here

# CORS (add your Vercel frontend URL)
CORS_ORIGINS=https://your-frontend.vercel.app,https://ruzn.ai

# LLM Provider
LLM_ENABLED_PROVIDERS=deepseek
DEEPSEEK_API_KEY=your-deepseek-key

# Embeddings
EMBEDDINGS_BACKEND=openai
OPENAI_API_KEY=your-openai-key

# OAuth (if using Manus OAuth)
OAUTH_SERVER_URL=https://api.manus.im
VITE_APP_ID=your-app-id
```

### 1.4 Enable pgvector Extension

Run this SQL in Railway's PostgreSQL console:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 1.5 Deploy and Get Backend URL

1. Railway will auto-deploy from your main branch
2. Click **"Settings"** → **"Domains"** → **"Generate Domain"**
3. Note your backend URL (e.g., `ruzn-lite-api.railway.app`)

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Project

1. Go to [Vercel](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"** → **"Import Git Repository"**
3. Select `MAJD-AI78/ruzn-lite` repository

### 2.2 Configure Build Settings

Vercel should auto-detect settings from `vercel.json`, but verify:

- **Framework Preset**: Vite
- **Root Directory**: `./` (leave empty)
- **Build Command**: `pnpm vite build`
- **Output Directory**: `dist/public`
- **Install Command**: `pnpm install --frozen-lockfile`

### 2.3 Configure Environment Variables

In Vercel dashboard, go to **Settings** → **Environment Variables**:

```bash
# API URL (point to your Railway backend)
VITE_API_URL=https://ruzn-lite-api.railway.app

# OAuth configuration
VITE_OAUTH_PORTAL_URL=https://api.manus.im
VITE_APP_ID=your-app-id
```

### 2.4 Deploy

1. Click **"Deploy"** - Vercel builds and deploys
2. Get your frontend URL (e.g., `ruzn-lite.vercel.app`)
3. Add this URL to Railway's `CORS_ORIGINS`

---

## Step 3: Configure Custom Domain (Optional)

### For Vercel (Frontend):
1. Go to **Settings** → **Domains**
2. Add `ruzn.ai` or `app.ruzn.ai`
3. Update DNS with provided records

### For Railway (Backend):
1. Go to **Settings** → **Domains**
2. Add `api.ruzn.ai`
3. Update DNS with provided records

---

## Step 4: Database Migration

### Option A: Use PostgreSQL Only (Recommended for POC)

The app currently uses MySQL for primary data and PostgreSQL for knowledge. 
For POC, you can consolidate to PostgreSQL only:

1. Update `drizzle.config.ts` to use PostgreSQL dialect
2. Run migrations: `pnpm db:push`
3. Seed data if needed

### Option B: Keep MySQL + PostgreSQL

If you need MySQL:
1. Add MySQL service in Railway
2. Set `DATABASE_URL` to MySQL connection string
3. Keep `KNOWLEDGE_PGVECTOR_URL` for PostgreSQL

---

## Step 5: Verify Deployment

### Health Check
```bash
curl https://your-backend.railway.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-07T10:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### Test Frontend-Backend Connection
1. Open your Vercel frontend URL
2. Check browser console for API errors
3. Try a chat interaction

---

## Environment Variables Summary

### Vercel (Frontend)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend URL | `https://api.ruzn.ai` |
| `VITE_OAUTH_PORTAL_URL` | OAuth server | `https://api.manus.im` |
| `VITE_APP_ID` | App identifier | `your-app-id` |

### Railway (Backend)
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | Primary database | `postgres://...` |
| `KNOWLEDGE_PGVECTOR_URL` | Knowledge DB | `postgres://...` |
| `CORS_ORIGINS` | Allowed origins | `https://ruzn.ai` |
| `JWT_SECRET` | Auth secret | `random-32-bytes` |
| `DEEPSEEK_API_KEY` | LLM API key | `sk-...` |

---

## Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGINS` includes your Vercel domain
- Check that HTTPS is used for both frontend and backend
- Verify credentials are being sent (`credentials: 'include'`)

### Database Connection
- Check Railway logs for connection errors
- Verify `DATABASE_URL` is correctly set
- Ensure pgvector extension is enabled

### Build Failures
- Check that all dependencies are installed
- Verify `pnpm-lock.yaml` is committed
- Check Railway build logs for errors

---

## Estimated Costs (POC/Demo)

| Service | Free Tier | Paid (if exceeded) |
|---------|-----------|-------------------|
| Vercel | 100GB bandwidth/month | $20/month Pro |
| Railway | $5 free credit/month | $0.000463/min |
| PostgreSQL | Included in Railway | Included |
| Total (POC) | **$0-5/month** | Scale as needed |

---

## Security Checklist

- [ ] All API keys in environment variables, not in code
- [ ] HTTPS enabled on both frontend and backend
- [ ] CORS properly configured (not `*`)
- [ ] JWT secrets are unique and random
- [ ] Rate limiting enabled (if using Redis)
- [ ] Security headers configured (automatic with our setup)

---

## Next Steps

1. **Monitor**: Set up Railway/Vercel monitoring alerts
2. **Backups**: Configure Railway database backups
3. **Custom Domain**: Add SSL certificate for custom domain
4. **Scale**: Upgrade Railway plan if traffic increases
