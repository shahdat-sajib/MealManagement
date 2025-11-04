import React, { useState, useEffect } from 'react';
import { formatCurrency, getCurrentMonthYear, getMonthOptions } from '../utils/helpers';
import { dashboardApi } from '../services/api';
import toast from 'react-hot-toast';

const DueAdjustmentManager = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [adjustmentType, setAdjustmentType] = useState('credit');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [weeklyBalance, setWeeklyBalance] = useState(null);
  const [adjustmentHistory, setAdjustmentHistory] = useState([]);
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  useEffect(() => {
    if (selectedUser) {
      fetchWeeklyBalance();
      fetchAdjustmentHistory();
    }
  }, [selectedUser, selectedMonth, selectedWeek]);
  
  const fetchUsers = async () => {
    try {
      const result = await dashboardApi.getUsersWithBalance();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };
  
  const fetchWeeklyBalance = async () => {
    if (!selectedUser) return;
    
    try {
      const result = await dashboardApi.getDashboard({
        week: selectedWeek,
        month: selectedMonth.month,
        year: selectedMonth.year
      });
      
      if (result.success) {
        setWeeklyBalance(result.data.summary);
      }
    } catch (error) {
      console.error('Error fetching weekly balance:', error);
    }
  };
  
  const fetchAdjustmentHistory = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await fetch(`/api/due-adjustments/user/${selectedUser}?year=${selectedMonth.year}&month=${selectedMonth.month}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAdjustmentHistory(data);
      }
    } catch (error) {
      console.error('Error fetching adjustment history:', error);
    }
  };
  
  const handleAdjustment = async (e) => {
    e.preventDefault();
    
    if (!selectedUser || !adjustmentAmount || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/due-adjustments/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: selectedUser,
          year: selectedMonth.year,
          month: selectedMonth.month,
          week: selectedWeek,
          adjustmentAmount: amount,
          adjustmentType: adjustmentType,
          reason: reason,
          notes: notes
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        
        // Reset form
        setAdjustmentAmount('');
        setReason('');
        setNotes('');
        
        // Refresh data
        fetchWeeklyBalance();
        fetchAdjustmentHistory();
        fetchUsers(); // Update user balances
        
      } else {
        toast.error(data.message || 'Failed to apply adjustment');
      }
    } catch (error) {
      console.error('Error applying adjustment:', error);
      toast.error('Server error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const selectedUserInfo = users.find(u => u._id === selectedUser);
  
  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          🔧 Direct Due Adjustments
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Adjustment Form */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Make Adjustment</h4>
            
            <form onSubmit={handleAdjustment} className="space-y-4">
              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User *
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="">Choose a user...</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name} - {user.isDue ? `Due: ${formatCurrency(user.dueAmount)}` : `Balance: ${formatCurrency(user.advanceBalance)}`}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Time Period Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Month/Year
                  </label>
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
                    className="input w-full"
                  >
                    {getMonthOptions().map(option => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Week
                  </label>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                    className="input w-full"
                  >
                    <option value={1}>Week 1 (1st - 7th)</option>
                    <option value={2}>Week 2 (8th - 14th)</option>
                    <option value={3}>Week 3 (15th - 21st)</option>
                    <option value={4}>Week 4 (22nd - End)</option>
                    <option value={5}>Week 5 (if exists)</option>
                  </select>
                </div>
              </div>
              
              {/* Current Balance Display */}
              {weeklyBalance && selectedUserInfo && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Current Week Status:</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Weekly Balance:</span>
                      <span className={`ml-2 font-medium ${weeklyBalance.isDue ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(weeklyBalance.finalAmount)} ({weeklyBalance.status})
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Adjustments:</span>
                      <span className="ml-2 font-medium text-blue-600">
                        {formatCurrency(weeklyBalance.totalDueAdjustments || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Adjustment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adjustment Type *
                  </label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                    className="input w-full"
                    required
                  >
                    <option value="credit">Add Credit (+)</option>
                    <option value="debit">Add Debit (-)</option>
                    <option value="clear_due">Clear Due (Set to 0)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount * {adjustmentType === 'clear_due' && '(ignored for clear due)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    className="input w-full"
                    placeholder="0.00"
                    required={adjustmentType !== 'clear_due'}
                    disabled={adjustmentType === 'clear_due'}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="">Select reason...</option>
                  <option value="calculation_error">Calculation Error Correction</option>
                  <option value="refund_approval">Approved Refund</option>
                  <option value="penalty">Penalty Applied</option>
                  <option value="bonus_credit">Bonus Credit</option>
                  <option value="manual_adjustment">Manual Adjustment</option>
                  <option value="dispute_resolution">Dispute Resolution</option>
                  <option value="other">Other (specify in notes)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input w-full"
                  rows="3"
                  placeholder="Additional details about this adjustment..."
                />
              </div>
              
              <button
                type="submit"
                disabled={loading || !selectedUser}
                className="btn-primary w-full flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Applying Adjustment...
                  </>
                ) : (
                  'Apply Adjustment'
                )}
              </button>
            </form>
          </div>
          
          {/* Adjustment History */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Recent Adjustments</h4>
            
            {selectedUser ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {adjustmentHistory.length > 0 ? (
                  adjustmentHistory.map((adjustment) => (
                    <div key={adjustment._id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">
                          Week {adjustment.week}/{adjustment.month}/{adjustment.year}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          adjustment.adjustmentType === 'credit' ? 'bg-green-100 text-green-800' :
                          adjustment.adjustmentType === 'debit' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {adjustment.adjustmentType.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Amount: <span className="font-medium">{formatCurrency(adjustment.adjustmentAmount)}</span></div>
                        <div>From: <span className="font-medium">{formatCurrency(adjustment.previousBalance)}</span> → To: <span className="font-medium">{formatCurrency(adjustment.newBalance)}</span></div>
                        <div>Reason: <span className="font-medium">{adjustment.reason.replace('_', ' ')}</span></div>
                        {adjustment.notes && (
                          <div>Notes: <span className="italic">{adjustment.notes}</span></div>
                        )}
                        <div className="text-xs text-gray-400">
                          By: {adjustment.addedBy?.name} • {new Date(adjustment.adjustmentDate).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No adjustments found for this user and period
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Select a user to view adjustment history
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="card bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">📋 Instructions:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Credit (+):</strong> Adds money to user's balance (reduces due or increases credit)</li>
          <li><strong>Debit (-):</strong> Subtracts money from user's balance (increases due or reduces credit)</li>
          <li><strong>Clear Due:</strong> Sets the user's balance to exactly zero for the selected week</li>
          <li><strong>Week-Only Impact:</strong> Adjustments only affect the specific week selected, not subsequent weeks</li>
        </ul>
      </div>
    </div>
  );
};

export default DueAdjustmentManager;