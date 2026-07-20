import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiCalls } from '../lib/api';
import { Users, DollarSign, CreditCard, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: apiCalls.getDashboardStats,
  });

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft p-6 border border-secondary-100">
          <h2 className="text-xl font-semibold text-secondary-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-linear-to-r from-secondary-50 to-white rounded-2xl border border-secondary-100">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-linear-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-900">New passenger registered</p>
                  <p className="text-xs text-secondary-500">2 minutes ago</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-linear-to-r from-secondary-50 to-white rounded-2xl border border-secondary-100">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-linear-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-900">Top up completed</p>
                  <p className="text-xs text-secondary-500">5 minutes ago</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-linear-to-r from-secondary-50 to-white rounded-2xl border border-secondary-100">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-linear-to-br from-accent-100 to-accent-200 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-accent-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-900">QR card issued</p>
                  <p className="text-xs text-secondary-500">10 minutes ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft p-6 border border-secondary-100">
          <h2 className="text-xl font-semibold text-secondary-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/top-up')}
              className="p-5 bg-linear-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-2xl transition-all duration-200 text-left border border-emerald-200"
            >
              <DollarSign className="w-7 h-7 text-emerald-600 mb-3" />
              <p className="text-sm font-semibold text-secondary-900">Process Top Up</p>
            </button>
            <button 
              onClick={() => navigate('/qr-cards')}
              className="p-5 bg-linear-to-br from-accent-50 to-accent-100 hover:from-accent-100 hover:to-accent-200 rounded-2xl transition-all duration-200 text-left border border-accent-200"
            >
              <CreditCard className="w-7 h-7 text-accent-600 mb-3" />
              <p className="text-sm font-semibold text-secondary-900">Issue QR Card</p>
            </button>
            <button 
              onClick={() => navigate('/transactions')}
              className="p-5 bg-linear-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-2xl transition-all duration-200 text-left border border-orange-200"
            >
              <TrendingUp className="w-7 h-7 text-orange-600 mb-3" />
              <p className="text-sm font-semibold text-secondary-900">Transaction</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
