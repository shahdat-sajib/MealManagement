import React, { useState, useEffect } from 'react';
import { purchasesApi } from '../services/api';
import { formatCurrency, formatDateForDisplay, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: formatDate(new Date()),
    amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchPurchases();
    fetchStats();
  }, []);

  const fetchPurchases = async () => {
    const result = await purchasesApi.getPurchases();
    
    if (result.success) {
      setPurchases(result.data.purchases);
    } else {
      toast.error('Failed to fetch purchases');
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const result = await purchasesApi.getStats();
    
    if (result.success) {
      setStats(result.data.stats);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const result = await purchasesApi.addPurchase(formData);
    
    if (result.success) {
      toast.success('Purchase added successfully!');
      setShowAddForm(false);
      setFormData({
        date: formatDate(new Date()),
        amount: '',
        notes: ''
      });
      fetchPurchases();
      fetchStats();
    } else {
      toast.error(result.error);
    }
  };

  const handleEditPurchase = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const result = await purchasesApi.updatePurchase(editingPurchase._id, {
      amount: parseFloat(formData.amount),
      notes: formData.notes
    });
    
    if (result.success) {
      toast.success('Purchase updated successfully!');
      setShowEditForm(false);
      setEditingPurchase(null);
      fetchPurchases();
      fetchStats();
    } else {
      toast.error(result.error);
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      const result = await purchasesApi.deletePurchase(purchaseId);
      
      if (result.success) {
        toast.success('Purchase deleted successfully!');
        fetchPurchases();
        fetchStats();
      } else {
        toast.error(result.error);
      }
    }
  };

  const openEditForm = (purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      date: formatDate(purchase.date),
      amount: purchase.amount.toString(),
      notes: purchase.notes || ''
    });
    setShowEditForm(true);
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
          <h1 className="text-3xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-600">Track and manage your food purchases</p>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary"
        >
          Add Purchase
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-success-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPurchases}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averageAmount)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">🛒</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(stats.dailyBreakdown).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchases Table */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Purchase History</h3>
          <div className="text-sm text-gray-600">
            Total: {formatCurrency(purchases.reduce((sum, purchase) => sum + purchase.amount, 0))}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchases.length > 0 ? (
                purchases.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateForDisplay(purchase.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(purchase.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {purchase.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => openEditForm(purchase)}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePurchase(purchase._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No purchases recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Breakdown */}
      {stats && Object.keys(stats.dailyBreakdown).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(stats.dailyBreakdown)
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 9)
              .map((day) => (
                <div key={day.date} className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-900">{formatDateForDisplay(day.date)}</p>
                  <p className="text-sm text-gray-600">{day.count} purchase{day.count !== 1 ? 's' : ''}</p>
                  <p className="text-lg font-semibold text-primary-600">{formatCurrency(day.amount)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Purchase</h3>
            <form onSubmit={handleAddPurchase} className="space-y-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="mt-1 input"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Amount ($)
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="mt-1 input"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="mt-1 input"
                  rows="3"
                  placeholder="e.g., Groceries from supermarket..."
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Purchase Modal */}
      {showEditForm && editingPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Purchase</h3>
            <form onSubmit={handleEditPurchase} className="space-y-4">
              <div>
                <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  id="edit-date"
                  value={formData.date}
                  className="mt-1 input bg-gray-100"
                  disabled
                />
              </div>
              
              <div>
                <label htmlFor="edit-amount" className="block text-sm font-medium text-gray-700">
                  Amount ($)
                </label>
                <input
                  type="number"
                  id="edit-amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="mt-1 input"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  id="edit-notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="mt-1 input"
                  rows="3"
                  placeholder="e.g., Groceries from supermarket..."
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingPurchase(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;