const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware - More permissive CORS for Vercel deployments
const corsOptions = {
  origin: function (origin, callback) {
    console.log('🌐 CORS Check - Origin:', origin);
    
    // Allow requests with no origin
    if (!origin) {
      console.log('✅ No origin - allowing');
      return callback(null, true);
    }
    
    // In development, allow localhost
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost')) {
        console.log('✅ Development localhost - allowing');
        return callback(null, true);
      }
    }
    
    // Allow all Vercel deployments for your account
    if (origin.includes('.vercel.app') && origin.includes('shahdats-projects')) {
      console.log('✅ Vercel deployment - allowing');
      return callback(null, true);
    }
    
    // Allow specific environment variable
    if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
      console.log('✅ Environment CORS_ORIGIN - allowing');
      return callback(null, true);
    }
    
    // For development and testing, be more permissive
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      console.log('✅ Local development - allowing');
      return callback(null, true);
    }
    
    console.log('❌ CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Add CORS debugging
app.use((req, res, next) => {
  console.log('📥 Request from origin:', req.headers.origin);
  console.log('📋 Request method:', req.method);
  console.log('🎯 Request URL:', req.url);
  next();
});

// Manual CORS headers for maximum compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow Vercel deployments
  if (origin && (
    origin.includes('.vercel.app') || 
    origin.includes('localhost') || 
    origin.includes('127.0.0.1') ||
    origin === process.env.CORS_ORIGIN
  )) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    console.log('✅ Manual CORS headers set for:', origin);
  }
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS preflight request');
    res.status(200).end();
    return;
  }
  
  next();
});

app.use(cors(corsOptions));
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meal-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/meals', require('./routes/meals'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/advance-payments', require('./routes/advancePayments'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Meal Management API is running successfully', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Meal Management API', 
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      meals: '/api/meals',
      purchases: '/api/purchases',
      dashboard: '/api/dashboard',
      advancePayments: '/api/advance-payments'
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});