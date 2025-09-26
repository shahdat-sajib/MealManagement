const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const moment = require('moment');

// Import models
const User = require('./models/User');
const Meal = require('./models/Meal');
const Purchase = require('./models/Purchase');
const AdvancePayment = require('./models/AdvancePayment');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meal-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Meal.deleteMany({});
    await Purchase.deleteMany({});
    await AdvancePayment.deleteMany({});

    console.log('🗑️ Cleared existing data');

    // Create users
    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin'
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'user'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'user'
      },
      {
        name: 'Mike Johnson',
        email: 'mike@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'user'
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`👥 Created ${createdUsers.length} users`);

    // Create meals for the past 10 days
    const meals = [];
    const mealDescriptions = [
      'Oatmeal with fruits',
      'Scrambled eggs and toast',
      'Pancakes with syrup',
      'Cereal with milk',
      'Avocado toast',
      'Breakfast burrito',
      'Yogurt and granola',
      'French toast',
      'Bagel with cream cheese',
      'Smoothie bowl'
    ];

    for (let i = 0; i < 10; i++) {
      const date = moment().subtract(i, 'days').startOf('day').toDate();
      
      // Each user has meals on different days (simulate realistic usage)
      createdUsers.forEach((user, userIndex) => {
        if (Math.random() > 0.3) { // 70% chance of having a meal
          meals.push({
            user: user._id,
            date: date,
            description: mealDescriptions[Math.floor(Math.random() * mealDescriptions.length)],
            mealType: 'breakfast',
            isScheduled: false
          });
        }
      });
    }

    const createdMeals = await Meal.insertMany(meals);
    console.log(`🍽️ Created ${createdMeals.length} meals`);

    // Create purchases
    const purchases = [];
    const purchaseNotes = [
      'Grocery shopping at Walmart',
      'Fresh vegetables from market',
      'Bread and dairy products',
      'Fruits and snacks',
      'Weekly grocery haul',
      'Quick stop at convenience store',
      'Bulk shopping at Costco',
      'Local farmer market',
      'Emergency food run',
      'Monthly grocery shopping'
    ];

    for (let i = 0; i < 15; i++) {
      const date = moment().subtract(Math.floor(Math.random() * 10), 'days').startOf('day').toDate();
      const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      
      purchases.push({
        user: randomUser._id,
        date: date,
        amount: Math.floor(Math.random() * 100) + 20, // $20-120
        notes: purchaseNotes[Math.floor(Math.random() * purchaseNotes.length)]
      });
    }

    const createdPurchases = await Purchase.insertMany(purchases);
    console.log(`💰 Created ${createdPurchases.length} purchases`);

    // Create some advance payments
    const advancePayments = [
      {
        user: createdUsers[1]._id, // John Doe
        amount: 50,
        notes: 'Initial advance payment',
        addedBy: createdUsers[0]._id, // Admin
        date: moment().subtract(5, 'days').toDate()
      },
      {
        user: createdUsers[2]._id, // Jane Smith
        amount: 75,
        notes: 'Monthly advance',
        addedBy: createdUsers[0]._id, // Admin
        date: moment().subtract(2, 'days').toDate()
      }
    ];

    const createdAdvancePayments = await AdvancePayment.insertMany(advancePayments);
    console.log(`💳 Created ${createdAdvancePayments.length} advance payments`);

    // Update user advance balances
    await User.findByIdAndUpdate(createdUsers[1]._id, { advanceBalance: 50 });
    await User.findByIdAndUpdate(createdUsers[2]._id, { advanceBalance: 75 });
    console.log('🔄 Updated user advance balances');

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('Admin: admin@example.com / admin123');
    console.log('User1: john@example.com / password123 (Advance: $50)');
    console.log('User2: jane@example.com / password123 (Advance: $75)');
    console.log('User3: mike@example.com / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedData();