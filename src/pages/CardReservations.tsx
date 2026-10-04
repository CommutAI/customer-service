import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import type { CardReservation } from '../types';
import { Search, Plus, User, Phone, MapPin, CheckCircle, XCircle, Clock, Trash2, Calendar } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

type PassengerType = 'Regular' | 'Student' | 'Senior Citizen' | 'PWD';

const TYPE_OPTIONS: { value: PassengerType; label: string }[] = [
  { value: 'Regular', label: 'Regular' },
  { value: 'Student', label: 'Student' },
  { value: 'Senior Citizen', label: 'Senior Citizen' },
  { value: 'PWD', label: 'PWD' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
];

function CreateReservationModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    cardType: 'Regular' as PassengerType,
    pickupTerminal: '',
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: apiCalls.createCardReservation,
    onSuccess: () => {
      toast.success('Card reservation created successfully!');
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(`Failed to create reservation: ${err.message}`);
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.contact.trim() || !formData.pickupTerminal.trim()) {
      setError('Please fill in all fields');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      contact: formData.contact.trim(),
      cardType: formData.cardType,
      pickupTerminal: formData.pickupTerminal.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md border border-white/20 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
          <h2 className="text-base font-bold text-white">New Card Reservation</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/60 border border-white/20">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white/60 mb-1.5">
              <User className="w-4 h-4 inline mr-1.5 text-white/40" />
              Full Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Juan dela Cruz"
              value={formData.name}
              onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
              className="w-full px-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/10 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white/60 mb-1.5">
              <Phone className="w-4 h-4 inline mr-1.5 text-white/40" />
              Contact Number
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 09171234567"
              value={formData.contact}
              onChange={e => setFormData(d => ({ ...d, contact: e.target.value }))}
              className="w-full px-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/10 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white/60 mb-1.5">
              Card Type
            </label>
            <select
              value={formData.cardType}
              onChange={e => setFormData(d => ({ ...d, cardType: e.target.value as PassengerType }))}
              className="w-full px-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/10 text-sm text-white"
            >
              {TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-gray-800">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-white/60 mb-1.5">
              <MapPin className="w-4 h-4 inline mr-1.5 text-white/40" />
              Pickup Terminal
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Agora Terminal"
              value={formData.pickupTerminal}
              onChange={e => setFormData(d => ({ ...d, pickupTerminal: e.target.value }))}
              className="w-full px-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/10 text-sm text-white"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-white/20 rounded-2xl text-sm font-medium text-white/60 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft disabled:opacity-60 border border-primary-400"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CardReservations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['cardReservations'],
    queryFn: apiCalls.getCardReservations,
  });

  const deleteMutation = useMutation({
    mutationFn: apiCalls.deleteCardReservation,
    onSuccess: () => {
      toast.success('Reservation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['cardReservations'] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete reservation: ${err.message}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: CardReservation['status'] }) =>
      apiCalls.updateCardReservationStatus(id, status),
    onSuccess: () => {
      toast.success('Reservation status updated');
      queryClient.invalidateQueries({ queryKey: ['cardReservations'] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to update status: ${err.message}`);
    },
  });

  const filteredReservations = reservations?.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reservationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.contact.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusIcon = (status: CardReservation['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5" />;
      case 'rejected':
        return <XCircle className="w-5 h-5" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: CardReservation['status']) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-white text-3xl font-bold mb-2">Card Reservations</h1>
          <p className="text-white/60">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-3xl font-bold mb-2">Card Reservations</h1>
          <p className="text-white/60">Manage card pickup reservations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft border border-primary-400"
        >
          <Plus className="w-4 h-4" />
          New Reservation
        </button>
      </div>

      <div className="glass-card">
        <div className="p-6 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, reservation ID, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/10 text-white placeholder-white/40"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Reservation ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Card Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Pickup Terminal</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredReservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${getStatusColor(reservation.status)}`}>
                      {getStatusIcon(reservation.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono font-medium text-white">{reservation.reservationId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{reservation.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                    {reservation.contact}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1.5 text-xs font-semibold bg-white/10 text-white/70 rounded-xl">
                      {reservation.cardType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                    {reservation.pickupTerminal}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                    {new Date(reservation.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <select
                        value={reservation.status}
                        onChange={(e) => updateStatusMutation.mutate({
                          id: reservation.id,
                          status: e.target.value as CardReservation['status']
                        })}
                        disabled={updateStatusMutation.isPending}
                        className="px-2 py-1 text-xs border border-white/20 rounded-lg bg-white/10 text-white focus:ring-2 focus:ring-primary-500"
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-gray-800">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteMutation.mutate(reservation.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReservations.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-white/20 mb-4" />
            <p className="text-white/60">No reservations found</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateReservationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['cardReservations'] })}
        />
      )}
    </div>
  );
}
