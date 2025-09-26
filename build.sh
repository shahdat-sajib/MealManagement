#!/bin/bash
# Render.com build script for monorepo

echo "🚀 Starting Render build for Meal Management API..."
echo "📁 Current directory: $(pwd)"
echo "📂 Directory contents:"
ls -la

echo "🔧 Installing server dependencies..."
cd server
npm install

echo "✅ Build completed successfully!"
echo "🎯 Ready to start server with: npm start"