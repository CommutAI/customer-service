import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import type { CardReservation } from '../types';
import { Search, Plus, User, Phone, MapPin, CheckCircle, XCircle, Clock, Trash2, Calendar, Printer, Check, X, RotateCcw, Eye } from 'lucide-react';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import QRCardDisplay from '../components/QRCardDisplay';
import type { QRCard } from '../types';

type PassengerType = 'Regular' | 'Student' | 'Senior Citizen' | 'PWD';

const TYPE_OPTIONS: { value: PassengerType; label: string }[] = [
  { value: 'Regular', label: 'Regular' },
  { value: 'Student', label: 'Student' },
  { value: 'Senior Citizen', label: 'Senior Citizen' },
  { value: 'PWD', label: 'PWD' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'approved', label: 'Approved', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'claimed', label: 'Claimed', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'expired', label: 'Expired', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

// Status options that can be changed via dropdown
const STATUS_CHANGE_OPTIONS = STATUS_OPTIONS.filter(opt => opt.value !== 'approved' && opt.value !== 'claimed');

function QRCardPrint({ reservations, onClose }: { reservations: CardReservation[]; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  // Keep all reservations with card IDs (including claimed ones for printing approved cards)
  const printReservations = reservations.filter(r => r.cardId);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Cards - Batch Print</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: #f5f5f5;
            }
            .cards-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .card {
              background: white;
              border-radius: 16px;
              padding: 20px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              border: 2px solid #e5e7eb;
              page-break-inside: avoid;
            }
            .header {
              text-align: center;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid #f97316;
            }
            .header h1 {
              font-size: 16px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 2px;
            }
            .header p {
              font-size: 11px;
              color: #6b7280;
            }
            .qr-container {
              display: flex;
              justify-content: center;
              margin: 16px 0;
            }
            .info {
              margin-top: 16px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 6px;
              font-size: 12px;
            }
            .info-label {
              color: #6b7280;
              font-weight: 500;
            }
            .info-value {
              color: #1f2937;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              margin-top: 16px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
              font-size: 10px;
              color: #9ca3af;
            }
            @media print {
              body {
                background: white;
                padding: 10px;
              }
              .card {
                box-shadow: none;
                border: 2px solid #000;
              }
              .cards-container {
                gap: 10px;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-4xl border border-white/20 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 sticky top-0 bg-gradient-to-br from-primary-50 via-white to-accent-50 backdrop-blur-sm">
          <div>
            <h2 className="text-base font-bold text-white">
              Print QR Cards ({printReservations.length})
            </h2>
            <p className="text-xs text-white/60 mt-1">
              {printReservations.length === 1 ? '1 approved card selected' : `${printReservations.length} approved cards selected`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/60 border border-white/20">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <div ref={printRef} className="hidden">
            <div className="cards-container">
              {printReservations.map((reservation) => (
                <div key={reservation.id} className="card">
                  <div className="header">
                    <h1>OMFTS QR Card</h1>
                    <p>One Manolo Fortich Transport System</p>
                  </div>
                  <div className="qr-container">
                    <QRCodeSVG
                      value={reservation.cardId || reservation.reservationId}
                      size={120}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="info">
                    <div className="info-row">
                      <span className="info-label">Card ID:</span>
                      <span className="info-value">{reservation.cardId || reservation.reservationId}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Name:</span>
                      <span className="info-value">{reservation.name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Card Type:</span>
                      <span className="info-value">{reservation.cardType}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Contact:</span>
                      <span className="info-value">{reservation.contact}</span>
                    </div>
                  </div>
                  <div className="footer">
                    <p>Valid for all OMFTS routes</p>
                    <p>Keep this card safe at all times</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {printReservations.map((reservation) => (
              <div key={reservation.id} className="bg-white rounded-2xl p-4">
                <div className="text-center mb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Preview</p>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-3">
                    <div className="text-center mb-2">
                      <h3 className="text-sm font-bold text-gray-800">OMFTS QR Card</h3>
                      <p className="text-[10px] text-gray-500">One Manolo Fortich Transport System</p>
                    </div>
                    <div className="flex justify-center mb-2">
                      <QRCodeSVG
                        value={reservation.cardId || reservation.reservationId}
                        size={80}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <div className="space-y-0.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Card ID:</span>
                        <span className="font-semibold text-gray-800">{reservation.cardId || reservation.reservationId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Name:</span>
                        <span className="font-semibold text-gray-800">{reservation.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Card Type:</span>
                        <span className="font-semibold text-gray-800">{reservation.cardType}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 sticky bottom-0 bg-gradient-to-br from-primary-50 via-white to-accent-50 backdrop-blur-sm py-4">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-white/20 rounded-2xl text-sm font-medium text-white/60 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft disabled:opacity-60 border border-primary-400 flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print {printReservations.length === 1 ? 'Card' : `${printReservations.length} Cards`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

function StatusConfirmModal({
  reservation,
  newStatus,
  cardId,
  onCardIdChange,
  onClose,
  onConfirm,
  isPending,
}: {
  reservation: CardReservation;
  newStatus: CardReservation['status'];
  cardId: string;
  onCardIdChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  const generateCardId = (cardType: string) => {
    const typeIndicators: Record<string, string> = {
      'Regular': 'RC',
      'Student': 'SC',
      'Senior Citizen': 'SCC',
      'PWD': 'PC'
    };
    const indicator = typeIndicators[cardType] || 'RC';
    const randomNum = Math.floor(10000000 + Math.random() * 90000000).toString();
    const formattedNum = `${randomNum.slice(0, 3)}-${randomNum.slice(3, 5)}-${randomNum.slice(5)}`;
    return `${indicator}-${formattedNum}`;
  };

  const handleRegenerate = () => {
    onCardIdChange(generateCardId(reservation.cardType));
  };

  const isApprove = newStatus === 'approved';
  const isCancellation = newStatus === 'cancelled';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md border border-white/20 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
          <h2 className="text-base font-bold text-white">
            {isApprove ? 'Approve Reservation' : isCancellation ? 'Cancel Reservation' : 'Confirm Status Change'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/60 border border-white/20">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
            <p className="text-xs text-white/60 mb-1">Reservation ID</p>
            <p className="font-mono font-bold text-white text-sm">{reservation.reservationId}</p>
          </div>
          <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
            <p className="text-xs text-white/60 mb-1">Name</p>
            <p className="font-semibold text-white">{reservation.name}</p>
          </div>
          <div className="p-4 bg-white/10 rounded-2xl border border-white/20">
            <p className="text-xs text-white/60 mb-1">Card Type</p>
            <p className="font-semibold text-white">{reservation.cardType}</p>
          </div>

          {isApprove && (
            <div>
              <label className="block text-sm font-semibold text-white/60 mb-1.5">
                Generated Card ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={cardId}
                  onChange={e => onCardIdChange(e.target.value)}
                  className="flex-1 px-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/10 text-sm text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="px-3 py-3 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-2xl border border-primary-500/30 transition-colors"
                  title="Regenerate Card ID"
                >
                  🔄
                </button>
              </div>
              <p className="text-xs text-white/40 mt-1">Auto-generated based on {reservation.cardType} type</p>
            </div>
          )}

          {isCancellation && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-2xl">
              <p className="text-sm text-red-300">
                Are you sure you want to cancel this reservation? This action cannot be undone.
              </p>
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
              onClick={onConfirm}
              disabled={isPending}
              className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-colors shadow-soft border disabled:opacity-50 disabled:cursor-not-allowed ${
                isApprove
                  ? 'bg-green-500 hover:bg-green-600 text-white border-green-400'
                  : isCancellation
                  ? 'bg-red-500 hover:bg-red-600 text-white border-red-400'
                  : 'bg-primary-500 hover:bg-primary-600 text-white border-primary-400'
              }`}
            >
              {isPending ? 'Processing...' : isApprove ? 'Approve & Create Card' : isCancellation ? 'Cancel' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewCardModal({ card, onClose }: { card: QRCard; onClose: () => void }) {
  return (
    <QRCardDisplay
      card={card}
      onClose={onClose}
    />
  );
}

export default function CardReservations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReservations, setSelectedReservations] = useState<Set<number>>(new Set());
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<{ reservation: CardReservation; newStatus: CardReservation['status'] } | null>(null);
  const [cardId, setCardId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [viewCard, setViewCard] = useState<QRCard | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'claimed'>('all');
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
    mutationFn: ({ id, status }: { id: number; status: 'pending' | 'approved' | 'expired' | 'cancelled' }) => {
      console.log('Calling updateCardReservationStatus with:', { id, status });
      return apiCalls.updateCardReservationStatus(id, status);
    },
    onMutate: async ({ id, status }) => {
      console.log('onMutate called for status update:', { id, status });
      await queryClient.cancelQueries({ queryKey: ['cardReservations'] });
      const previousData = queryClient.getQueryData<CardReservation[]>(['cardReservations']);
      queryClient.setQueryData<CardReservation[]>(['cardReservations'], (old) =>
        old?.map((r) => (r.id === id ? { ...r, status } : r))
      );
      return { previousData };
    },
    onSuccess: () => {
      console.log('Status update successful');
      toast.success('Reservation status updated');
      queryClient.invalidateQueries({ queryKey: ['cardReservations'] });
      setStatusConfirm(null);
    },
    onError: (err: Error, variables, context) => {
      console.error('Status update error:', err);
      toast.error(`Failed to update status: ${err.message}`);
      if (context?.previousData) {
        queryClient.setQueryData(['cardReservations'], context.previousData);
      }
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, cardId }: { id: number; cardId: string }) =>
      apiCalls.approveCardReservation(id, cardId),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['cardReservations'] });
      const previousData = queryClient.getQueryData<CardReservation[]>(['cardReservations']);
      queryClient.setQueryData<CardReservation[]>(['cardReservations'], (old) =>
        old?.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r))
      );
      return { previousData };
    },
    onSuccess: (card: QRCard) => {
      toast.success('Reservation approved and card created');
      queryClient.invalidateQueries({ queryKey: ['cardReservations'] });
      queryClient.invalidateQueries({ queryKey: ['qrCards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setStatusConfirm(null);
      // Automatically open card preview with the actual card data
      setViewCard(card);
    },
    onError: (err: Error, variables, context) => {
      toast.error(`Failed to approve reservation: ${err.message}`);
      if (context?.previousData) {
        queryClient.setQueryData(['cardReservations'], context.previousData);
      }
    },
  });

  const claimMutation = useMutation({
    mutationFn: (id: number) => apiCalls.claimCardReservation(id),
    onSuccess: () => {
      toast.success('Reservation claimed successfully');
      queryClient.invalidateQueries({ queryKey: ['cardReservations'] });
      queryClient.invalidateQueries({ queryKey: ['qrCards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to claim reservation: ${err.message}`);
    },
  });

  const filteredReservations = reservations?.filter(r => {
    // Filter by tab
    if (activeTab === 'pending' && r.status !== 'pending') return false;
    if (activeTab === 'approved' && r.status !== 'approved') return false;
    if (activeTab === 'claimed' && r.status !== 'claimed') return false;

    // Filter by search term
    return (
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reservationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.contact.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const paginatedReservations = filteredReservations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Reset to page 1 when tab changes
  const handleTabChange = (tab: 'all' | 'pending' | 'approved' | 'claimed') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedReservations(new Set());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // In claimed tab, select all with card IDs
      // In other tabs, select all with card IDs that are not claimed
      const allWithCardIds = paginatedReservations
        .filter(r => r.cardId && (activeTab === 'claimed' ? r.status === 'claimed' : r.status !== 'claimed'))
        .map(r => r.id);
      setSelectedReservations(new Set(allWithCardIds));
    } else {
      setSelectedReservations(new Set());
    }
  };

  const handleSelectOne = (id: number, checked: boolean, status: CardReservation['status']) => {
    // In non-claimed tabs, prevent selecting claimed reservations
    if (activeTab !== 'claimed' && status === 'claimed') return;

    const newSelected = new Set(selectedReservations);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedReservations(newSelected);
  };

  const handleStatusChange = (reservation: CardReservation, newStatus: CardReservation['status']) => {
    // Don't do anything if status hasn't changed
    if (newStatus === reservation.status) return;

    if (newStatus === 'approved') {
      // Generate card ID and show approval modal
      const generateCardId = (cardType: string) => {
        const typeIndicators: Record<string, string> = {
          'Regular': 'RC',
          'Student': 'SC',
          'Senior Citizen': 'SCC',
          'PWD': 'PC'
        };
        const indicator = typeIndicators[cardType] || 'RC';
        const randomNum = Math.floor(10000000 + Math.random() * 90000000).toString();
        const formattedNum = `${randomNum.slice(0, 3)}-${randomNum.slice(3, 5)}-${randomNum.slice(5)}`;
        return `${indicator}-${formattedNum}`;
      };
      setCardId(generateCardId(reservation.cardType));
      setStatusConfirm({ reservation, newStatus });
    } else if (newStatus === 'cancelled') {
      // Show cancellation confirmation
      setStatusConfirm({ reservation, newStatus });
    } else if (newStatus === 'claimed') {
      // Cannot claim directly from dropdown - must use claim button
      return;
    } else {
      // Direct update for other statuses (pending, expired)
      updateStatusMutation.mutate({ id: reservation.id, status: newStatus as 'pending' | 'approved' | 'expired' | 'cancelled' });
    }
  };

  const isAllSelected = paginatedReservations.length > 0 &&
    paginatedReservations
      .filter(r => r.cardId && (activeTab === 'claimed' ? r.status === 'claimed' : r.status !== 'claimed'))
      .length === selectedReservations.size &&
    paginatedReservations
      .filter(r => r.cardId && (activeTab === 'claimed' ? r.status === 'claimed' : r.status !== 'claimed'))
      .every(r => selectedReservations.has(r.id));

  const selectedReservationsData = filteredReservations.filter(r => {
    const hasCardId = !!r.cardId;
    const canSelect = activeTab === 'claimed' ? r.status === 'claimed' : r.status !== 'claimed';
    return selectedReservations.has(r.id) && hasCardId && canSelect;
  });

  const getStatusIcon = (status: CardReservation['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5" />;
      case 'claimed':
        return <CheckCircle className="w-5 h-5" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5" />;
      case 'expired':
        return <Clock className="w-5 h-5" />;
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
        <div className="flex items-center gap-3">
          {selectedReservations.size > 0 && (
            <>
              <button
                onClick={() => setSelectedReservations(new Set())}
                className="flex items-center gap-2 px-4 py-2.5 border border-white/20 text-white/60 rounded-2xl text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Clear Selection
              </button>
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft border border-primary-400"
              >
                <Printer className="w-4 h-4" />
                Print {selectedReservations.size} Card{selectedReservations.size > 1 ? 's' : ''}
              </button>
            </>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft border border-primary-400"
          >
            <Plus className="w-4 h-4" />
            New Reservation
          </button>
        </div>
      </div>

      <div className="glass-card">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-4">
            {[
              { value: 'all' as const, label: 'All Reservations' },
              { value: 'pending' as const, label: 'Pending' },
              { value: 'approved' as const, label: 'Approved' },
              { value: 'claimed' as const, label: 'Claimed' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  activeTab === tab.value
                    ? 'bg-primary-500 text-white border-primary-400'
                    : 'text-white/60 hover:bg-white/10 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, reservation ID, or contact..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/10 text-white placeholder-white/40"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-primary-500 focus:ring-primary-500"
                  />
                </th>
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
              {paginatedReservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedReservations.has(reservation.id)}
                      onChange={(e) => handleSelectOne(reservation.id, e.target.checked, reservation.status)}
                      disabled={!reservation.cardId || (activeTab !== 'claimed' && reservation.status === 'claimed')}
                      className="w-4 h-4 rounded border-white/20 bg-white/10 text-primary-500 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </td>
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
                      {reservation.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleStatusChange(reservation, 'approved')}
                            disabled={approveMutation.isPending}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            title="Approve & Create Card"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusChange(reservation, 'cancelled')}
                            disabled={updateStatusMutation.isPending}
                            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span className={`px-3 py-2 text-sm rounded-lg border ${STATUS_OPTIONS.find(s => s.value === reservation.status)?.color}`}>
                            {STATUS_OPTIONS.find(s => s.value === reservation.status)?.label}
                          </span>
                          {reservation.status === 'approved' && (
                            <button
                              onClick={() => claimMutation.mutate(reservation.id)}
                              disabled={claimMutation.isPending}
                              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              title="Claim Card"
                            >
                              <Check className="w-4 h-4" />
                              Claim
                            </button>
                          )}
                        </>
                      )}
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

        {filteredReservations.length > 0 && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-sm text-white/60">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredReservations.length)} of {filteredReservations.length} reservations
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-white/20 rounded-lg text-sm text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary-500 text-white border-primary-400'
                          : 'border-white/20 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-white/20 rounded-lg text-sm text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateReservationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['cardReservations'] })}
        />
      )}

      {showPrintModal && selectedReservations.size > 0 && (
        <QRCardPrint
          reservations={selectedReservationsData}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedReservations(new Set());
          }}
        />
      )}

      {statusConfirm && (
        <StatusConfirmModal
          reservation={statusConfirm.reservation}
          newStatus={statusConfirm.newStatus}
          cardId={cardId}
          onCardIdChange={setCardId}
          onClose={() => setStatusConfirm(null)}
          isPending={statusConfirm.newStatus === 'approved' ? approveMutation.isPending : updateStatusMutation.isPending}
          onConfirm={() => {
            if (statusConfirm.newStatus === 'approved') {
              approveMutation.mutate({ id: statusConfirm.reservation.id, cardId });
            } else {
              updateStatusMutation.mutate({ id: statusConfirm.reservation.id, status: statusConfirm.newStatus as 'pending' | 'approved' | 'expired' | 'cancelled' });
            }
          }}
        />
      )}

      {viewCard && (
        <ViewCardModal
          card={viewCard}
          onClose={() => setViewCard(null)}
        />
      )}
    </div>
  );
}
