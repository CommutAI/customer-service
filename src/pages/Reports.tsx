import { useQuery } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, CreditCard, DollarSign, 
  Download 
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';

export default function Reports() {
  const [dateRange, setDateRange] = useState<'weekly' | 'monthly' | 'yearly' | 'custom'>('weekly');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: cards } = useQuery({
    queryKey: ['qrCards'],
    queryFn: apiCalls.getQRCards,
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: apiCalls.getTransactions,
  });

  // Calculate card type distribution
  const cardTypeData = [
    { name: 'Regular', value: cards?.filter(c => c.passengerType === 'Regular').length || 0, color: '#3b82f6' },
    { name: 'Student', value: cards?.filter(c => c.passengerType === 'Student').length || 0, color: '#10b981' },
    { name: 'Senior Citizen', value: cards?.filter(c => c.passengerType === 'Senior Citizen').length || 0, color: '#f97316' },
    { name: 'PWD', value: cards?.filter(c => c.passengerType === 'PWD').length || 0, color: '#8b5cf6' },
  ];

  // Calculate transaction type distribution
  const transactionTypeData = [
    { name: 'Reload', value: transactions?.filter(t => t.type === 'reload').length || 0, color: '#10b981' },
    { name: 'Card Issuance', value: transactions?.filter(t => t.type === 'card_issuance').length || 0, color: '#3b82f6' },
  ];


  // Filter transactions based on date range
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (dateRange) {
      case 'weekly':
        cutoffDate.setDate(now.getDate() - 7);
        return transactions.filter(t => new Date(t.timestamp) >= cutoffDate);
      case 'monthly':
        cutoffDate.setMonth(now.getMonth() - 1);
        return transactions.filter(t => new Date(t.timestamp) >= cutoffDate);
      case 'yearly':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        return transactions.filter(t => new Date(t.timestamp) >= cutoffDate);
      case 'custom':
        if (!startDate || !endDate) return transactions;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include end date
        return transactions.filter(t => {
          const transactionDate = new Date(t.timestamp);
          return transactionDate >= start && transactionDate <= end;
        });
      default:
        return transactions;
    }
  }, [transactions, dateRange, startDate, endDate]);

  // Calculate transaction data based on date range
  const chartData = useMemo(() => {
    if (!filteredTransactions.length) return [];
    
    const groupedData: Record<string, { transactions: number; revenue: number }> = {};
    
    filteredTransactions.forEach(t => {
      const date = new Date(t.timestamp);
      let key: string;
      
      switch (dateRange) {
        case 'weekly':
          key = date.toLocaleDateString('en-US', { weekday: 'short' });
          break;
        case 'monthly':
          key = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          break;
        case 'yearly':
          key = date.toLocaleDateString('en-US', { month: 'short' });
          break;
        case 'custom':
          key = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          break;
        default:
          key = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      }
      
      if (!groupedData[key]) {
        groupedData[key] = { transactions: 0, revenue: 0 };
      }
      groupedData[key].transactions += 1;
      groupedData[key].revenue += Math.abs(t.amount);
    });
    
    return Object.entries(groupedData).map(([date, data]) => ({
      date,
      transactions: data.transactions,
      revenue: data.revenue,
    }));
  }, [filteredTransactions, dateRange]);

  // Calculate card status distribution
  const cardStatusData = [
    { name: 'Active', value: cards?.filter(c => c.status === 'active').length || 0, color: '#10b981' },
    { name: 'Disabled', value: cards?.filter(c => c.status === 'disabled').length || 0, color: '#ef4444' },
    { name: 'Lost', value: cards?.filter(c => c.status === 'lost').length || 0, color: '#f97316' },
  ];

  // Calculate total revenue based on filtered transactions
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalReloads = filteredTransactions.filter(t => t.type === 'reload').length;
  const totalCards = cards?.length || 0;

  const statCards = [
    {
      title: 'Total Revenue',
      value: `₱${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-emerald-600',
    },
    {
      title: 'Total Cards',
      value: totalCards,
      icon: CreditCard,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Total Reloads',
      value: totalReloads,
      icon: TrendingUp,
      gradient: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Reports & Analytics</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg border border-white/20 p-1">
              {(['weekly', 'monthly', 'yearly', 'custom'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
                    dateRange === range
                      ? 'bg-primary-500 text-white border-primary-400'
                      : 'text-white/60 hover:bg-white/10 border-transparent'
                  }`}
                >
                  {range === 'weekly' ? 'Weekly' : range === 'monthly' ? 'Monthly' : range === 'yearly' ? 'Yearly' : 'Custom'}
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
          <button className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg border border-white/20 text-sm font-medium text-white hover:bg-white/20 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">{stat.title}</p>
                <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
              </div>
              <div className={`bg-linear-to-br ${stat.gradient} p-4 rounded-2xl shadow-soft`}>
                <stat.icon className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            {dateRange === 'custom' 
              ? 'Custom Range' 
              : dateRange === 'weekly' 
                ? 'Weekly' 
                : dateRange === 'monthly' 
                  ? 'Monthly' 
                  : 'Yearly'} Transactions
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white'
                }}
                formatter={(value) => [value, 'Transactions']}
              />
              <Area type="monotone" dataKey="transactions" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            {dateRange === 'custom' 
              ? 'Custom Range' 
              : dateRange === 'weekly' 
                ? 'Weekly' 
                : dateRange === 'monthly' 
                  ? 'Monthly' 
                  : 'Yearly'} Revenue
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white'
                }}
                formatter={(value) => [`₱${value}`, 'Revenue']}
              />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Card Type Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={cardTypeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {cardTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {cardTypeData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-white/60">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Transaction Types</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={transactionTypeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {transactionTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {transactionTypeData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-white/60">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card Status Chart */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Card Status Distribution</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={cardStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {cardStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-4">
            {cardStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                <div>
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-white/60">{item.value} cards</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
