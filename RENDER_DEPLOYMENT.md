# Render Deployment Guide for Meal Management Backend

## 🎯 Quick Render Deployment

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with your GitHub account
3. Authorize Render to access your repositories

### Step 2: Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository: `shahdat-sajib/MealManagement`
3. Configure the service:

**Basic Settings:**
- **Name:** `meal-management-api`
- **Region:** Choose closest to your users
- **Branch:** `main`
- **Root Directory:** `server`
- **Runtime:** `Node`

**Build & Deploy:**
- **Build Command:** `npm install`
- **Start Command:** `npm start`

**Environment Variables:**
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mealmanagement
JWT_SECRET=your-super-secret-jwt-key-here
PORT=10000
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

### Step 3: Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Get your backend URL: `https://meal-management-api.onrender.com`

### Step 4: Update Frontend
Update your Vercel app's environment variable:
```
REACT_APP_API_URL=https://meal-management-api.onrender.com/api
```

## 🔧 Alternative Free Hosting Options

### Option 2: Cyclic.sh
- **URL:** https://app.cyclic.sh
- **Pros:** Very simple, great for Express apps
- **Setup:** Connect GitHub → Deploy
- **Root Directory:** Set to `server`

### Option 3: Glitch
- **URL:** https://glitch.com
- **Pros:** Live code editing, very beginner friendly
- **Setup:** Import from GitHub
- **Note:** May need to restructure slightly

### Option 4: Fly.io
- **URL:** https://fly.io
- **Pros:** Excellent performance, Docker-based
- **Free Tier:** Good limits
- **Setup:** Uses `fly.toml` config

## 🚀 Render is Recommended!
Render works excellently with monorepos and has the best free tier for our use case.