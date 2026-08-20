import { useQuery } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import type { Transaction } from '../types';
import { History, Search, ArrowUp, ArrowDown, CreditCard, DollarSign, Ticket, Calendar } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'daily' | 'monthly' | 'yearly' | 'custom'>('daily');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: apiCalls.getTransactions,
  });

  // Filter transactions based on date range and method
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (dateRange) {
      case 'daily':
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case 'monthly':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'yearly':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'custom':
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return transactions.filter(t => {
            const transactionDate = new Date(t.timestamp);
            const matchesSearch = 
              t.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              t.id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesMethod = t.method === 'cash';
            const matchesDate = transactionDate >= start && transactionDate <= end;
            return matchesSearch && matchesMethod && matchesDate;
          });
        }
        return transactions;
    }
    
    return transactions.filter(t => {
      const transactionDate = new Date(t.timestamp);
      const matchesSearch = 
        t.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMethod = t.method === 'cash';
      const matchesDate = transactionDate >= cutoffDate;
      return matchesSearch && matchesMethod && matchesDate;
    });
  }, [transactions, searchTerm, dateRange, startDate, endDate]);

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
        return 'bg-green-500/20 text-green-400';
      case 'fare':
        return 'bg-red-500/20 text-red-400';
      case 'ticket_purchase':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-white text-3xl font-bold mb-2">Transaction History</h1>
          <p className="text-white/60">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-3xl font-bold mb-2">Transaction History</h1>
        <p className="text-white/60">View all transaction records</p>
      </div>

      <div className="glass-card">
        <div className="p-6 border-b border-white/10">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by passenger name or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/10 text-white placeholder-white/40"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg border border-white/20 p-1">
                {(['daily', 'monthly', 'yearly', 'custom'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
                      dateRange === range
                        ? 'bg-primary-500 text-white border-primary-400'
                        : 'text-white/60 hover:bg-white/10 border-transparent'
                    }`}
                  >
                    {range === 'daily' ? 'Daily' : range === 'monthly' ? 'Monthly' : range === 'yearly' ? 'Yearly' : 'Custom'}
                  </button>
                ))}
              </div>
              {dateRange === 'custom' && (
                <div className="flex items-center gap-2 bg-white/10 rounded-lg border border-white/20 p-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-white/60" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="text-sm border border-white/20 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white/10 text-white"
                    />
                  </div>
                  <span className="text-white/60">to</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-white/60" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-sm border border-white/20 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white/10 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Passenger</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Balance After</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                      {getTransactionIcon(transaction.type)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{transaction.passengerName}</div>
                    <div className="text-xs text-white/60">{transaction.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-bold flex items-center ${
                      transaction.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {transaction.amount > 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                      ₱{Math.abs(transaction.amount).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    ₱{transaction.balanceAfter.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1.5 text-xs font-semibold bg-white/10 text-white/70 rounded-xl capitalize">
                      {transaction.method || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                    {new Date(transaction.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <History className="w-12 h-12 mx-auto text-white/20 mb-4" />
            <p className="text-white/60">No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
