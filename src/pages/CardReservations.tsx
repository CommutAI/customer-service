import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import type { CardReservation } from '../types';
import { Search, Plus, User, Phone, MapPin, CheckCircle, XCircle, Clock, Trash2, Calendar, Printer, Check, X, RotateCcw, Eye } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import QRCardDisplay from '../components/QRCardDisplay';
import type { QRCard } from '../types';

import regularCard from '../assets/REGULAR.png';
import studentCard from '../assets/STUDENT.png';
import seniorCard  from '../assets/SENIOR-CITIZIEN.png';
import pwdCard     from '../assets/PWD.png';
import backCard    from '../assets/back.png';

const TEMPLATES: Record<CardReservation['cardType'], string> = {
  Regular: regularCard,
  Student: studentCard,
  'Senior Citizen': seniorCard,
  PWD: pwdCard,
};

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

// ── Canvas-based card rendering component ─────────────────────────────────────
function CardCanvas({ reservation }: { reservation: CardReservation }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const timer = setTimeout(() => {
      const img = new Image();
      img.src = TEMPLATES[reservation.cardType];
      img.onload = () => {
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const W = canvas.width;
        const H = canvas.height;

        // 1. Draw card template background
        ctx.drawImage(img, 0, 0);

        // 2. Draw Card ID value
        ctx.font          = `700 ${Math.round(W * 0.04)}px 'Telegraf', sans-serif`;
        ctx.fillStyle     = '#ffffff';
        ctx.shadowColor   = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur    = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillText(
          reservation.cardId || reservation.reservationId,
          Math.round(W * 0.10),
          Math.round(H * 0.52)
        );

        // 2.5. Draw Card Type value (optional - uncomment to override template text)
        // ctx.font          = `700 ${Math.round(W * 0.035)}px 'Telegraf', sans-serif`;
        // ctx.fillStyle     = '#ffffff';
        // ctx.shadowColor   = 'rgba(0,0,0,0.5)';
        // ctx.shadowBlur    = 4;
        // ctx.shadowOffsetY = 1;
        // ctx.fillText(
        //   reservation.cardType.toUpperCase(),
        //   Math.round(W * 0.10),
        //   Math.round(H * 0.68)
        // );

        // 3. Draw QR code on the right panel
        const qrBoxX = Math.round(W * 0.52);
        const qrBoxY = Math.round(H * 0.17);
        const qrBoxSize = Math.round(W * 0.38);

        // Draw white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

        // Draw QR code
        const qrCanvas = qrRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
        if (qrCanvas) {
          ctx.shadowBlur = 0;
          ctx.drawImage(qrCanvas, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
        }

        ctx.shadowBlur    = 0;
        ctx.shadowOffsetY = 0;
      };
    }, 120);

    return () => clearTimeout(timer);
  }, [reservation]);

  return (
    <>
      <div ref={qrRef} className="absolute opacity-0 pointer-events-none">
        <QRCodeCanvas value={reservation.cardId || reservation.reservationId} size={512} level="H" includeMargin={true} />
      </div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-2xl shadow-lg"
        style={{ imageRendering: 'crisp-edges' }}
      />
    </>
  );
}

function QRCardPrint({ reservations, onClose }: { reservations: CardReservation[]; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [printImages, setPrintImages] = useState<Record<number, string>>({});

  // Keep all reservations with card IDs (including claimed ones for printing approved cards)
  const printReservations = reservations.filter(r => r.cardId);

  // Generate canvas images for all cards
  useEffect(() => {
    const generateImages = async () => {
      const images: Record<number, string> = {};

      for (const reservation of printReservations) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const img = new Image();
        img.src = TEMPLATES[reservation.cardType];

        await new Promise<void>((resolve) => {
          img.onload = () => {
            canvas.width  = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const W = canvas.width;
            const H = canvas.height;

            // Draw card template background
            ctx.drawImage(img, 0, 0);

            // Draw Card ID value
            ctx.font          = `700 ${Math.round(W * 0.04)}px 'Telegraf', sans-serif`;
            ctx.fillStyle     = '#ffffff';
            ctx.shadowColor   = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur    = 4;
            ctx.shadowOffsetY = 1;
            ctx.fillText(
              reservation.cardId || reservation.reservationId,
              Math.round(W * 0.10),
              Math.round(H * 0.52)
            );

            // Generate QR code using API
            const qrSize = 512;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(reservation.cardId || reservation.reservationId)}`;
            const qrImg = new Image();
            qrImg.crossOrigin = 'anonymous';
            qrImg.onload = () => {
              // Draw QR code on card
              const qrBoxX = Math.round(W * 0.52);
              const qrBoxY = Math.round(H * 0.17);
              const qrBoxSize = Math.round(W * 0.38);

              ctx.fillStyle = '#ffffff';
              ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
              ctx.shadowBlur = 0;
              ctx.drawImage(qrImg, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

              images[reservation.id] = canvas.toDataURL('image/png');
              resolve();
            };
            qrImg.onerror = () => resolve();
            qrImg.src = qrCodeUrl;
          };
          img.onerror = () => resolve();
        });
      }

      // Set all images at once after the loop completes
      setPrintImages(images);
      console.log('Generated images for', Object.keys(images).length, 'cards');
    };

    if (printReservations.length > 0) {
      generateImages();
    }
  }, [printReservations]);

  const handlePrint = () => {
    // Check if all images are ready
    const missingImages = printReservations.filter(r => !printImages[r.id]);
    if (missingImages.length > 0) {
      console.warn('Not all card images are ready yet. Missing:', missingImages.length);
      alert('Please wait, card images are still loading...');
      return;
    }

    const printWindow = window.open('', '', 'width=800,height=1000');
    if (!printWindow) return;

    const cardsHtml = printReservations.map((reservation) => {
      const imageData = printImages[reservation.id];
      if (!imageData) {
        console.error('Missing image for reservation:', reservation.id, reservation.name);
        return '';
      }

      return `
        <div class="card-container">
          <div class="card-title">${reservation.name} - ${reservation.cardType}</div>
          <div class="card-images">
            <div class="card-image-wrapper">
              <h3>Front</h3>
              <img src="${imageData}" alt="QR Card Front - ${reservation.cardId}" class="card-image" />
            </div>
            <div class="card-image-wrapper">
              <h3>Back</h3>
              <img src="${backCard}" alt="QR Card Back" class="card-image" />
            </div>
          </div>
        </div>
      `;
    }).join('');

    console.log('Printing', printReservations.length, 'cards. HTML length:', cardsHtml.length);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Cards - Batch Print</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              margin: 0;
            }
            .card-container {
              max-width: 100%;
              margin: 0 auto 50px auto;
              page-break-inside: avoid;
            }
            .card-title {
              font-size: 14px;
              font-weight: bold;
              color: #333;
              text-align: center;
              margin-bottom: 15px;
            }
            .card-images {
              display: flex;
              gap: 20px;
              justify-content: center;
              flex-wrap: wrap;
            }
            .card-image-wrapper {
              text-align: center;
              flex: 1;
              min-width: 0;
            }
            .card-image-wrapper h3 {
              margin-bottom: 8px;
              font-size: 12px;
              color: #666;
            }
            .card-image {
              max-width: 100%;
              width: 100%;
              height: auto;
              display: block;
            }
            @media print {
              body { padding: 10px; margin: 0; }
              .card-container {
                max-width: 400px;
                page-break-after: always;
                page-break-inside: avoid;
              }
              .card-container:last-child {
                page-break-after: auto;
              }
              .card-image { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          ${cardsHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl border border-gray-200 rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Print QR Cards ({printReservations.length})
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              {printReservations.length === 1 ? '1 approved card selected' : `${printReservations.length} approved cards selected`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 border border-gray-200">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {printReservations.map((reservation) => (
              <div key={reservation.id} className="bg-gray-50 rounded-2xl p-4">
                <div className="text-center mb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Preview</p>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-3">
                    <div className="text-center mb-2">
                      <h3 className="text-sm font-bold text-gray-800">{reservation.name}</h3>
                      <p className="text-[10px] text-gray-500">{reservation.cardType}</p>
                    </div>
                    <div className="relative mb-3">
                      <CardCanvas reservation={reservation} />
                    </div>
                    <div className="relative">
                      <img src={backCard} alt="Card Back" className="w-full max-w-xs mx-auto rounded-2xl shadow-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-white text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Card Reservations</h1>
          <p className="text-sm text-white/60">Manage card pickup reservations</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {selectedReservations.size > 0 && (
            <>
              <button
                onClick={() => setSelectedReservations(new Set())}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-white/20 text-white/60 rounded-2xl text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Clear Selection
              </button>
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft border border-primary-400"
              >
                <Printer className="w-4 h-4" />
                Print {selectedReservations.size} Card{selectedReservations.size > 1 ? 's' : ''}
              </button>
            </>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold transition-colors shadow-soft border border-primary-400"
          >
            <Plus className="w-4 h-4" />
            New Reservation
          </button>
        </div>
      </div>

      <div className="glass-card">
        <div className="p-4 sm:p-6 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {[
              { value: 'all' as const, label: 'All Reservations' },
              { value: 'pending' as const, label: 'Pending' },
              { value: 'approved' as const, label: 'Approved' },
              { value: 'claimed' as const, label: 'Claimed' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all border ${
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
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Search by name, reservation ID, or contact..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-white/20 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/10 text-sm text-white placeholder-white/40"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/10 text-primary-500 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Status</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Reservation ID</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Name</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Contact</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Card Type</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Pickup Terminal</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Created</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
            <tbody className="divide-y divide-white/10">
              {paginatedReservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
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
          </div>
        </div>

        {filteredReservations.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-white/20 mb-4" />
            <p className="text-white/60">No reservations found</p>
          </div>
        )}

        {filteredReservations.length > 0 && (
          <div className="px-4 sm:px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <p className="text-xs sm:text-sm text-white/60">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredReservations.length)} of {filteredReservations.length} reservations
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-white/20 rounded-lg text-xs sm:text-sm text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      className={`px-3 py-2 border rounded-lg text-xs sm:text-sm transition-colors ${
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
                className="px-3 py-2 border border-white/20 rounded-lg text-xs sm:text-sm text-white/60 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
