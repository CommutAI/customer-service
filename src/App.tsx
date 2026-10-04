import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerServiceLayout from './layouts/CustomerServiceLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QRCards from './pages/QRCards';
import ReloadCard from './pages/ReloadCard';
import TemporaryQRCards from './pages/TemporaryQRCards';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Passengers from './pages/Passengers';
import CardReservations from './pages/CardReservations';
import NotFound from './pages/NotFound';

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

            {/* Protected — all customer service routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <CustomerServiceLayout />
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
              <Route path="card-reservations" element={<CardReservations />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
