import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { Transaction } from '../types';
import { DollarSign, Receipt, History, Banknote } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

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

// Normalize card ID by converting special dash characters to regular hyphens
function normalizeCardId(cardId: string): string {
  return cardId
    .replace(/[\u2013\u2014\u2212\uFF0D]/g, '-'); // en dash, em dash, minus sign, fullwidth hyphen-minus
}

const RELOAD_AMOUNTS = [50, 100, 200, 500, 1000];

export default function ReloadCard() {
  const [searchParams] = useSearchParams();
  const [cardId, setCardId] = useState('');
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
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

  const { data: cardReloads } = useQuery({
    queryKey: ['cardReloads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_reloads' as any)
        .select(`
          *,
          qr_cards (
            card_uid,
            owner_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const { data: qrCards } = useQuery({
    queryKey: ['qrCards'],
    queryFn: apiCalls.getQRCards,
  });

  // Find card by card ID to determine passenger type (exclude temporary cards)
  const normalizedCardId = normalizeCardId(cardId);
  const cardData = qrCards?.find(c => normalizeCardId(c.cardId) === normalizedCardId && !c.isTemporary);
  const currentPassengerType = cardData?.passengerType || 'Regular';

  // Filter card suggestions based on input (exclude temporary cards)
  const cardSuggestions = qrCards?.filter(c => 
    normalizeCardId(c.cardId).toLowerCase().includes(normalizedCardId.toLowerCase()) &&
    c.status === 'active' &&
    !c.isTemporary
  ).slice(0, 5) || [];

  // Check if card exists when cardId has value (exclude temporary cards)
  const cardExists = qrCards?.some(c => normalizeCardId(c.cardId) === normalizedCardId && !c.isTemporary);

  // Derive error without state (avoids infinite re-render)
  const cardError = cardId && qrCards && !cardExists ? 'Card ID not found' : '';

  // Calculate discount (reload doesn't apply discount, but we show passenger type)
  const hasDiscount = ['Student', 'Senior Citizen', 'PWD'].includes(currentPassengerType);

  const reloadMutation = useMutation({
    mutationFn: () => apiCalls.topUp(cardId, amount, 'cash'),
    onSuccess: (data) => {
      toast.success(`Card reloaded successfully! Amount: ₱${amount.toFixed(2)}`);
      queryClient.invalidateQueries({ queryKey: ['qrCards'] });
      queryClient.invalidateQueries({ queryKey: ['cardReloads'] });
      setShowReceipt(data);
      setCardId('');
      setAmount(100);
      setCustomAmount('');
    },
    onError: (err: Error) => {
      toast.error(`Failed to reload card: ${err.message}`);
    },
  });

  const handleReload = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardId && amount > 0) {
      reloadMutation.mutate();
    }
  };

  const handleAmountChange = (value: number) => {
    setAmount(value);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setCustomAmount(e.target.value);
    if (!isNaN(value) && value > 0) {
      setAmount(value);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Reload Card</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <DollarSign className="w-6 h-6 mr-2" />
            Process Reload
          </h2>
          <form onSubmit={handleReload} className="space-y-5">
            {/* Card ID input */}
            <div className="relative">
              <label className="block text-sm font-semibold text-white/60 mb-2">Card ID</label>
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
                className={`w-full px-4 py-3 border rounded-2xl focus:ring-2 focus:border-transparent bg-white/10 font-mono text-white ${
                  cardError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-white/20 focus:ring-primary-500 focus:border-transparent'
                }`}
                required
              />
              {cardError && (
                <p className="mt-1 text-xs text-red-400 font-medium">{cardError}</p>
              )}
              {showSuggestions && cardSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                  {cardSuggestions.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        setCardId(card.cardId);
                        setShowSuggestions(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-sm font-medium text-gray-900">{card.cardId}</span>
                        <span className="text-xs text-gray-600">{card.passengerName}</span>
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
                  ? 'bg-purple-500/20 border-purple-500/30' 
                  : 'bg-white/10 border-white/20'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-white/60">Passenger Type</p>
                    <p className="text-lg font-bold text-white">{currentPassengerType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white/60">Current Balance</p>
                    <p className="text-lg font-bold text-emerald-400">₱{(cardData.balance ?? 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Amount selection */}
            <div>
              <label className="block text-sm font-semibold text-white/60 mb-2">Reload Amount</label>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {RELOAD_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleAmountChange(amt)}
                    className={`px-3 py-3 rounded-xl font-medium transition-all border ${
                      amount === amt && !customAmount
                        ? 'bg-primary-500 text-white shadow-soft border-2 border-primary-400'
                        : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    ₱{amt}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  min="1"
                  step="1"
                  className="w-full px-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/10 text-white"
                />
              </div>
            </div>

            {/* Amount summary */}
            <div className="p-5 bg-green-500/20 border border-green-500/30 rounded-2xl">
              <div className="text-center">
                <span className="text-xs font-semibold text-white/60 block">Reload Amount</span>
                <span className="text-3xl font-bold text-green-400">₱{amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Cash instruction */}
            <div className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex flex-col items-center justify-center gap-2">
              <Banknote className="w-5 h-5 text-amber-400" />
              <p className="text-sm text-amber-200 text-center">
                Collect ₱{amount.toFixed(2)} cash from the passenger before confirming the reload.
              </p>
            </div>

            <button
              type="submit"
              disabled={reloadMutation.isPending || !cardId}
              className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition-all duration-200 font-medium shadow-soft disabled:bg-secondary-300 border border-green-400"
            >
              {reloadMutation.isPending ? 'Processing...' : 'Process Reload'}
            </button>
          </form>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <History className="w-6 h-6 mr-2" />
            Recent Reloads
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {cardReloads?.map((reload) => (
              <div key={reload.id} className="p-4 bg-white/10 rounded-2xl border border-white/20">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-white">{reload.qr_cards?.owner_name || 'Unknown'}</p>
                    <p className="text-xs text-white/60">{formatRelativeTime(reload.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">+₱{reload.amount.toFixed(2)}</p>
                    <p className="text-xs text-white/60 capitalize">{reload.reload_method}</p>
                  </div>
                </div>
              </div>
            ))}
            {cardReloads?.length === 0 && (
              <p className="text-center text-white/60 py-8">No recent reloads</p>
            )}
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
    <div className="fixed inset-0 bg-secondary-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-300">
        {/* Header with success indicator */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-0.5">Reload Successful!</h2>
          <p className="text-xs text-gray-500">Transaction completed</p>
        </div>

        {/* Amount highlight */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 mb-4 border border-green-100">
          <p className="text-xs font-medium text-gray-600 mb-1">Reload Amount</p>
          <p className="text-3xl font-bold text-green-600">+₱{transaction.amount.toFixed(2)}</p>
        </div>

        {/* Transaction details */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-xs text-gray-500">Passenger</span>
            <span className="font-medium text-gray-900 text-sm">{transaction.passengerName}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-xs text-gray-500">New Balance</span>
            <span className="font-bold text-gray-900 text-sm">₱{transaction.balanceAfter.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-xs text-gray-500">Payment Method</span>
            <span className="font-medium text-gray-900 text-sm capitalize">{transaction.method}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xs text-gray-500">Transaction ID</span>
            <span className="font-mono text-xs text-gray-600">{transaction.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 font-medium text-sm"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium text-sm flex items-center justify-center gap-1.5 shadow-md"
          >
            <Receipt className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
