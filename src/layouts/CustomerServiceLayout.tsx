import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Ticket,
  History,
  Menu,
  X,
  LogOut,
  RefreshCw,
  BarChart3,
  User,
  Users,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'QR Cards', href: '/qr-cards', icon: CreditCard },
  { name: 'Temporary QR Cards', href: '/temporary-qr-cards', icon: Ticket },
  { name: 'Reload Card', href: '/reload-card', icon: RefreshCw },
  { name: 'Passengers', href: '/passengers', icon: Users },
  { name: 'Transactions', href: '/transactions', icon: History },
  { name: 'Card Reservations', href: '/card-reservations', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (value: boolean) => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isItemActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`glass-sidebar fixed left-0 top-0 h-full z-50 transition-all duration-300 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-64 lg:w-64 lg:${isOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          {isOpen && (
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="CommutAI Logo"
                className="w-10 h-10"
              />
              <span className="text-white font-bold text-xl">CommutAI</span>
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-white hover:text-orange-400 transition-colors"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto flex-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => {
                  // Close sidebar on mobile after navigation
                  if (window.innerWidth < 1024) {
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {isOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-red-400 hover:bg-red-500/20 hover:text-red-300 ${
              !isOpen && 'justify-center'
            }`}
          >
            <LogOut size={20} />
            {isOpen && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

const Header = ({ onMenuClick, isMobile }: { onMenuClick: () => void; isMobile?: boolean }) => {
  const { staffProfile } = useAuth();

  return (
    <header className="glass-card h-16 flex items-center justify-between px-4 sm:px-6 mb-4 sm:mb-6">
      {/* Left side - Menu button (mobile only) and Logo/Title */}
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        )}
        <div className="hidden sm:flex items-center gap-2">
          <img src={logo} alt="CommutAI" className="w-8 h-8" />
          <span className="text-white font-bold text-lg">CommutAI</span>
        </div>
      </div>

      {/* Right side - Profile */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-white font-medium text-sm sm:text-base">{staffProfile?.full_name ?? 'Staff'}</p>
          <p className="text-white/60 text-xs sm:text-sm">Customer Service</p>
        </div>
        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="text-white" size={20} />
        </div>
      </div>
    </header>
  );
};

export default function CustomerServiceLayout() {
  const [isOpen, setIsOpen] = useState(false); // Start closed on mobile
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <main className={`transition-all duration-300 lg:${isOpen ? 'ml-64' : 'ml-20'} p-3 sm:p-4 md:p-6`}>
        <Header onMenuClick={() => setIsOpen(true)} isMobile={isMobile} />
        <Outlet />
      </main>
    </div>
  );
}
