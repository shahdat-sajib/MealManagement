import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import moment from 'moment';

const WeeklyPaymentReceipts = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(moment().format('YYYY-MM-DD'));
  const [notes, setNotes] = useState('');
  const [paymentReceipts, setPaymentReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Generate weeks for current year
  const generateWeeks = () => {
    const weeks = [];
    for (let i = 1; i <= 5; i++) {
      weeks.push({ value: i, label: `Week ${i} (${i * 7 - 6}-${i * 7})` });
    }
    return weeks;
  };

  // Generate months
  const generateMonths = () => {
    return moment.months().map((month, index) => ({
      value: index + 1,
      label: month
    }));
  };

  // Generate years (current and previous 2 years)
  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear];
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
    fetchPaymentReceipts();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data.filter(user => !user.isAdmin));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPaymentReceipts = async () => {
    try {
      const response = await fetch('/api/payment-receipts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setPaymentReceipts(data);
      }
    } catch (error) {
      console.error('Error fetching payment receipts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedUser || !amount || !selectedWeek || !selectedMonth) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/payment-receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          user: selectedUser,
          amount: parseFloat(amount),
          paymentDate,
          paymentMethod,
          week: parseInt(selectedWeek),
          month: parseInt(selectedMonth),
          year: selectedYear,
          notes
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Payment receipt added successfully!');
        // Reset form
        setSelectedUser('');
        setAmount('');
        setNotes('');
        setSelectedWeek('');
        setSelectedMonth('');
        setPaymentDate(moment().format('YYYY-MM-DD'));
        // Refresh receipts
        fetchPaymentReceipts();
      } else {
        setError(data.message || 'Error adding payment receipt');
      }
    } catch (error) {
      setError('Error adding payment receipt');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (receiptId) => {
    if (!window.confirm('Are you sure you want to delete this payment receipt?')) {
      return;
    }

    try {
      const response = await fetch(`/api/payment-receipts/${receiptId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setSuccess('Payment receipt deleted successfully!');
        fetchPaymentReceipts();
      } else {
        const data = await response.json();
        setError(data.message || 'Error deleting payment receipt');
      }
    } catch (error) {
      setError('Error deleting payment receipt');
      console.error('Error:', error);
    }
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
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

  return (
    <div className="space-y-6">
      {/* Payment Receipt Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Payment Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User *
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Week *
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select week</option>
                  {generateWeeks().map(week => (
                    <option key={week.value} value={week.value}>
                      {week.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month *
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select month</option>
                  {generateMonths().map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {generateYears().map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="online">Online Payment</option>
                  <option value="check">Check</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows="3"
                  placeholder="Additional notes about this payment..."
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? 'Adding...' : 'Add Payment Receipt'}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Payment Receipts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payment Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentReceipts.slice(0, 10).map((receipt) => (
                  <tr key={receipt._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.user?.name || 'Unknown User'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(receipt.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Week {receipt.week}, {moment().month(receipt.month - 1).format('MMM')} {receipt.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {moment(receipt.paymentDate).format('MMM DD, YYYY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentMethodColor(receipt.paymentMethod)}`}>
                        {receipt.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDelete(receipt._id)}
                        className="text-red-600 hover:text-red-900 ml-2"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {paymentReceipts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No payment receipts found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyPaymentReceipts;