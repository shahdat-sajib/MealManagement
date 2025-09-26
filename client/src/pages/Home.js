import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-4xl">🍽️</span>
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Meal & Expense Management
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Track your daily breakfast meals, manage purchases, and calculate expenses with ease. 
            Schedule meals up to 15 days in advance and get detailed balance reports.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-lg"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg border-2 border-primary-600 hover:bg-primary-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-success-600 text-2xl">📅</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Meal Planning
            </h3>
            <p className="text-gray-600">
              Schedule your breakfast meals up to 15 days in advance. Add meals until 9 AM daily with an interactive calendar view.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-primary-600 text-2xl">💰</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Purchase Tracking
            </h3>
            <p className="text-gray-600">
              Record all your food purchases with dates and amounts. Edit, view, and manage your purchase history effortlessly.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="w-12 h-12 bg-danger-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-danger-600 text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Expense Calculation
            </h3>
            <p className="text-gray-600">
              Automatic daily expense calculation based on meals and purchases. Get detailed due/refund reports and balance summaries.
            </p>
          </div>
        </div>

        {/* How it Works Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Register Account</h4>
              <p className="text-gray-600 text-sm">Create your account and set up your profile</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Add Meals</h4>
              <p className="text-gray-600 text-sm">Schedule your daily breakfast meals using the calendar</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Track Purchases</h4>
              <p className="text-gray-600 text-sm">Record your food purchases with amounts and dates</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                4
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">View Reports</h4>
              <p className="text-gray-600 text-sm">Get detailed expense reports and balance calculations</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Start Managing Your Meals?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join now and take control of your meal expenses today.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-lg"
          >
            Create Free Account
            <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;