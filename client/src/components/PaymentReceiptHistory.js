import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { formatCurrency } from '../utils/helpers';

const PaymentReceiptHistory = () => {
  const [paymentReceipts, setPaymentReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaymentReceipts();
  }, []);

  const fetchPaymentReceipts = async () => {
    try {
      const response = await fetch('/api/payment-receipts/user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setPaymentReceipts(data);
      } else {
        setError(data.message || 'Failed to fetch payment receipts');
      }
    } catch (error) {
      setError('Error fetching payment receipts');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method) => {
    const icons = {
      cash: '💵',
      bank_transfer: '🏦',
      online: '💳',
      check: '📄'
    };
    return icons[method] || '💰';
  };

  const getPaymentMethodColor = (method) => {
    const colors = {
      cash: 'bg-green-100 text-green-800',
      bank_transfer: 'bg-blue-100 text-blue-800',
      online: 'bg-purple-100 text-purple-800',
      check: 'bg-yellow-100 text-yellow-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-red-600 text-center py-4">
          <span className="text-2xl mb-2 block">⚠️</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment Receipt History</h3>
        <span className="text-sm text-gray-500">
          {paymentReceipts.length} receipt{paymentReceipts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {paymentReceipts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-4 block">💸</span>
          <p className="text-lg mb-2">No payment receipts found</p>
          <p className="text-sm">Payment receipts added by admin will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center">
                <span className="text-2xl mr-3">💰</span>
                <div>
                  <p className="text-sm font-medium text-green-700">Total Payments</p>
                  <p className="text-xl font-bold text-green-900">
                    {formatCurrency(paymentReceipts.reduce((sum, receipt) => sum + receipt.amount, 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📅</span>
                <div>
                  <p className="text-sm font-medium text-blue-700">Latest Payment</p>
                  <p className="text-lg font-bold text-blue-900">
                    {paymentReceipts.length > 0 
                      ? moment(paymentReceipts[0].paymentDate).format('MMM DD, YYYY')
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🏦</span>
                <div>
                  <p className="text-sm font-medium text-purple-700">Most Used Method</p>
                  <p className="text-lg font-bold text-purple-900">
                    {paymentReceipts.length > 0 
                      ? paymentReceipts.reduce((acc, receipt) => {
                          acc[receipt.paymentMethod] = (acc[receipt.paymentMethod] || 0) + 1;
                          return acc;
                        }, {})[Object.keys(paymentReceipts.reduce((acc, receipt) => {
                          acc[receipt.paymentMethod] = (acc[receipt.paymentMethod] || 0) + 1;
                          return acc;
                        }, {})).reduce((a, b) => paymentReceipts.reduce((acc, receipt) => {
                          acc[receipt.paymentMethod] = (acc[receipt.paymentMethod] || 0) + 1;
                          return acc;
                        }, {})[a] > paymentReceipts.reduce((acc, receipt) => {
                          acc[receipt.paymentMethod] = (acc[receipt.paymentMethod] || 0) + 1;
                          return acc;
                        }, {})[b] ? a : b)].replace('_', ' ')
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Receipt List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentReceipts.map((receipt) => (
                  <tr key={receipt._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="mr-2">📅</span>
                        {moment(receipt.paymentDate).format('MMM DD, YYYY')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {formatCurrency(receipt.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span className="font-medium">Week {receipt.week}</span>
                        <span className="text-xs text-gray-400">
                          {moment().month(receipt.month - 1).format('MMM')} {receipt.year}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="mr-2">{getPaymentMethodIcon(receipt.paymentMethod)}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentMethodColor(receipt.paymentMethod)}`}>
                          {receipt.paymentMethod.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        receipt.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {receipt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      <div className="truncate" title={receipt.notes}>
                        {receipt.notes || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentReceiptHistory;