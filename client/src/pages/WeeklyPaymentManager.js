import React, { useState, useEffect } from 'react';
import { dashboardApi, advancePaymentsApi } from '../services/api';
import { formatCurrency, getCurrentMonthYear, getMonthOptions, formatDateForDisplay } from '../utils/helpers';
import toast from 'react-hot-toast';

const WeeklyPaymentManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState({
    show: false,
    userId: '',
    userName: '',
    dueAmount: 0,
    paymentAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchPaymentHistory();
  }, [selectedMonth, selectedWeek]);

  const fetchUsers = async () => {
    try {
      const response = await dashboardApi.getUsersWithBalance();
      if (response.success) {
        setUsers(response.data);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error loading users');
    }
    setLoading(false);
  };

  const fetchPaymentHistory = async () => {
    try {
      // This would be enhanced to get payments for specific week/month
      const response = await dashboardApi.getMyPayments();
      if (response.success) {
        setPaymentHistory(response.data);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  const handleReceivePayment = (user) => {
    setPaymentModal({
      show: true,
      userId: user._id,
      userName: user.name,
      dueAmount: user.dueAmount || 0,
      paymentAmount: user.dueAmount ? user.dueAmount.toFixed(2) : '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: `Weekly payment received from ${user.name}`
    });
  };

  const handlePaymentSubmit = async () => {
    const { userId, userName, dueAmount, paymentAmount, paymentDate, notes } = paymentModal;
    const amount = parseFloat(paymentAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (!paymentDate) {
      toast.error('Please select payment date');
      return;
    }

    try {
      let response;
      
      if (dueAmount > 0) {
        // If user has due, use due clearance endpoint
        const clearanceData = {
          userId,
          dueAmount,
          paymentAmount: amount,
          paymentDate,
          notes
        };
        response = await dashboardApi.clearUserDue(clearanceData);
      } else {
        // If no due, add as advance payment
        const advanceData = {
          userId,
          amount,
          date: paymentDate,
          notes
        };
        response = await advancePaymentsApi.addPayment(advanceData);
      }

      if (response.success) {
        toast.success(`Payment of $${amount.toFixed(2)} recorded for ${userName}`);
        setPaymentModal({
          show: false,
          userId: '',
          userName: '',
          dueAmount: 0,
          paymentAmount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        fetchUsers();
        fetchPaymentHistory();
      } else {
        toast.error(response.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Payment Manager</h1>
          <p className="text-gray-600">Record weekly payments and manage user dues</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Month Selection */}
          <select
            value={`${selectedMonth.year}-${selectedMonth.month.toString().padStart(2, '0')}`}
            onChange={(e) => {
              const [year, month] = e.target.value.split('-');
              setSelectedMonth({
                month: parseInt(month),
                year: parseInt(year),
                display: `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`
              });
            }}
            className="input max-w-xs"
          >
            {getMonthOptions().map(option => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Week Selection */}
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            className="input max-w-xs"
          >
            <option value={1}>Week 1 (1-7)</option>
            <option value={2}>Week 2 (8-14)</option>
            <option value={3}>Week 3 (15-21)</option>
            <option value={4}>Week 4 (22-28)</option>
            <option value={5}>Week 5 (29-31)</option>
          </select>
        </div>
      </div>

      {/* Users Payment Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Users & Payment Status</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Advance Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500 ml-2">({user.role})</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      (user.advanceBalance || 0) > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {formatCurrency(user.advanceBalance || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isDue ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Due: {formatCurrency(user.dueAmount || 0)}
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        No Due
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleReceivePayment(user)}
                      className="text-blue-600 hover:text-blue-900 text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded"
                      title="Record Payment"
                    >
                      📝 Record Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal.show && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Record Payment
              </h3>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Recording payment for <strong>{paymentModal.userName}</strong>
                  </p>
                  {paymentModal.dueAmount > 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      Current Due: <strong>{formatCurrency(paymentModal.dueAmount)}</strong>
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentModal.paymentAmount}
                    onChange={(e) => setPaymentModal({ ...paymentModal, paymentAmount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Amount received"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentModal.paymentDate}
                    onChange={(e) => setPaymentModal({ ...paymentModal, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={paymentModal.notes}
                    onChange={(e) => setPaymentModal({ ...paymentModal, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Payment details..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setPaymentModal({
                    show: false,
                    userId: '',
                    userName: '',
                    dueAmount: 0,
                    paymentAmount: '',
                    paymentDate: new Date().toISOString().split('T')[0],
                    notes: ''
                  })}
                  className="px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-md hover:bg-gray-600 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 focus:outline-none"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Payments Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payment Activity</h3>
        <div className="space-y-2">
          {paymentHistory.slice(0, 10).map((payment, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {payment.paymentType === 'due_clearance' ? '💰 Due Cleared' : '💳 Payment Received'}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDateForDisplay(payment.date)} • Added by {payment.addedBy}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(Math.abs(payment.amount))}
                </p>
                {payment.clearedDueAmount > 0 && (
                  <p className="text-xs text-gray-500">
                    Cleared {formatCurrency(payment.clearedDueAmount)} due
                  </p>
                )}
              </div>
            </div>
          ))}
          {paymentHistory.length === 0 && (
            <p className="text-gray-500 text-center py-4">No recent payment activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyPaymentManager;