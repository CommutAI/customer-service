import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiCalls } from '../lib/api';
import { Users, DollarSign, CreditCard, TrendingUp, RefreshCw, Ticket, type LucideIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const KPICard = ({ title, value, change, icon: Icon, color }: { title: string; value: string | number; change: string; icon: LucideIcon; color: string }) => (
  <div className="glass-card p-6 hover:scale-105 transition-transform duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className={`text-sm ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
        {change}
      </span>
    </div>
    <h3 className="text-white/60 text-sm mb-1">{title}</h3>
    <p className="text-white text-3xl font-bold">{value}</p>
  </div>
);

const ShortcutCard = ({ title, value, icon: Icon, color, link, onClick }: { title: string; value: string; icon: LucideIcon; color: string; link: string; onClick: (link: string) => void }) => (
  <button 
    onClick={() => onClick(link)}
    className="block border border-white/20 rounded-2xl hover:border-white/30 transition-colors"
  >
    <div className="glass-card p-4 hover:scale-105 transition-transform duration-300 cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white/60 text-xs">{title}</p>
            <p className="text-white font-bold">{value}</p>
          </div>
        </div>
      </div>
    </div>
  </button>
);

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
      <div className="space-y-6">
        <div>
          <h1 className="text-white text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-white/60">Loading data...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    { title: "Today's Registrations", value: stats?.todayRegistrations || 0, change: '+12%', icon: Users, color: 'bg-blue-500' },
    { title: "Today's Top Ups", value: stats?.todayTopUps || 0, change: '+8%', icon: DollarSign, color: 'bg-green-500' },
    { title: "Today's Transactions", value: stats?.todayTransactions || 0, change: '+15%', icon: CreditCard, color: 'bg-purple-500' },
    { title: "Total Revenue", value: `₱${stats?.totalRevenue?.toFixed(2) || '0.00'}`, change: '+12%', icon: TrendingUp, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-white/60">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-white text-xl font-bold mb-6">Weekly Transactions</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.6)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              />
              <Bar dataKey="transactions" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-white text-xl font-bold mb-6">Weekly Revenue</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.6)" fontSize={12} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-white text-xl font-bold mb-6">Card Type Distribution</h2>
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

        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-white text-xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <ShortcutCard 
              title="Reload Card" 
              value="Go" 
              icon={RefreshCw} 
              color="bg-emerald-500" 
              link="/reload-card"
              onClick={navigate}
            />
            <ShortcutCard 
              title="Issue QR Card" 
              value="Go" 
              icon={CreditCard} 
              color="bg-purple-500" 
              link="/qr-cards"
              onClick={navigate}
            />
            <ShortcutCard 
              title="Temporary Card" 
              value="Go" 
              icon={Ticket} 
              color="bg-blue-500" 
              link="/temporary-qr-cards"
              onClick={navigate}
            />
            <ShortcutCard 
              title="Transactions" 
              value="Go" 
              icon={TrendingUp} 
              color="bg-orange-500" 
              link="/transactions"
              onClick={navigate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
