import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import type { Passenger, QRCard } from '../types';
import { useState } from 'react';
import { Search, RefreshCw, CreditCard, UserPlus } from 'lucide-react';

export default function Passengers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cardTypeFilter, setCardTypeFilter] = useState<'All' | 'Temporary' | 'Regular' | 'Student' | 'Senior Citizen' | 'PWD'>('All');
  const [replaceCard, setReplaceCard] = useState<QRCard | null>(null);
  const [issueNewCard, setIssueNewCard] = useState<Passenger | null>(null);
  const queryClient = useQueryClient();

  const { data: passengers, isLoading } = useQuery({
    queryKey: ['passengers'],
    queryFn: apiCalls.getPassengers,
  });

  const { data: cards } = useQuery({
    queryKey: ['qrCards'],
    queryFn: apiCalls.getQRCards,
  });

  const replaceMutation = useMutation({
    mutationFn: apiCalls.replaceCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrCards'] });
      queryClient.invalidateQueries({ queryKey: ['passengers'] });
      setReplaceCard(null);
    },
  });

  const issueCardMutation = useMutation({
    mutationFn: (registration: {
      ownerName: string;
      contactNumber: string;
      passengerType: 'Regular' | 'Student' | 'Senior Citizen' | 'PWD';
    }) => apiCalls.issueQRCard(registration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrCards'] });
      queryClient.invalidateQueries({ queryKey: ['passengers'] });
      setIssueNewCard(null);
    },
  });

  const filteredPassengers = passengers?.filter(p => {
    const passengerCard = cards?.find(c => c.cardId === p.cardId);
    const cardType = passengerCard?.passengerType;
    const isTemporary = passengerCard?.isTemporary;

    // Filter by card type
    if (cardTypeFilter === 'Temporary' && !isTemporary) return false;
    if (cardTypeFilter !== 'All' && cardTypeFilter !== 'Temporary' && cardType !== cardTypeFilter) return false;

    // Filter by search term
    return (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm) ||
      p.cardId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-white">Card Management</h1>
      </div>

      <div className="glass-card">
        <div className="p-6 border-b border-white/20">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
            <input
              type="text"
              placeholder="Search passengers by name, phone, or card ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/10 text-white placeholder-white/40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['All', 'Temporary', 'Regular', 'Student', 'Senior Citizen', 'PWD'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setCardTypeFilter(type)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  cardTypeFilter === type
                    ? 'bg-primary-500 text-white shadow-soft border-primary-400'
                    : 'bg-white/10 text-white/60 hover:bg-white/20 border-white/20'
                }`}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Card ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Card Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-white/60 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredPassengers.map((passenger) => {
                const passengerCard = cards?.find(c => c.cardId === passenger.cardId);
                return (
                  <tr key={passenger.id} className="hover:bg-white/10 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-linear-to-br from-primary-500/20 to-primary-600/20 rounded-2xl flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-primary-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{passenger.name}</div>
                          <div className="text-sm text-white/60">{passenger.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{passenger.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{passenger.cardId || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                        passengerCard?.isTemporary
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {passengerCard?.isTemporary ? 'Temporary' : passengerCard?.passengerType || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      ₱{passenger.balance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                        passenger.status === 'active' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {passenger.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {passengerCard && (
                        <button
                          onClick={() => setReplaceCard(passengerCard)}
                          className="text-primary-400 hover:text-primary-300 mr-3 p-2 rounded-xl hover:bg-primary-500/20 transition-colors"
                          title="Replace Lost/Damaged Card"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => setIssueNewCard(passenger)}
                        className="text-emerald-400 hover:text-emerald-300 p-2 rounded-xl hover:bg-emerald-500/20 transition-colors"
                        title="Issue New Card"
                      >
                        <CreditCard className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {replaceCard && (
        <ReplaceCardModal
          card={replaceCard}
          onClose={() => setReplaceCard(null)}
          onConfirm={() => replaceMutation.mutate(replaceCard.cardId)}
          isProcessing={replaceMutation.isPending}
        />
      )}

      {issueNewCard && (
        <IssueNewCardModal
          passenger={issueNewCard}
          onClose={() => setIssueNewCard(null)}
          onSubmit={(registration) => issueCardMutation.mutate(registration)}
          isProcessing={issueCardMutation.isPending}
        />
      )}
    </div>
  );
}

function ReplaceCardModal({ card, onClose, onConfirm, isProcessing }: { card: QRCard; onClose: () => void; onConfirm: () => void; isProcessing: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-sm border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Replace Card</h2>
            <p className="text-sm text-white/60">Issue a replacement for lost/damaged card</p>
          </div>
        </div>
        <p className="text-sm text-white/70 mb-5">
          Card <span className="font-mono font-bold text-white">{card.cardId}</span> will be
          marked as replaced and a new card will be issued for{' '}
          <span className="font-semibold text-white">{card.passengerName}</span>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-white/20 rounded-2xl text-sm font-medium text-white/60 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft disabled:opacity-50 border border-primary-400"
          >
            {isProcessing ? 'Processing...' : 'Confirm Replacement'}
          </button>
        </div>
      </div>
    </div>
  );
}

function IssueNewCardModal({ passenger, onClose, onSubmit, isProcessing }: { passenger: Passenger; onClose: () => void; onSubmit: (registration: any) => void; isProcessing: boolean }) {
  const [formData, setFormData] = useState({
    ownerName: passenger.name,
    contactNumber: passenger.phone,
    passengerType: 'Regular' as 'Regular' | 'Student' | 'Senior Citizen' | 'PWD',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card w-full max-w-md border border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Issue New Card</h2>
        </div>
        <p className="text-sm text-white/60 mb-6">
          Issue a new QR card for <span className="font-semibold text-white">{passenger.name}</span>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white/60 mb-2">Full Name</label>
            <input
              type="text"
              required
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              className="w-full px-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white/60 mb-2">Contact Number</label>
            <input
              type="tel"
              required
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              className="w-full px-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white/60 mb-2">Passenger Type</label>
            <select
              value={formData.passengerType}
              onChange={(e) => setFormData({ ...formData, passengerType: e.target.value as any })}
              className="w-full px-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/10 text-white"
            >
              <option value="Regular" style={{ backgroundColor: '#1f2937', color: 'white' }}>Regular</option>
              <option value="Student" style={{ backgroundColor: '#1f2937', color: 'white' }}>Student</option>
              <option value="Senior Citizen" style={{ backgroundColor: '#1f2937', color: 'white' }}>Senior Citizen</option>
              <option value="PWD" style={{ backgroundColor: '#1f2937', color: 'white' }}>PWD</option>
            </select>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-white/20 rounded-2xl text-sm font-medium text-white/60 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft disabled:opacity-50 border border-emerald-400"
            >
              {isProcessing ? 'Issuing...' : 'Issue Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
