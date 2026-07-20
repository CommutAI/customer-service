import { useQuery } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import type { Transaction } from '../types';
import { History, Search, ArrowUp, ArrowDown, CreditCard, DollarSign, Ticket } from 'lucide-react';
import { useState } from 'react';

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'top_up' | 'fare' | 'refund' | 'ticket_purchase'>('all');
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'card' | 'qr'>('all');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: apiCalls.getTransactions,
  });

  const filteredTransactions = transactions?.filter(t => {
    const matchesSearch = 
      t.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesMethod = filterMethod === 'all' || t.method === filterMethod;
    return matchesSearch && matchesType && matchesMethod;
  }) || [];

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'top_up':
        return <DollarSign className="w-5 h-5" />;
      case 'fare':
        return <CreditCard className="w-5 h-5" />;
      case 'ticket_purchase':
        return <Ticket className="w-5 h-5" />;
      default:
        return <History className="w-5 h-5" />;
    }
  };

  const getTransactionColor = (type: Transaction['type']) => {
    switch (type) {
      case 'top_up':
        return 'bg-green-100 text-green-600';
      case 'fare':
        return 'bg-red-100 text-red-600';
      case 'ticket_purchase':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-secondary-900 mb-4">Transaction History</h1>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft border border-secondary-100">
        <div className="p-6 border-b border-secondary-100">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by passenger name or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-secondary-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-secondary-50/50"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-4 py-3 border border-secondary-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-secondary-50/50"
              >
                <option value="all">All Types</option>
                <option value="top_up">Top Up</option>
                <option value="fare">Fare</option>
                <option value="refund">Refund</option>
                <option value="ticket_purchase">Ticket Purchase</option>
              </select>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value as any)}
                className="px-4 py-3 border border-secondary-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-secondary-50/50"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="qr">QR</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Passenger</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Balance After</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-secondary-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                      {getTransactionIcon(transaction.type)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-secondary-900">{transaction.passengerName}</div>
                    <div className="text-xs text-secondary-500">{transaction.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-bold flex items-center ${
                      transaction.amount > 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                      ₱{Math.abs(transaction.amount).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                    ₱{transaction.balanceAfter.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1.5 text-xs font-semibold bg-secondary-100 text-secondary-700 rounded-xl capitalize">
                      {transaction.method || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                    {new Date(transaction.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <History className="w-12 h-12 mx-auto text-secondary-400 mb-4" />
            <p className="text-secondary-500">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
