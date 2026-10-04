import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiCalls } from '../lib/api';
import { Users, DollarSign, CreditCard, TrendingUp, RefreshCw, Ticket, Calendar, type LucideIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useMemo } from 'react';

const KPICard = ({ title, value, change, icon: Icon, color }: { title: string; value: string | number; change: string; icon: LucideIcon; color: string }) => (
  <div className="glass-card p-6 hover:scale-105 transition-transform duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {change && (
        <span className={`text-sm ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
          {change}
        </span>
      )}
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

  // Calculate weekly data from actual transactions
  const weeklyData = useMemo(() => {
    if (!transactions) return [];

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const groupedData: Record<string, { transactions: number; revenue: number }> = {};

    // Initialize all days with 0
    days.forEach(day => {
      groupedData[day] = { transactions: 0, revenue: 0 };
    });

    // Group transactions by day of week
    transactions.forEach(t => {
      const date = new Date(t.timestamp);
      if (date >= oneWeekAgo) {
        const dayName = days[date.getDay()];
        if (groupedData[dayName]) {
          groupedData[dayName].transactions += 1;
          groupedData[dayName].revenue += Math.abs(t.amount);
        }
      }
    });

    // Return in correct order (Mon-Sun)
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      day,
      transactions: groupedData[day]?.transactions || 0,
      revenue: groupedData[day]?.revenue || 0,
    }));
  }, [transactions]);

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
    { title: "Today's Registrations", value: stats?.todayRegistrations || 0, change: '', icon: Users, color: 'bg-blue-500' },
    { title: "Today's Top Ups", value: stats?.todayTopUps || 0, change: '', icon: DollarSign, color: 'bg-green-500' },
    { title: "Today's Transactions", value: stats?.todayTransactions || 0, change: '', icon: CreditCard, color: 'bg-purple-500' },
    { title: "Today's Revenue", value: `₱${stats?.totalRevenue?.toFixed(2) || '0.00'}`, change: '', icon: TrendingUp, color: 'bg-orange-500' },
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            <ShortcutCard
              title="Card Reservations"
              value="Go"
              icon={Calendar}
              color="bg-pink-500"
              link="/card-reservations"
              onClick={navigate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
