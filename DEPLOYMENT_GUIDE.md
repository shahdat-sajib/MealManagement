# 🚀 Meal Management App - Deployment Guide

## Prerequisites Checklist
- [ ] MongoDB Atlas account created
- [ ] GitHub repository with your code
- [ ] Railway account created  
- [ ] Vercel account created

## 📊 MongoDB Atlas Setup
- [ ] Create M0 (Free) cluster
- [ ] Add database user with read/write permissions
- [ ] Configure network access (allow all IPs for now)
- [ ] Copy connection string

## 🛠️ Backend Deployment (Railway)
- [ ] Connect GitHub repository to Railway
- [ ] Set root directory to `server`
- [ ] Configure environment variables:
  - `MONGODB_URI`: Your Atlas connection string
  - `JWT_SECRET`: Generate a strong secret
  - `NODE_ENV`: production
  - `CORS_ORIGIN`: Your Vercel frontend URL
- [ ] Deploy and get Railway backend URL

## 🎨 Frontend Deployment (Vercel) 
- [ ] Connect GitHub repository to Vercel
- [ ] Set root directory to `client`
- [ ] Configure environment variables:
  - `REACT_APP_API_URL`: Your Railway backend URL + /api
- [ ] Deploy and get Vercel frontend URL

## 🔄 Final Configuration
- [ ] Update Railway CORS_ORIGIN with your Vercel URL
- [ ] Test all functionality:
  - [ ] User registration/login
  - [ ] Add/edit/delete meals
  - [ ] Add/edit/delete purchases  
  - [ ] Dashboard calculations
  - [ ] Admin advance payments

## 📝 Example Environment Variables

### Railway (Backend):
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/meal-management?retryWrites=true&w=majority
JWT_SECRET=super-secret-jwt-key-for-production-make-it-long-and-random
NODE_ENV=production
CORS_ORIGIN=https://meal-management-app.vercel.app
```

### Vercel (Frontend):
```
REACT_APP_API_URL=https://meal-management-backend.railway.app/api
```

## 🛡️ Security Notes
- Use strong, unique passwords for MongoDB
- Generate a cryptographically secure JWT secret
- Consider restricting MongoDB network access to specific IPs in production
- Enable HTTPS only in production

## 📱 Testing Your Deployed App
1. Visit your Vercel URL
2. Register a new account
3. Add some meals and purchases
4. Check dashboard calculations
5. Test admin features with seeded admin account

## 🐛 Troubleshooting
- Check Railway logs for backend errors
- Check Vercel build logs for frontend issues  
- Ensure environment variables are set correctly
- Verify MongoDB connection string is valid
- Check CORS configuration if frontend can't reach backend

## 📈 Scaling Considerations
- Railway: $5/month for more resources
- Vercel: Free tier is generous for most use cases
- MongoDB Atlas: M2 tier ($9/month) for production workloads
- Consider CDN for static assets
- Add monitoring and error tracking (Sentry, LogRocket)

## 🚀 Free Hosting Limits
**Railway Free Tier:**
- $5 credit per month
- Good for small apps
- Automatic SSL

**Vercel Free Tier:**
- Unlimited static sites
- 100GB bandwidth/month
- Automatic SSL & CDN

**MongoDB Atlas Free Tier:**
- 512MB storage
- Shared cluster
- Good for development/small apps