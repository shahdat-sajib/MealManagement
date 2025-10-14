import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { usersApi, advancePaymentsApi, dashboardApi } from '../services/api';

const AdvancePaymentManager = () => {
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
    notes: ''
  });
  const [deductionModal, setDeductionModal] = useState({
    show: false,
    userId: '',
    userName: '',
    currentBalance: 0,
    amount: ''
  });
  
  const [dueClearanceModal, setDueClearanceModal] = useState({
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
    fetchPayments();
  }, []);

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
  };

  const fetchPayments = async () => {
    try {
      const response = await advancePaymentsApi.getPayments();
      if (response.success) {
        setPayments(response.data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.userId || !formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please select a user and enter a valid amount');
      return;
    }

    setLoading(true);
    
    try {
      const response = await advancePaymentsApi.addPayment(formData);

      if (response.success) {
        toast.success('Advance payment added successfully');
        setFormData({ userId: '', amount: '', notes: '' });
        fetchPayments();
        fetchUsers();
      } else {
        toast.error(response.error || 'Failed to add advance payment');
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Failed to add advance payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;

    try {
      const response = await advancePaymentsApi.deletePayment(paymentId);

      if (response.success) {
        toast.success('Payment deleted successfully');
        fetchPayments();
        fetchUsers();
      } else {
        toast.error(response.error || 'Failed to delete payment');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    }
  };

  const handleDeductAmount = (user) => {
    setDeductionModal({
      show: true,
      userId: user._id,
      userName: user.name,
      currentBalance: user.advanceBalance || 0,
      amount: ''
    });
  };

  const handleClearBalance = async (user) => {
    const confirmMessage = `Are you sure you want to clear the advance balance for ${user.name}?\nCurrent balance: $${(user.advanceBalance || 0).toFixed(2)}\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      const deductionData = {
        userId: user._id,
        amount: -(user.advanceBalance || 0),
        notes: `Balance cleared by admin - Previous balance: $${(user.advanceBalance || 0).toFixed(2)}`
      };

      console.log('🔗 Clearing balance with data:', deductionData);
      const response = await advancePaymentsApi.addPayment(deductionData);

      if (response.success) {
        toast.success(`Balance cleared for ${user.name}`);
        fetchUsers();
        fetchPayments();
      } else {
        toast.error(response.error || 'Failed to clear balance');
      }
    } catch (error) {
      console.error('Error clearing balance:', error);
      toast.error('Failed to clear balance');
    }
  };

  const handleDeductSubmit = async () => {
    const amount = parseFloat(deductionModal.amount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > deductionModal.currentBalance) {
      toast.error('Deduction amount cannot exceed current balance');
      return;
    }

    try {
      const deductionData = {
        userId: deductionModal.userId,
        amount: -amount,
        notes: `Deduction by admin: $${amount.toFixed(2)}`
      };

      console.log('🔗 Deducting amount with data:', deductionData);
      const response = await advancePaymentsApi.addPayment(deductionData);

      if (response.success) {
        toast.success(`$${amount.toFixed(2)} deducted from ${deductionModal.userName}'s balance`);
        setDeductionModal({ show: false, userId: '', userName: '', currentBalance: 0, amount: '' });
        fetchUsers();
        fetchPayments();
      } else {
        toast.error(response.error || 'Failed to deduct amount');
      }
    } catch (error) {
      console.error('Error deducting amount:', error);
      toast.error('Failed to deduct amount');
    }
  };

  const handleClearDue = (user) => {
    if (!user.isDue || user.dueAmount <= 0) {
      toast.error('User has no due amount to clear');
      return;
    }

    setDueClearanceModal({
      show: true,
      userId: user._id,
      userName: user.name,
      dueAmount: user.dueAmount,
      paymentAmount: user.dueAmount.toFixed(2),
      paymentDate: new Date().toISOString().split('T')[0],
      notes: `Manual payment received by ${user.name} - Due clearance`
    });
  };

  const handleDueClearanceSubmit = async () => {
    const { userId, userName, dueAmount, paymentAmount, paymentDate, notes } = dueClearanceModal;
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
      const clearanceData = {
        userId,
        dueAmount,
        paymentAmount: amount,
        paymentDate,
        notes
      };

      console.log('🔗 Clearing due with data:', clearanceData);
      const response = await dashboardApi.clearUserDue(clearanceData);

      if (response.success) {
        toast.success(`Due cleared for ${userName}! Payment of $${amount.toFixed(2)} recorded.`);
        setDueClearanceModal({
          show: false,
          userId: '',
          userName: '',
          dueAmount: 0,
          paymentAmount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        fetchUsers();
        fetchPayments();
      } else {
        toast.error(response.error || 'Failed to clear due');
      }
    } catch (error) {
      console.error('Error clearing due:', error);
      toast.error('Failed to clear due');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Add Advance Payment
        </h3>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select User
            </label>
            <select
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose user...</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.role}) - ${(user.advanceBalance || 0).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Payment notes..."
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Payment'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          👥 User Advance Balances
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
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
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      (user.advanceBalance || 0) > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      ${(user.advanceBalance || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isDue ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Due: ${(user.dueAmount || 0).toFixed(2)}
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        No Due
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      {(user.advanceBalance || 0) > 0 && (
                        <>
                          <button
                            onClick={() => handleDeductAmount(user)}
                            className="text-orange-600 hover:text-orange-900 text-xs"
                            title="Deduct Amount"
                          >
                            Deduct
                          </button>
                          <button
                            onClick={() => handleClearBalance(user)}
                            className="text-red-600 hover:text-red-900 text-xs"
                            title="Clear Balance"
                          >
                            Clear
                          </button>
                        </>
                      )}
                      {user.isDue && (user.dueAmount || 0) > 0 && (
                        <button
                          onClick={() => handleClearDue(user)}
                          className="text-blue-600 hover:text-blue-900 text-xs"
                          title="Clear Due Manually"
                        >
                          Clear Due
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deductionModal.show && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Deduct Amount
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 mb-4">
                  Deduct from <strong>{deductionModal.userName}</strong>'s advance balance
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Current Balance: <strong>${deductionModal.currentBalance.toFixed(2)}</strong>
                </p>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={deductionModal.currentBalance}
                  value={deductionModal.amount}
                  onChange={(e) => setDeductionModal({ ...deductionModal, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Amount to deduct"
                />
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleDeductSubmit}
                  className="px-4 py-2 bg-orange-500 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  Deduct
                </button>
                <button
                  onClick={() => setDeductionModal({ show: false, userId: '', userName: '', currentBalance: 0, amount: '' })}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dueClearanceModal.show && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Clear Due Manually
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 mb-4">
                  Clear due for <strong>{dueClearanceModal.userName}</strong>
                </p>
                <p className="text-sm text-red-600 mb-4">
                  Current Due: <strong>${dueClearanceModal.dueAmount.toFixed(2)}</strong>
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={dueClearanceModal.paymentAmount}
                      onChange={(e) => setDueClearanceModal({ ...dueClearanceModal, paymentAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Amount paid by user"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={dueClearanceModal.paymentDate}
                      onChange={(e) => setDueClearanceModal({ ...dueClearanceModal, paymentDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={dueClearanceModal.notes}
                      onChange={(e) => setDueClearanceModal({ ...dueClearanceModal, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="2"
                      placeholder="Payment details..."
                    />
                  </div>
                </div>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleDueClearanceSubmit}
                  className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  Clear Due
                </button>
                <button
                  onClick={() => setDueClearanceModal({
                    show: false,
                    userId: '',
                    userName: '',
                    dueAmount: 0,
                    paymentAmount: '',
                    paymentDate: new Date().toISOString().split('T')[0],
                    notes: ''
                  })}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Payment History
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map(payment => (
                <tr key={payment._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(payment.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.user?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      payment.amount >= 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {payment.amount >= 0 ? '+' : ''}${payment.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {payment.notes || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {payment.addedBy?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(payment._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete this payment record"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No advance payments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvancePaymentManager;
