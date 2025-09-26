#!/bin/bash

echo "🚀 Meal Management App - Environment Setup"
echo "=========================================="
echo ""

echo "📋 Before running this script, make sure you have:"
echo "1. Created a MongoDB Atlas cluster and copied the connection string"
echo "2. Deployed your backend to Railway and got the URL"
echo "3. Ready to deploy frontend to Vercel"
echo ""

read -p "Press Enter to continue..."

echo ""
echo "🔧 Setting up environment variables..."
echo ""

# Backend environment variables for Railway
echo "📊 Backend Environment Variables (for Railway):"
echo "=============================================="
echo "MONGODB_URI=<your-mongodb-atlas-connection-string>"
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "NODE_ENV=production"
echo "CORS_ORIGIN=https://<your-app-name>.vercel.app"
echo ""

# Frontend environment variables for Vercel  
echo "🎨 Frontend Environment Variables (for Vercel):"
echo "==============================================="
echo "REACT_APP_API_URL=https://<your-railway-app-name>.railway.app/api"
echo ""

echo "📝 Next Steps:"
echo "1. Copy the MongoDB connection string from Atlas"
echo "2. Deploy backend to Railway with above environment variables"
echo "3. Get Railway backend URL and update frontend environment variable"
echo "4. Deploy frontend to Vercel"
echo "5. Update Railway CORS_ORIGIN with your Vercel URL"
echo ""

echo "✅ Setup complete! Check DEPLOYMENT_GUIDE.md for detailed instructions."