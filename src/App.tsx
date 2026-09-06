import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QRCards from './pages/QRCards';
import ReloadCard from './pages/ReloadCard';
import TemporaryQRCards from './pages/TemporaryQRCards';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Passengers from './pages/Passengers';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30 s before background refetch
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected — all admin routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="qr-cards" element={<QRCards />} />
              <Route path="temporary-qr-cards" element={<TemporaryQRCards />} />
              <Route path="reload-card" element={<ReloadCard />} />
              <Route path="passengers" element={<Passengers />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="reports" element={<Reports />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
