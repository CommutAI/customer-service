import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiCalls } from '../lib/api';
import { Users, DollarSign, CreditCard, TrendingUp, RefreshCw, Ticket } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: apiCalls.getDashboardStats,
  });

  const { data: cards } = useQuery({
    queryKey: ['qrCards'],
    queryFn: apiCalls.getQRCards,
  });

  // Calculate card type distribution
  const cardTypeData = [
    { name: 'Regular', value: cards?.filter(c => c.passengerType === 'Regular').length || 0, color: '#3b82f6' },
    { name: 'Student', value: cards?.filter(c => c.passengerType === 'Student').length || 0, color: '#10b981' },
    { name: 'Senior Citizen', value: cards?.filter(c => c.passengerType === 'Senior Citizen').length || 0, color: '#f97316' },
    { name: 'PWD', value: cards?.filter(c => c.passengerType === 'PWD').length || 0, color: '#8b5cf6' },
  ];

  // Mock weekly data (replace with real data from API)
  const weeklyData = [
    { day: 'Mon', transactions: 12, revenue: 450 },
    { day: 'Tue', transactions: 19, revenue: 720 },
    { day: 'Wed', transactions: 15, revenue: 580 },
    { day: 'Thu', transactions: 22, revenue: 850 },
    { day: 'Fri', transactions: 28, revenue: 1100 },
    { day: 'Sat', transactions: 35, revenue: 1400 },
    { day: 'Sun', transactions: 18, revenue: 690 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Today's Registrations",
      value: stats?.todayRegistrations || 0,
      icon: Users,
      gradient: 'from-primary-500 to-primary-600',
      change: '+12%',
    },
    {
      title: "Today's Top Ups",
      value: stats?.todayTopUps || 0,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-emerald-600',
      change: '+8%',
    },
    {
      title: "Today's Transactions",
      value: stats?.todayTransactions || 0,
      icon: CreditCard,
      gradient: 'from-accent-500 to-accent-600',
      change: '+15%',
    },
    {
      title: "Transaction Summary",
      value: `${stats?.todayTransactions || 0} txns`,
      icon: TrendingUp,
      gradient: 'from-orange-500 to-orange-600',
      change: `₱${stats?.totalRevenue?.toFixed(2) || '0.00'}`,
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-secondary-900 mb-4">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft p-6 border border-secondary-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-600">{stat.title}</p>
                <p className="text-3xl font-bold text-secondary-900 mt-2">{stat.value}</p>
              </div>
              <div className={`bg-linear-to-br ${stat.gradient} p-4 rounded-2xl shadow-soft`}>
                <stat.icon className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-emerald-600 font-semibold">{stat.change}</span>
              <span className="text-secondary-500 ml-2">from yesterday</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft p-6 border border-secondary-100">
          <h2 className="text-xl font-semibold text-secondary-900 mb-6">Weekly Transactions</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '12px', 
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="transactions" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft p-6 border border-secondary-100">
          <h2 className="text-xl font-semibold text-secondary-900 mb-6">Weekly Revenue</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '12px', 
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => [`₱${value}`, 'Revenue']}
              />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft p-6 border border-secondary-100">
          <h2 className="text-xl font-semibold text-secondary-900 mb-6">Card Type Distribution</h2>
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
                  backgroundColor: 'white', 
                  borderRadius: '12px', 
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {cardTypeData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-secondary-600">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft p-6 border border-secondary-100">
          <h2 className="text-xl font-semibold text-secondary-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/reload-card')}
              className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-2xl transition-all duration-200 text-left border border-emerald-200"
            >
              <RefreshCw className="w-7 h-7 text-emerald-600 mb-3" />
              <p className="text-sm font-semibold text-secondary-900">Reload Card</p>
            </button>
            <button 
              onClick={() => navigate('/qr-cards')}
              className="p-5 bg-gradient-to-br from-accent-50 to-accent-100 hover:from-accent-100 hover:to-accent-200 rounded-2xl transition-all duration-200 text-left border border-accent-200"
            >
              <CreditCard className="w-7 h-7 text-accent-600 mb-3" />
              <p className="text-sm font-semibold text-secondary-900">Issue QR Card</p>
            </button>
            <button 
              onClick={() => navigate('/temporary-qr-cards')}
              className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-2xl transition-all duration-200 text-left border border-purple-200"
            >
              <Ticket className="w-7 h-7 text-purple-600 mb-3" />
              <p className="text-sm font-semibold text-secondary-900">Temporary Card</p>
            </button>
            <button 
              onClick={() => navigate('/transactions')}
              className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-2xl transition-all duration-200 text-left border border-orange-200"
            >
              <TrendingUp className="w-7 h-7 text-orange-600 mb-3" />
              <p className="text-sm font-semibold text-secondary-900">Transactions</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
