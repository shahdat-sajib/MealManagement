import React, { useState } from 'react';
import WeeklyAdminDashboard from './WeeklyAdminDashboard';
import WeeklyPaymentReceipts from '../components/WeeklyPaymentReceipts';
import AdvancePaymentManager from '../components/AdvancePaymentManager';

const EnhancedAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'Weekly Dashboard', icon: '📊' },
    { id: 'payments', name: 'Payment Receipts', icon: '💰' },
    { id: 'advance', name: 'Advance Management', icon: '💳' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <WeeklyAdminDashboard />;
      case 'payments':
        return <WeeklyPaymentReceipts />;
      case 'advance':
        return <AdvancePaymentManager />;
      default:
        return <WeeklyAdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;