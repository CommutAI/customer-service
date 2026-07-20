import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error } = await signIn(email, password);

    setIsLoading(false);

    if (error) {
      setError(error);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-black rounded-3xl shadow-soft mb-4">
            <img src={logo} alt="CommutAI logo" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-secondary-900">CommutAI</h1>
          <p className="text-secondary-500 mt-1">Customer Service Portal</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft p-8 border border-secondary-100">
          <h2 className="text-2xl font-bold text-secondary-900 mb-6">Sign In</h2>

          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@commutai.test"
                className="w-full px-4 py-3 border border-secondary-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-secondary-50/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 border border-secondary-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-secondary-50/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-linear-to-r from-primary-500 to-primary-600 text-white rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 font-semibold shadow-soft disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-secondary-400 mt-6">
          CommutAI © {new Date().getFullYear()} · Secure staff access
        </p>
      </div>
    </div>
  );
}
