import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import type { Transaction } from '../types';
import { DollarSign, Receipt, History, Banknote } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Helper function to format relative time
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

const DESTINATIONS = [
  { name: 'Dicklum', fare: 15 },
  { name: 'San Miguel', fare: 20 },
  { name: 'Lunocan', fare: 25 },
  { name: 'Alae', fare: 30 },
  { name: 'Mambatangan', fare: 40 },
  { name: 'Puerto', fare: 50 },
  { name: 'Agora Terminal', fare: 65 },
];

export default function TopUp() {
  const [searchParams] = useSearchParams();
  const [cardId, setCardId] = useState('');
  const [destination, setDestination] = useState('');
  const [fare, setFare] = useState(15);
  const [showReceipt, setShowReceipt] = useState<Transaction | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const queryClient = useQueryClient();

  // Pre-fill cardId from URL parameter if provided
  useEffect(() => {
    const cardIdParam = searchParams.get('cardId');
    if (cardIdParam) {
      setCardId(cardIdParam);
    }
  }, [searchParams]);

  // Fetch CS Desk Location from database/system
  // TODO: This should come from user profile or system configuration
  const csDeskLocation = 'Manolo Fortich'; // Default - will be fetched from DB


  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: apiCalls.getTransactions,
  });

  const { data: qrCards } = useQuery({
    queryKey: ['qrCards'],
    queryFn: apiCalls.getQRCards,
  });

  // Find card by card ID to determine passenger type (exclude temporary cards)
  const cardData = qrCards?.find(c => c.cardId === cardId && !c.isTemporary);
  const currentPassengerType = cardData?.passengerType || 'Regular';

  // Filter card suggestions based on input (exclude temporary cards)
  const cardSuggestions = qrCards?.filter(c => 
    c.cardId.toLowerCase().includes(cardId.toLowerCase()) &&
    c.status === 'active' &&
    !c.isTemporary
  ).slice(0, 5) || [];

  // Check if card exists when cardId has value (exclude temporary cards)
  const cardExists = qrCards?.some(c => c.cardId === cardId && !c.isTemporary);

  // Derive error without state (avoids infinite re-render)
  const cardError = cardId && qrCards && !cardExists ? 'Card ID not found' : '';

  // Calculate discount
  const hasDiscount = ['Student', 'Senior Citizen', 'PWD'].includes(currentPassengerType);
  const discountAmount = hasDiscount ? fare * 0.20 : 0;
  const finalFare = fare - discountAmount;

  const topUpMutation = useMutation({
    mutationFn: () => apiCalls.topUp(cardId, finalFare, 'cash'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['qrCards'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowReceipt(data);
      setCardId('');
      setDestination('');
      setFare(15);
    },
  });

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardId && destination) {
      topUpMutation.mutate();
    }
  };


  return (
    <div>
      <h1 className="text-xl font-bold text-secondary-900 mb-4">Top Up</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft p-6 border border-secondary-100">
          <h2 className="text-xl font-semibold text-secondary-900 mb-6 flex items-center">
            <DollarSign className="w-6 h-6 mr-2" />
            Process Top Up
          </h2>
          <form onSubmit={handleTopUp} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              {/* Left Column */}
              <div className="space-y-5">
                {/* Card ID input */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-secondary-700 mb-2">Card ID</label>
                  <input
                    type="text"
                    placeholder="Enter card ID"
                    value={cardId}
                    onChange={(e) => {
                      setCardId(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className={`w-full px-4 py-3 border rounded-2xl focus:ring-2 focus:border-transparent bg-secondary-50/50 font-mono ${
                      cardError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-secondary-200 focus:ring-primary-500 focus:border-transparent'
                    }`}
                    required
                  />
                  {cardError && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{cardError}</p>
                  )}
                  {showSuggestions && cardSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-200 rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                      {cardSuggestions.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => {
                            setCardId(card.cardId);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-secondary-50 transition-colors border-b border-secondary-100 last:border-b-0"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-sm font-medium text-secondary-900">{card.cardId}</span>
                            <span className="text-xs text-secondary-500">{card.passengerName}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Passenger type display */}
                {cardData && (
                  <div className={`p-4 rounded-2xl border ${
                    hasDiscount 
                      ? 'bg-purple-50 border-purple-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-secondary-600">Passenger Type</p>
                        <p className="text-lg font-bold text-secondary-900">{currentPassengerType}</p>
                      </div>
                      {hasDiscount && (
                        <div className="text-right">
                          <p className="text-xs font-semibold text-purple-600">20% Discount Applied</p>
                          <p className="text-sm font-bold text-purple-700">-₱{discountAmount.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Starting point */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <p className="text-sm font-semibold text-secondary-600 mb-1">Starting Point</p>
                  <p className="text-lg font-bold text-secondary-900">{csDeskLocation} Terminal</p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                {/* Destination dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-secondary-700 mb-2">Destination</label>
                  <select
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      const selectedDest = DESTINATIONS.find(d => d.name === e.target.value);
                      if (selectedDest) setFare(selectedDest.fare);
                    }}
                    className="w-full px-4 py-3 border border-secondary-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-secondary-50/50"
                    required
                  >
                    <option value="">Select destination...</option>
                    {DESTINATIONS.map((dest) => (
                      <option key={dest.name} value={dest.name}>
                        {dest.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fare display */}
                <div className="p-5 bg-green-50 border border-green-200 rounded-2xl">
                  {hasDiscount ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <span className="text-xs font-semibold text-secondary-600 block">Original Fare</span>
                        <span className="text-lg font-bold text-secondary-400 line-through">₱{fare.toFixed(2)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-semibold text-purple-600 block">Discount (20%)</span>
                        <span className="text-lg font-bold text-purple-600">-₱{discountAmount.toFixed(2)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-semibold text-secondary-600 block">Final Amount</span>
                        <span className="text-2xl font-bold text-green-600">₱{finalFare.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="text-xs font-semibold text-secondary-600 block">Fare Amount</span>
                      <span className="text-3xl font-bold text-green-600">₱{fare.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cash instruction */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col items-center justify-center gap-2">
              <Banknote className="w-5 h-5 text-amber-600" />
              <p className="text-sm text-amber-700 text-center">
                Collect ₱{finalFare.toFixed(2)} cash from the passenger before confirming the top-up.
                {hasDiscount && <span className="block mt-1 text-xs text-amber-600">20% discount applied for {currentPassengerType}</span>}
              </p>
            </div>

            <button
              type="submit"
              disabled={topUpMutation.isPending}
              className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition-all duration-200 font-medium shadow-soft disabled:bg-secondary-300"
            >
              {topUpMutation.isPending ? 'Processing...' : 'Process Top Up'}
            </button>
          </form>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft p-6 border border-secondary-100">
          <h2 className="text-xl font-semibold text-secondary-900 mb-6 flex items-center">
            <History className="w-6 h-6 mr-2" />
            Recent Top Ups
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transactions
              ?.filter(t => t.type === 'top_up')
              .slice(0, 10)
              .map((transaction) => (
                <div key={transaction.id} className="p-4 bg-linear-to-r from-secondary-50 to-white rounded-2xl border border-secondary-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-secondary-900">{transaction.passengerName}</p>
                      <p className="text-xs text-secondary-500">{formatRelativeTime(transaction.timestamp)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">+₱{transaction.amount.toFixed(2)}</p>
                      <p className="text-xs text-secondary-500">{transaction.method}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {showReceipt && (
        <ReceiptModal
          transaction={showReceipt}
          onClose={() => setShowReceipt(null)}
        />
      )}
    </div>
  );
}

function ReceiptModal({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-secondary-900/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md shadow-soft-xl border border-secondary-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center">
            <Receipt className="w-6 h-6 mr-2" />
            Receipt
          </h2>
          <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600 p-2 rounded-xl hover:bg-secondary-100 transition-colors">
            ✕
          </button>
        </div>
        <div className="border-t border-b border-secondary-200 py-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-secondary-600">Transaction ID</span>
            <span className="font-medium text-secondary-900">{transaction.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-600">Passenger</span>
            <span className="font-medium text-secondary-900">{transaction.passengerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-600">Amount</span>
            <span className="font-bold text-emerald-600">+₱{transaction.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-600">New Balance</span>
            <span className="font-bold text-secondary-900">₱{transaction.balanceAfter.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-600">Method</span>
            <span className="font-medium capitalize text-secondary-900">{transaction.method}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-600">Date</span>
            <span className="font-medium text-secondary-900">{formatRelativeTime(transaction.timestamp)}</span>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="w-full mt-6 px-6 py-3 bg-linear-to-r from-primary-500 to-primary-600 text-white rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 font-medium shadow-soft"
        >
          Print Receipt
        </button>
      </div>
    </div>
  );
}
