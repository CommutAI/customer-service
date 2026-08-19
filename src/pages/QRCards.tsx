import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import type { QRCard } from '../types';
import {
  CreditCard, Plus, Power, PowerOff, RefreshCw,
  X, User, Phone, CheckCircle, ChevronRight, Ticket,
  Edit, Trash2, Eye,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import QRCardDisplay from '../components/QRCardDisplay';
import TemporaryCardDisplay from '../components/TemporaryCardDisplay';

import regularImg from '../assets/regular.png';
import studentImg  from '../assets/student.png';
import seniorImg   from '../assets/senior_citizien.png';
import pwdImg      from '../assets/pwd.png';

type PassengerType = 'Regular' | 'Student' | 'Senior Citizen' | 'PWD';

const TYPE_OPTIONS: { value: PassengerType; label: string; desc: string; img: string; color: string }[] = [
  { value: 'Regular',          label: 'Regular',         desc: 'Standard fare',              img: regularImg, color: 'border-blue-400 bg-blue-50'   },
  { value: 'Student',          label: 'Student',         desc: 'Discounted student fare',    img: studentImg, color: 'border-green-400 bg-green-50' },
  { value: 'Senior Citizen',   label: 'Senior Citizen',  desc: 'Senior citizen discount',    img: seniorImg,  color: 'border-orange-400 bg-orange-50'},
  { value: 'PWD',              label: 'PWD',             desc: 'Persons with disability',    img: pwdImg,     color: 'border-purple-400 bg-purple-50'},
];

// ── Registration wizard ────────────────────────────────────────────────────

type Step = 'info' | 'type' | 'confirm';

interface RegData {
  ownerName: string;
  contactNumber: string;
  passengerType: PassengerType;
}

function RegisterCardModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (card: QRCard) => void;
}) {
  const [step, setStep] = useState<Step>('info');
  const [data, setData] = useState<RegData>({
    ownerName: '',
    contactNumber: '',
    passengerType: 'Regular',
  });
  const [error, setError] = useState<string | null>(null);

  const issueMutation = useMutation({
    mutationFn: apiCalls.issueQRCard,
    onSuccess: (card) => {
      onSuccess(card);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleInfoNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.ownerName.trim() || !data.contactNumber.trim()) return;
    setStep('type');
  };

  const handleTypeNext = () => {
    setStep('confirm');
  };

  // Pre-generate the card ID so it shows in the preview before hitting DB
  const previewCardId = useMemo(() => {
    const typeIndicators: Record<string, string> = {
      'Regular': 'RC',
      'Student': 'SC',
      'Senior Citizen': 'SCC',
      'PWD': 'PC'
    };
    const indicator = typeIndicators[data.passengerType] || 'RC';
    const randomNum = Math.floor(10000000 + Math.random() * 90000000).toString();
    const formattedNum = `${randomNum.slice(0, 3)}-${randomNum.slice(3, 5)}-${randomNum.slice(5)}`;
    return `${indicator}-${formattedNum}`;
  }, [data.passengerType]);

  const handleSubmit = () => {
    setError(null);
    issueMutation.mutate({
      ownerName:     data.ownerName.trim(),
      contactNumber: data.contactNumber.trim(),
      passengerType: data.passengerType,
    });
  };

  const selectedType = TYPE_OPTIONS.find(t => t.value === data.passengerType)!;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-secondary-100 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100">
          <div>
            <h2 className="text-base font-bold text-secondary-900">Register New QR Card</h2>
            <div className="flex items-center gap-2 mt-1.5">
              {(['info', 'type', 'confirm'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === s
                      ? 'bg-primary-500 text-white'
                      : (['info', 'type', 'confirm'].indexOf(step) > i)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-secondary-100 text-secondary-400'
                  }`}>
                    {(['info', 'type', 'confirm'].indexOf(step) > i) ? '✓' : i + 1}
                  </div>
                  {i < 2 && <div className="w-6 h-px bg-secondary-200" />}
                </div>
              ))}
              <span className="text-xs text-secondary-400 ml-1 capitalize">{step}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary-100 text-secondary-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Step 1: Personal Info ── */}
        {step === 'info' && (
          <form onSubmit={handleInfoNext} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-1.5">
                <User className="w-4 h-4 inline mr-1.5 text-secondary-400" />
                Full Name
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Juan dela Cruz"
                value={data.ownerName}
                onChange={e => setData(d => ({ ...d, ownerName: e.target.value }))}
                className="w-full px-4 py-3 border border-secondary-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-secondary-50/50 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-1.5">
                <Phone className="w-4 h-4 inline mr-1.5 text-secondary-400" />
                Contact Number
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 09171234567"
                value={data.contactNumber}
                onChange={e => setData(d => ({ ...d, contactNumber: e.target.value }))}
                className="w-full px-4 py-3 border border-secondary-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-secondary-50/50 text-sm"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Passenger Type ── */}
        {step === 'type' && (
          <div className="px-6 py-5">
            <p className="text-sm text-secondary-600 mb-4">
              Select the passenger category for <span className="font-semibold text-secondary-900">{data.ownerName}</span>:
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setData(d => ({ ...d, passengerType: opt.value }))}
                  className={`relative rounded-2xl border-2 overflow-hidden transition-all text-left ${
                    data.passengerType === opt.value
                      ? opt.color + ' border-opacity-100 shadow-soft'
                      : 'border-secondary-200 hover:border-secondary-300 bg-white'
                  }`}
                >
                  <img
                    src={opt.img}
                    alt={opt.label}
                    className="w-full h-14 object-cover object-top"
                  />
                  <div className="px-3 py-2">
                    <p className="text-xs font-bold text-secondary-900">{opt.label}</p>
                    <p className="text-[10px] text-secondary-500">{opt.desc}</p>
                  </div>
                  {data.passengerType === opt.value && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep('info')}
                className="px-4 py-2.5 text-sm text-secondary-600 hover:bg-secondary-100 rounded-2xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleTypeNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm & Issue ── */}
        {step === 'confirm' && (
          <div className="px-6 py-5">
            <p className="text-xs text-secondary-400 mb-4">Review the details before issuing the card.</p>

            {/* Two-column: info left, card preview right */}
            <div className="flex gap-4 mb-4">

              {/* Left — details */}
              <div className="flex-1 space-y-2.5">
                {/* Card ID (preview) */}
                <div className="p-3 bg-secondary-50 rounded-2xl">
                  <p className="text-[10px] font-semibold text-secondary-400 uppercase tracking-wider mb-0.5">Card ID</p>
                  <p className="font-mono font-bold text-secondary-900 text-sm truncate">{previewCardId}</p>
                </div>
                {/* Name */}
                <div className="p-3 bg-secondary-50 rounded-2xl">
                  <p className="text-[10px] font-semibold text-secondary-400 uppercase tracking-wider mb-0.5">Full Name</p>
                  <p className="font-semibold text-secondary-900 text-sm truncate">{data.ownerName}</p>
                </div>
                {/* Contact */}
                <div className="p-3 bg-secondary-50 rounded-2xl">
                  <p className="text-[10px] font-semibold text-secondary-400 uppercase tracking-wider mb-0.5">Contact Number</p>
                  <p className="font-semibold text-secondary-900 text-sm">{data.contactNumber}</p>
                </div>
                {/* Type */}
                <div className="p-3 bg-secondary-50 rounded-2xl">
                  <p className="text-[10px] font-semibold text-secondary-400 uppercase tracking-wider mb-0.5">Passenger Type</p>
                  <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold ${selectedType.color}`}>
                    {data.passengerType}
                  </span>
                </div>
                {/* Balance */}
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-0.5">Initial Balance</p>
                  <p className="font-bold text-emerald-700 text-lg">₱100.00</p>
                </div>
                {/* Payment Amount */}
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-0.5">Payment Required</p>
                  <p className="font-bold text-amber-700 text-lg">₱110.00</p>
                  <p className="text-[9px] text-amber-500 mt-0.5">₱100 balance + ₱10 card fee</p>
                </div>
              </div>

              {/* Right — card template + QR preview */}
              <div className="w-40 shrink-0 flex flex-col gap-2">
                {/* Card template image */}
                <div className="relative rounded-xl overflow-hidden shadow-soft">
                  <img
                    src={selectedType.img}
                    alt={selectedType.label}
                    className="w-full object-cover"
                  />
                  {/* Name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent px-2 py-1.5">
                    <p className="text-white text-[9px] font-bold truncate leading-tight">
                      {data.ownerName.toUpperCase()}
                    </p>
                    <p className="text-white/60 text-[8px] font-mono truncate">
                      {previewCardId}
                    </p>
                  </div>
                </div>

                {/* Live QR code */}
                <div className="bg-white border border-secondary-200 rounded-xl p-2 flex flex-col items-center shadow-soft">
                  <p className="text-[9px] text-secondary-400 mb-1.5 font-semibold uppercase tracking-wide">QR Preview</p>
                  <QRCodeSVG
                    value={previewCardId}
                    size={100}
                    level="H"
                    includeMargin={true}
                    className="rounded"
                  />
                  <p className="text-[8px] text-secondary-400 mt-1.5 font-mono text-center break-all leading-tight">
                    {previewCardId}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep('type')}
                className="px-4 py-2.5 text-sm text-secondary-600 hover:bg-secondary-100 rounded-2xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={issueMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft disabled:opacity-60"
              >
                {issueMutation.isPending ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {issueMutation.isPending ? 'Issuing…' : 'Issue Card'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit card modal ─────────────────────────────────────────────────────────

function EditCardModal({
  card,
  onClose,
  onSuccess,
}: {
  card: QRCard;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    ownerName: card.passengerName,
    contactNumber: card.contactNumber,
    passengerType: card.passengerType,
  });
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: (updates: { owner_name: string; contact_number: string }) => 
      apiCalls.updateQRCard(card.cardId, updates),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    updateMutation.mutate({
      owner_name: formData.ownerName,
      contact_number: formData.contactNumber,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-secondary-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100">
          <h2 className="text-base font-bold text-secondary-900">Edit Card</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary-100 text-secondary-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-1.5">
              Card ID
            </label>
            <input
              type="text"
              value={card.cardId}
              disabled
              className="w-full px-4 py-3 border border-secondary-200 rounded-2xl bg-secondary-100 text-sm font-mono text-secondary-600"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.ownerName}
              onChange={e => setFormData(d => ({ ...d, ownerName: e.target.value }))}
              className="w-full px-4 py-3 border border-secondary-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-secondary-50/50 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-1.5">
              Contact Number
            </label>
            <input
              type="tel"
              required
              value={formData.contactNumber}
              onChange={e => setFormData(d => ({ ...d, contactNumber: e.target.value }))}
              className="w-full px-4 py-3 border border-secondary-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-secondary-50/50 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-1.5">
              Passenger Type
            </label>
            <input
              type="text"
              value={formData.passengerType}
              disabled
              className="w-full px-4 py-3 border border-secondary-200 rounded-2xl bg-secondary-100 text-sm"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-secondary-200 rounded-2xl text-sm font-medium text-secondary-600 hover:bg-secondary-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete card confirm ─────────────────────────────────────────────────────

function DeleteCardModal({
  card,
  onClose,
  onConfirm,
}: {
  card: QRCard;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-secondary-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-secondary-900">Delete Card</h2>
            <p className="text-sm text-secondary-500">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-secondary-600 mb-5">
          Are you sure you want to delete card <span className="font-mono font-bold text-secondary-800">{card.cardId}</span> for{' '}
          <span className="font-semibold text-secondary-900">{card.passengerName}</span>?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-secondary-200 rounded-2xl text-sm font-medium text-secondary-600 hover:bg-secondary-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Replace card confirm ───────────────────────────────────────────────────

function ReplaceCardModal({
  card,
  onClose,
  onConfirm,
}: {
  card: QRCard;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-secondary-100 p-6">
        <h2 className="text-base font-bold text-secondary-900 mb-2">Replace Card</h2>
        <p className="text-sm text-secondary-500 mb-5">
          Card <span className="font-mono font-bold text-secondary-800">{card.cardId}</span> will be
          marked as replaced and a new card will be issued for{' '}
          <span className="font-semibold text-secondary-900">{card.passengerName}</span>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-secondary-200 rounded-2xl text-sm font-medium text-secondary-600 hover:bg-secondary-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function QRCards() {
  const navigate = useNavigate();
  const [showRegister, setShowRegister]   = useState(false);
  const [newCard, setNewCard]             = useState<QRCard | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<QRCard | null>(null);
  const [viewCard, setViewCard]           = useState<QRCard | null>(null);
  const [editCard, setEditCard]           = useState<QRCard | null>(null);
  const [deleteCard, setDeleteCard]       = useState<QRCard | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: cards, isLoading } = useQuery({
    queryKey: ['qrCards'],
    queryFn: apiCalls.getQRCards,
  });

  const { data: tempCards } = useQuery({
    queryKey: ['temporaryQRCards'],
    queryFn: apiCalls.getTemporaryQRCards,
  });

  // Calculate card counts
  const cardCounts = useMemo(() => {
    // Exclude temporary cards from passenger type counts
    const nonTempCards = cards?.filter(c => !c.isTemporary) || [];
    const regularCount = nonTempCards.filter(c => c.passengerType === 'Regular').length || 0;
    const studentCount = nonTempCards.filter(c => c.passengerType === 'Student').length || 0;
    const seniorCount = nonTempCards.filter(c => c.passengerType === 'Senior Citizen').length || 0;
    const pwdCount = nonTempCards.filter(c => c.passengerType === 'PWD').length || 0;
    const tempCount = tempCards?.length || 0;
    // Total is sum of individual counts to avoid double-counting
    const totalCount = regularCount + studentCount + seniorCount + pwdCount + tempCount;

    return {
      temporary: tempCount,
      regular: regularCount,
      student: studentCount,
      senior: seniorCount,
      pwd: pwdCount,
      total: totalCount,
    };
  }, [cards, tempCards]);

  const activateMutation = useMutation({
    mutationFn: apiCalls.activateQR,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qrCards'] }),
  });

  const disableMutation = useMutation({
    mutationFn: apiCalls.disableCard,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qrCards'] }),
  });

  const replaceMutation = useMutation({
    mutationFn: apiCalls.replaceCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrCards'] });
      setReplaceTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiCalls.deleteQRCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrCards'] });
      setDeleteCard(null);
    },
  });

  const handleRegistered = () => {
    queryClient.invalidateQueries({ queryKey: ['qrCards'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    setShowRegister(false);
    navigate('/');  // Navigate to dashboard
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-secondary-900">QR Card Management</h1>
        <button
          onClick={() => setShowRegister(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft"
        >
          <Plus className="w-4 h-4" />
          Register New Card
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {/* Total Cards */}
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'all' ? null : 'all')}
          className={`bg-linear-to-br from-gray-600 to-gray-700 rounded-2xl p-4 text-white shadow-soft transition-all hover:scale-105 ${
            selectedFilter === 'all' ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-700' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-5 h-5 opacity-80" />
            <span className="text-2xl font-bold">{cardCounts.total}</span>
          </div>
          <p className="text-xs font-medium opacity-90">Total Cards</p>
        </button>

        {/* Temporary Cards */}
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'temporary' ? null : 'temporary')}
          className={`bg-linear-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-soft transition-all hover:scale-105 ${
            selectedFilter === 'temporary' ? 'ring-2 ring-white ring-offset-2 ring-offset-orange-600' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Ticket className="w-5 h-5 opacity-80" />
            <span className="text-2xl font-bold">{cardCounts.temporary}</span>
          </div>
          <p className="text-xs font-medium opacity-90">Temporary Cards</p>
        </button>

        {/* Regular Cards */}
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'Regular' ? null : 'Regular')}
          className={`bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-soft transition-all hover:scale-105 ${
            selectedFilter === 'Regular' ? 'ring-2 ring-white ring-offset-2 ring-offset-blue-600' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-5 h-5 opacity-80" />
            <span className="text-2xl font-bold">{cardCounts.regular}</span>
 </div>
          <p className="text-xs font-medium opacity-90">Regular Cards</p>
        </button>

        {/* Student Cards */}
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'Student' ? null : 'Student')}
          className={`bg-linear-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-soft transition-all hover:scale-105 ${
            selectedFilter === 'Student' ? 'ring-2 ring-white ring-offset-2 ring-offset-green-600' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-5 h-5 opacity-80" />
            <span className="text-2xl font-bold">{cardCounts.student}</span>
          </div>
          <p className="text-xs font-medium opacity-90">Student Cards</p>
        </button>

        {/* PWD Cards */}
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'PWD' ? null : 'PWD')}
          className={`bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-soft transition-all hover:scale-105 ${
            selectedFilter === 'PWD' ? 'ring-2 ring-white ring-offset-2 ring-offset-purple-600' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-5 h-5 opacity-80" />
            <span className="text-2xl font-bold">{cardCounts.pwd}</span>
          </div>
          <p className="text-xs font-medium opacity-90">PWD Cards</p>
        </button>

        {/* Senior Citizen Cards */}
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'Senior Citizen' ? null : 'Senior Citizen')}
          className={`bg-linear-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-soft transition-all hover:scale-105 ${
            selectedFilter === 'Senior Citizen' ? 'ring-2 ring-white ring-offset-2 ring-offset-amber-600' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-5 h-5 opacity-80" />
            <span className="text-2xl font-bold">{cardCounts.senior}</span>
          </div>
          <p className="text-xs font-medium opacity-90">Senior Citizen Cards</p>
        </button>
      </div>

      {/* Cards list */}
      {(() => {
        let displayCards = cards || [];
        if (selectedFilter === 'temporary') {
          displayCards = tempCards || [];
        } else if (selectedFilter && selectedFilter !== 'all') {
          displayCards = cards?.filter(c => c.passengerType === selectedFilter) || [];
        }

        if (displayCards.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-64 text-secondary-400">
              <CreditCard className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">No cards found</p>
              <p className="text-sm mt-1">Click "Register New Card" to get started</p>
            </div>
          );
        }

        return (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft border border-secondary-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary-50 border-b border-secondary-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Card ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Passenger Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Issued Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {displayCards.map((card) => (
                  <tr key={card.id} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-secondary-900">{card.cardId}</span>
                        {card.isTemporary && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-600">TEMP</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-secondary-900">{card.passengerName}</p>
                      <p className="text-xs text-secondary-500">{card.contactNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${
                        card.passengerType === 'Regular' ? 'bg-blue-100 text-blue-700' :
                        card.passengerType === 'Student' ? 'bg-green-100 text-green-700' :
                        card.passengerType === 'Senior Citizen' ? 'bg-orange-100 text-orange-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {card.passengerType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-emerald-600">₱{(card.balance ?? 0).toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        card.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          card.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                        }`} />
                        {card.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-secondary-600">{new Date(card.issuedAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewCard(card)}
                          className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="View Card"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditCard(card)}
                          className="p-2 text-secondary-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Card"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {card.status === 'active' ? (
                          <button
                            onClick={() => disableMutation.mutate(card.cardId)}
                            className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Disable Card"
                          >
                            <PowerOff className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => activateMutation.mutate(card.cardId)}
                            className="p-2 text-secondary-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Activate Card"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setReplaceTarget(card)}
                          className="p-2 text-secondary-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Replace Card"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteCard(card)}
                          className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Card"
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
        );
      })()}

      {/* Register modal */}
      {showRegister && (
        <RegisterCardModal
          onClose={() => setShowRegister(false)}
          onSuccess={handleRegistered}
        />
      )}

      {/* Auto-show generated card after registration */}
      {newCard && (
        <QRCardDisplay
          card={newCard}
          onClose={() => setNewCard(null)}
        />
      )}

      {/* View existing card */}
      {viewCard && (
        viewCard.isTemporary ? (
          <TemporaryCardDisplay
            card={viewCard}
            onClose={() => setViewCard(null)}
          />
        ) : (
          <QRCardDisplay
            card={viewCard}
            onClose={() => setViewCard(null)}
          />
        )
      )}

      {/* Replace confirm */}
      {replaceTarget && (
        <ReplaceCardModal
          card={replaceTarget}
          onClose={() => setReplaceTarget(null)}
          onConfirm={() => replaceMutation.mutate(replaceTarget.cardId)}
        />
      )}

      {/* Edit card */}
      {editCard && (
        <EditCardModal
          card={editCard}
          onClose={() => setEditCard(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['qrCards'] })}
        />
      )}

      {/* Delete card */}
      {deleteCard && (
        <DeleteCardModal
          card={deleteCard}
          onClose={() => setDeleteCard(null)}
          onConfirm={() => deleteMutation.mutate(deleteCard.cardId)}
        />
      )}
    </div>
  );
}
