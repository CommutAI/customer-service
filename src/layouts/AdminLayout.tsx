import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  DollarSign,
  Ticket,
  History,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Card Management', href: '/passengers', icon: Users },
  { name: 'QR Cards', href: '/qr-cards', icon: CreditCard },
  { name: 'Temporary QR Cards', href: '/temporary-qr-cards', icon: Ticket },
  { name: 'Top Up', href: '/top-up', icon: DollarSign },
  { name: 'Transactions', href: '/transactions', icon: History },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { staffProfile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const initials = staffProfile?.full_name
    ? staffProfile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'CS';

  return (
    <div className="flex h-screen overflow-hidden bg-linear-to-br from-secondary-50 via-white to-primary-50">

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-secondary-100 shadow-soft
          transition-transform duration-200
          lg:relative lg:translate-x-0 lg:flex lg:shadow-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-secondary-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0">
              <img src={logo} alt="CommutAI" className="w-7 h-7 object-contain" />
            </div>
            <span className="text-sm font-bold text-secondary-900">
              CommutAI
            </span>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-secondary-100"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-primary-500 text-white shadow-soft'
                    : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                  }
                `}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="shrink-0 px-3 py-3 border-t border-secondary-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-secondary-50">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-secondary-900 truncate">
                {staffProfile?.full_name ?? 'Staff'}
              </p>
              <p className="text-xs text-secondary-500 capitalize">
                {staffProfile?.role ?? 'cs_desk'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="shrink-0 h-14 flex items-center gap-3 px-4 bg-white border-b border-secondary-100 shadow-soft">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-secondary-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-secondary-600" />
          </button>

          <div className="flex-1" />
        </header>

        {/* Page content — scrollable */}
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
