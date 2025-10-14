const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Simplified CORS - Allow all origins for now to test
const corsOptions = {
  origin: true, // Allow all origins temporarily
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

// Simple CORS headers - Allow everything for testing
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('🌐 Request from origin:', origin);
  
  // Set permissive CORS headers
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS preflight for:', origin);
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
app.use('/api/calculation', require('./routes/calculation'));
app.use('/api/payment-receipts', require('./routes/paymentReceipts'));

// Test CORS endpoint
app.get('/api/test-cors', (req, res) => {
  console.log('🧪 CORS test endpoint hit from:', req.headers.origin);
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

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