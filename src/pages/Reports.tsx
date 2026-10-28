import { useQuery } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, CreditCard, DollarSign,
  Download, BarChart3, Table, FileText, ChevronUp, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';

export default function Reports() {
  // View mode for each section
  const [transactionsView, setTransactionsView] = useState<'list' | 'chart'>('list');
  const [revenueView, setRevenueView] = useState<'list' | 'chart'>('list');
  const [cardTypeView, setCardTypeView] = useState<'list' | 'chart'>('list');
  const [transactionTypeView, setTransactionTypeView] = useState<'list' | 'chart'>('list');
  const [cardStatusView, setCardStatusView] = useState<'list' | 'chart'>('list');

  // Pagination and sorting for each section
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsSort, setTransactionsSort] = useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'date', order: 'desc' });
  const [revenuePage, setRevenuePage] = useState(1);
  const [revenueSort, setRevenueSort] = useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'date', order: 'desc' });
  const [cardTypePage, setCardTypePage] = useState(1);
  const [cardTypeSort, setCardTypeSort] = useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'name', order: 'asc' });
  const [transactionTypePage, setTransactionTypePage] = useState(1);
  const [transactionTypeSort, setTransactionTypeSort] = useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'name', order: 'asc' });
  const [cardStatusPage, setCardStatusPage] = useState(1);
  const [cardStatusSort, setCardStatusSort] = useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'name', order: 'asc' });

  const ITEMS_PER_PAGE = 10;

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

  // Calculate transaction data (grouped by date)
  const chartData = useMemo(() => {
    if (!transactions?.length) return [];

    const groupedData: Record<string, { transactions: number; revenue: number }> = {};

    transactions.forEach(t => {
      const date = new Date(t.timestamp);
      const key = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

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
  }, [transactions]);

  // Calculate card status distribution
  const cardStatusData = [
    { name: 'Active', value: cards?.filter(c => c.status === 'active').length || 0, color: '#10b981' },
    { name: 'Disabled', value: cards?.filter(c => c.status === 'disabled').length || 0, color: '#ef4444' },
    { name: 'Lost', value: cards?.filter(c => c.status === 'lost').length || 0, color: '#f97316' },
  ];

  // Calculate total revenue
  const totalRevenue = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
  const totalReloads = transactions?.filter(t => t.type === 'reload').length || 0;
  const totalCards = cards?.length || 0;

  // Sorting helper
  const sortData = (
    data: any[],
    key: string,
    order: 'asc' | 'desc'
  ): any[] => {
    return [...data].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      return order === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  };

  // Pagination helper
  const paginateData = (data: any[], page: number): any[] => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return data.slice(start, start + ITEMS_PER_PAGE);
  };

  // Sort and paginate transactions data
  const sortedTransactions = useMemo(() =>
    sortData(chartData, transactionsSort.key, transactionsSort.order),
    [chartData, transactionsSort]
  );
  const paginatedTransactions = useMemo(() =>
    paginateData(sortedTransactions, transactionsPage),
    [sortedTransactions, transactionsPage]
  );
  const transactionsTotalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);

  // Sort and paginate revenue data
  const sortedRevenue = useMemo(() =>
    sortData(chartData, revenueSort.key, revenueSort.order),
    [chartData, revenueSort]
  );
  const paginatedRevenue = useMemo(() =>
    paginateData(sortedRevenue, revenuePage),
    [sortedRevenue, revenuePage]
  );
  const revenueTotalPages = Math.ceil(sortedRevenue.length / ITEMS_PER_PAGE);

  // Sort and paginate card type data
  const sortedCardTypes = useMemo(() =>
    sortData(cardTypeData, cardTypeSort.key, cardTypeSort.order),
    [cardTypeData, cardTypeSort]
  );
  const paginatedCardTypes = useMemo(() =>
    paginateData(sortedCardTypes, cardTypePage),
    [sortedCardTypes, cardTypePage]
  );
  const cardTypeTotalPages = Math.ceil(sortedCardTypes.length / ITEMS_PER_PAGE);

  // Sort and paginate transaction type data
  const sortedTransactionTypes = useMemo(() =>
    sortData(transactionTypeData, transactionTypeSort.key, transactionTypeSort.order),
    [transactionTypeData, transactionTypeSort]
  );
  const paginatedTransactionTypes = useMemo(() =>
    paginateData(sortedTransactionTypes, transactionTypePage),
    [sortedTransactionTypes, transactionTypePage]
  );
  const transactionTypeTotalPages = Math.ceil(sortedTransactionTypes.length / ITEMS_PER_PAGE);

  // Sort and paginate card status data
  const sortedCardStatus = useMemo(() =>
    sortData(cardStatusData, cardStatusSort.key, cardStatusSort.order),
    [cardStatusData, cardStatusSort]
  );
  const paginatedCardStatus = useMemo(() =>
    paginateData(sortedCardStatus, cardStatusPage),
    [sortedCardStatus, cardStatusPage]
  );
  const cardStatusTotalPages = Math.ceil(sortedCardStatus.length / ITEMS_PER_PAGE);

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

  // Export to CSV function
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filename}.csv`);
  };

  // Export transactions
  const exportTransactions = () => {
    const headers = ['Date', 'Transactions', 'Revenue'];
    const data = sortedTransactions.map(d => [
      d.date,
      d.transactions,
      d.revenue.toFixed(2)
    ]);
    exportToCSV(data, 'transactions-report', headers);
  };

  // Export card types
  const exportCardTypes = () => {
    const headers = ['Card Type', 'Count', 'Percentage'];
    const data = sortedCardTypes.map(d => [
      d.name,
      d.value,
      totalCards > 0 ? ((d.value / totalCards) * 100).toFixed(1) : 0
    ]);
    exportToCSV(data, 'card-types-report', headers);
  };

  // Export transaction types
  const exportTransactionTypes = () => {
    const headers = ['Transaction Type', 'Count'];
    const data = sortedTransactionTypes.map(d => [d.name, d.value]);
    exportToCSV(data, 'transaction-types-report', headers);
  };

  // Export card status
  const exportCardStatus = () => {
    const headers = ['Status', 'Count', 'Percentage'];
    const data = sortedCardStatus.map(d => [
      d.name,
      d.value,
      totalCards > 0 ? ((d.value / totalCards) * 100).toFixed(1) : 0
    ]);
    exportToCSV(data, 'card-status-report', headers);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Reports & Analytics</h1>
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Transactions</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTransactionsView('list')}
                className={`p-2 rounded-lg transition-colors ${transactionsView === 'list' ? 'bg-primary-500 text-white' : 'text-white/60 hover:bg-white/10'}`}
                title="List View"
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTransactionsView('chart')}
                className={`p-2 rounded-lg transition-colors ${transactionsView === 'chart' ? 'bg-primary-500 text-white' : 'text-white/60 hover:bg-white/10'}`}
                title="Chart View"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={exportTransactions}
                className="p-2 rounded-lg text-white/60 hover:bg-white/10 transition-colors"
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          {transactionsView === 'list' ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase cursor-pointer hover:text-white"
                        onClick={() => setTransactionsSort(prev => ({
                          key: 'date',
                          order: prev.key === 'date' && prev.order === 'asc' ? 'desc' : 'asc'
                        }))}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {transactionsSort.key === 'date' && (
                            transactionsSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase cursor-pointer hover:text-white"
                        onClick={() => setTransactionsSort(prev => ({
                          key: 'transactions',
                          order: prev.key === 'transactions' && prev.order === 'asc' ? 'desc' : 'asc'
                        }))}
                      >
                        <div className="flex items-center gap-1">
                          Transactions
                          {transactionsSort.key === 'transactions' && (
                            transactionsSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase cursor-pointer hover:text-white"
                        onClick={() => setTransactionsSort(prev => ({
                          key: 'revenue',
                          order: prev.key === 'revenue' && prev.order === 'asc' ? 'desc' : 'asc'
                        }))}
                      >
                        <div className="flex items-center gap-1">
                          Revenue
                          {transactionsSort.key === 'revenue' && (
                            transactionsSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {paginatedTransactions.map((item, index) => (
                      <tr key={index} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-sm text-white">{item.date}</td>
                        <td className="px-4 py-3 text-sm text-white">{item.transactions}</td>
                        <td className="px-4 py-3 text-sm text-white">₱{item.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {paginatedTransactions.length === 0 && (
                  <div className="text-center py-8 text-white/60">No data available</div>
                )}
              </div>
              {transactionsTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-white/60">
                    Page {transactionsPage} of {transactionsTotalPages} ({sortedTransactions.length} total)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                      disabled={transactionsPage === 1}
                      className="p-2 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTransactionsPage(p => Math.min(transactionsTotalPages, p + 1))}
                      disabled={transactionsPage === transactionsTotalPages}
                      className="p-2 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
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
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Revenue</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRevenueView('list')}
                className={`p-2 rounded-lg transition-colors ${revenueView === 'list' ? 'bg-primary-500 text-white' : 'text-white/60 hover:bg-white/10'}`}
                title="List View"
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRevenueView('chart')}
                className={`p-2 rounded-lg transition-colors ${revenueView === 'chart' ? 'bg-primary-500 text-white' : 'text-white/60 hover:bg-white/10'}`}
                title="Chart View"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={exportTransactions}
                className="p-2 rounded-lg text-white/60 hover:bg-white/10 transition-colors"
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          {revenueView === 'list' ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase cursor-pointer hover:text-white"
                        onClick={() => setRevenueSort(prev => ({
                          key: 'date',
                          order: prev.key === 'date' && prev.order === 'asc' ? 'desc' : 'asc'
                        }))}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {revenueSort.key === 'date' && (
                            revenueSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase cursor-pointer hover:text-white"
                        onClick={() => setRevenueSort(prev => ({
                          key: 'revenue',
                          order: prev.key === 'revenue' && prev.order === 'asc' ? 'desc' : 'asc'
                        }))}
                      >
                        <div className="flex items-center gap-1">
                          Revenue
                          {revenueSort.key === 'revenue' && (
                            revenueSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {paginatedRevenue.map((item, index) => (
                      <tr key={index} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-sm text-white">{item.date}</td>
                        <td className="px-4 py-3 text-sm text-white">₱{item.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {paginatedRevenue.length === 0 && (
                  <div className="text-center py-8 text-white/60">No data available</div>
                )}
              </div>
              {revenueTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-white/60">
                    Page {revenuePage} of {revenueTotalPages} ({sortedRevenue.length} total)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRevenuePage(p => Math.max(1, p - 1))}
                      disabled={revenuePage === 1}
                      className="p-2 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRevenuePage(p => Math.min(revenueTotalPages, p + 1))}
                      disabled={revenuePage === revenueTotalPages}
                      className="p-2 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
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
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Card Type Distribution</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCardTypeView('list')}
                className={`p-2 rounded-lg transition-colors ${cardTypeView === 'list' ? 'bg-primary-500 text-white' : 'text-white/60 hover:bg-white/10'}`}
                title="List View"
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCardTypeView('chart')}
                className={`p-2 rounded-lg transition-colors ${cardTypeView === 'chart' ? 'bg-primary-500 text-white' : 'text-white/60 hover:bg-white/10'}`}
                title="Chart View"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={exportCardTypes}
                className="p-2 rounded-lg text-white/60 hover:bg-white/10 transition-colors"
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          {cardTypeView === 'list' ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase cursor-pointer hover:text-white"
                        onClick={() => setCardTypeSort(prev => ({
                          key: 'name',
                          order: prev.key === 'name' && prev.order === 'asc' ? 'desc' : 'asc'
                        }))}
                      >
                        <div className="flex items-center gap-1">
                          Card Type
                          {cardTypeSort.key === 'name' && (
                            cardTypeSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase cursor-pointer hover:text-white"
                        onClick={() => setCardTypeSort(prev => ({
                          key: 'value',
                          order: prev.key === 'value' && prev.order === 'asc' ? 'desc' : 'asc'
                        }))}
                      >
                        <div className="flex items-center gap-1">
                          Count
                          {cardTypeSort.key === 'value' && (
                            cardTypeSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {paginatedCardTypes.map((item) => (
                      <tr key={item.name} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-sm text-white">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-white">{item.value}</td>
                        <td className="px-4 py-3 text-sm text-white">
                          {totalCards > 0 ? ((item.value / totalCards) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {paginatedCardTypes.length === 0 && (
                  <div className="text-center py-8 text-white/60">No data available</div>
                )}
              </div>
              {cardTypeTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-white/60">
                    Page {cardTypePage} of {cardTypeTotalPages} ({sortedCardTypes.length} total)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCardTypePage(p => Math.max(1, p - 1))}
                      disabled={cardTypePage === 1}
                      className="p-2 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCardTypePage(p => Math.min(cardTypeTotalPages, p + 1))}
                      disabled={cardTypePage === cardTypeTotalPages}
                      className="p-2 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Transaction Types</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTransactionTypeView('list')}
                className={`p-2 rounded-lg transition-colors ${transactionTypeView === 'list' ? 'bg-primary-500 text-white' : 'text-white/60 hover:bg-white/10'}`}
                title="List View"
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTransactionTypeView('chart')}
                className={`p-2 rounded-lg transition-colors ${transactionTypeView === 'chart' ? 'bg-primary-500 text-white' : 'text-white/60 hover:bg-white/10'}`}
                title="Chart View"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={exportTransactionTypes}
                className="p-2 rounded-lg text-white/60 hover:bg-white/10 transition-colors"
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          {transactionTypeView === 'list' ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase cursor-pointer hover:text-white"
                        onClick={() => setTransactionTypeSort(prev => ({
                          key: 'name',
                          order: prev.key === 'name' && prev.order === 'asc' ? 'desc' : 'asc'
                        }))}
                      >
                        <div className="flex items-center gap-1">
                          Transaction Type
                          {transactionTypeSort.key === 'name' && (
                            transactionTypeSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase cursor-pointer hover:text-white"
                        onClick={() => setTransactionTypeSort(prev => ({
                          key: 'value',
                          order: prev.key === 'value' && prev.order === 'asc' ? 'desc' : 'asc'
                        }))}
                      >
                        <div className="flex items-center gap-1">
                          Count
                          {transactionTypeSort.key === 'value' && (
                            transactionTypeSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {paginatedTransactionTypes.map((item) => (
                      <tr key={item.name} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-sm text-white">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-white">{item.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {paginatedTransactionTypes.length === 0 && (
                  <div className="text-center py-8 text-white/60">No data available</div>
                )}
              </div>
              {transactionTypeTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-white/60">
                    Page {transactionTypePage} of {transactionTypeTotalPages} ({sortedTransactionTypes.length} total)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTransactionTypePage(p => Math.max(1, p - 1))}
                      disabled={transactionTypePage === 1}
                      className="p-2 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTransactionTypePage(p => Math.min(transactionTypeTotalPages, p + 1))}
                      disabled={transactionTypePage === transactionTypeTotalPages}
                      className="p-2 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Card Status Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Card Status Distribution</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCardStatusView('list')}
              className={`p-2 rounded-lg transition-colors ${cardStatusView === 'list' ? 'bg-primary-500 text-white' : 'text-white/60 hover:bg-white/10'}`}
              title="List View"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCardStatusView('chart')}
              className={`p-2 rounded-lg transition-colors ${cardStatusView === 'chart' ? 'bg-primary-500 text-white' : 'text-white/60 hover:bg-white/10'}`}
              title="Chart View"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={exportCardStatus}
              className="p-2 rounded-lg text-white/60 hover:bg-white/10 transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        {cardStatusView === 'list' ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase cursor-pointer hover:text-white"
                      onClick={() => setCardStatusSort(prev => ({
                        key: 'name',
                        order: prev.key === 'name' && prev.order === 'asc' ? 'desc' : 'asc'
                      }))}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {cardStatusSort.key === 'name' && (
                          cardStatusSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase cursor-pointer hover:text-white"
                      onClick={() => setCardStatusSort(prev => ({
                        key: 'value',
                        order: prev.key === 'value' && prev.order === 'asc' ? 'desc' : 'asc'
                      }))}
                    >
                      <div className="flex items-center gap-1">
                        Count
                        {cardStatusSort.key === 'value' && (
                          cardStatusSort.order === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {paginatedCardStatus.map((item) => (
                    <tr key={item.name} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-sm text-white">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-white">{item.value}</td>
                      <td className="px-4 py-3 text-sm text-white">
                        {totalCards > 0 ? ((item.value / totalCards) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginatedCardStatus.length === 0 && (
                <div className="text-center py-8 text-white/60">No data available</div>
              )}
            </div>
            {cardStatusTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-white/60">
                  Page {cardStatusPage} of {cardStatusTotalPages} ({sortedCardStatus.length} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCardStatusPage(p => Math.max(1, p - 1))}
                    disabled={cardStatusPage === 1}
                    className="p-2 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCardStatusPage(p => Math.min(cardStatusTotalPages, p + 1))}
                    disabled={cardStatusPage === cardStatusTotalPages}
                    className="p-2 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
}
