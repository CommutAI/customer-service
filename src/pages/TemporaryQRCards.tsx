import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCalls } from '../lib/api';
import type { QRCard } from '../types';
import { QrCode, Plus, Wallet, Clock, XCircle, Trash2, DollarSign, Printer } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

import tempRegularCard from '../assets/temp-regular.png';
import tempStudentCard from '../assets/temp-student.png';
import tempSeniorCard from '../assets/temp-senior.png';
import tempPwdCard from '../assets/temp-pwd.png';
import tempBackCard from '../assets/temp-back.png';

export default function TemporaryQRCards() {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<QRCard | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const queryClient = useQueryClient();

  const { data: cards, isLoading } = useQuery({
    queryKey: ['temporaryQRCards'],
    queryFn: apiCalls.getTemporaryQRCards,
  });

  const generateMutation = useMutation({
    mutationFn: (passengerType: 'Regular' | 'Student' | 'Senior Citizen' | 'PWD') => 
      apiCalls.createTemporaryQRCard(passengerType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temporaryQRCards'] });
      queryClient.invalidateQueries({ queryKey: ['qrCards'] });
      setShowGenerateModal(false);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: apiCalls.deactivateTemporaryQRCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temporaryQRCards'] });
      queryClient.invalidateQueries({ queryKey: ['qrCards'] });
      setSelectedCard(null);
    },
  });

  const topUpMutation = useMutation({
    mutationFn: (cardId: string) => apiCalls.topUp(cardId, parseFloat(topUpAmount), 'cash'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temporaryQRCards'] });
      queryClient.invalidateQueries({ queryKey: ['qrCards'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowTopUpModal(false);
      setTopUpAmount('');
      setSelectedCard(null);
    },
  });

  const handleTopUp = (card: QRCard) => {
    setSelectedCard(card);
    setShowTopUpModal(true);
  };

  const activeCards = cards?.filter(c => c.status === 'active') ?? [];
  const inactiveCards = cards?.filter(c => c.status !== 'active') ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-secondary-900">Temporary QR Cards</h1>
          <p className="text-sm text-secondary-500">Manage temporary cards with ₱100 balance</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate Card
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-secondary-400">Loading...</div>
      ) : cards && cards.length === 0 ? (
        <div className="text-center py-12 bg-white/50 rounded-3xl border border-dashed border-secondary-200">
          <QrCode className="w-12 h-12 mx-auto text-secondary-300 mb-3" />
          <p className="text-secondary-500">No temporary QR cards generated yet</p>
          <p className="text-sm text-secondary-400 mt-1">Click "Generate Card" to create one</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Cards */}
          {activeCards.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-secondary-600 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Active Cards ({activeCards.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCards.map((card) => (
                  <CardCard
                    key={card.id}
                    card={card}
                    onView={() => setSelectedCard(card)}
                    onDeactivate={() => deactivateMutation.mutate(card.id)}
                    onTopUp={() => handleTopUp(card)}
                    isDeactivating={deactivateMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Cards */}
          {inactiveCards.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-secondary-600 mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Inactive Cards ({inactiveCards.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveCards.map((card) => (
                  <CardCard
                    key={card.id}
                    card={card}
                    onView={() => setSelectedCard(card)}
                    onDeactivate={() => deactivateMutation.mutate(card.id)}
                    onTopUp={() => {}}
                    isDeactivating={deactivateMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <GenerateModal
          onClose={() => setShowGenerateModal(false)}
          onGenerate={(passengerType) => generateMutation.mutate(passengerType)}
          isGenerating={generateMutation.isPending}
        />
      )}

      {/* Top Up Modal */}
      {showTopUpModal && selectedCard && (
        <TopUpModal
          card={selectedCard}
          amount={topUpAmount}
          onAmountChange={setTopUpAmount}
          onClose={() => {
            setShowTopUpModal(false);
            setTopUpAmount('');
            setSelectedCard(null);
          }}
          onTopUp={() => topUpMutation.mutate(selectedCard.id)}
          isProcessing={topUpMutation.isPending}
        />
      )}

      {/* Card Detail Modal */}
      {selectedCard && !showTopUpModal && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}

function CardCard({
  card,
  onView,
  onDeactivate,
  onTopUp,
  isDeactivating,
}: {
  card: QRCard;
  onView: () => void;
  onDeactivate: () => void;
  onTopUp: () => void;
  isDeactivating: boolean;
}) {
  const isActive = card.status === 'active';

  return (
    <div className={`bg-white/80 backdrop-blur-xl rounded-2xl shadow-soft p-5 border ${
      isActive ? 'border-green-200' : 'border-secondary-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-100">
          <QrCode className="w-5 h-5 text-green-600" />
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          isActive
            ? 'bg-green-100 text-green-700'
            : 'bg-secondary-100 text-secondary-600'
        }`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="mb-4">
        <p className="text-xs text-secondary-400 mb-1">Card ID</p>
        <p className="font-mono font-bold text-secondary-900 text-sm">{card.cardId}</p>
      </div>
      <div className="mb-4">
        <p className="text-xs text-secondary-400 mb-1">Balance</p>
        <p className="font-bold text-2xl text-green-600">₱100.00</p>
      </div>
      <div className="mb-4">
        <p className="text-xs text-secondary-400 mb-1">Issued</p>
        <p className="text-sm text-secondary-700">
          {new Date(card.issuedAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onView}
          className="flex-1 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-xl text-xs font-semibold transition-colors"
        >
          View
        </button>
        {isActive && (
          <>
            <button
              onClick={onTopUp}
              className="flex-1 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl text-xs font-semibold transition-colors"
            >
              Top Up
            </button>
            <button
              onClick={onDeactivate}
              disabled={isDeactivating}
              className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function GenerateModal({
  onClose,
  onGenerate,
  isGenerating,
}: {
  onClose: () => void;
  onGenerate: (passengerType: 'Regular' | 'Student' | 'Senior Citizen' | 'PWD') => void;
  isGenerating: boolean;
}) {
  const [passengerType, setPassengerType] = useState<'Regular' | 'Student' | 'Senior Citizen' | 'PWD'>('Regular');
  const qrRef = useRef<HTMLDivElement>(null);
  
  // Preview card data
  const previewCard: QRCard = {
    id: 'preview',
    passengerId: 'preview',
    cardId: 'TMP-2025-000001',
    passengerName: 'Temporary Card',
    passengerType,
    contactNumber: '',
    status: 'active',
    issuedAt: new Date().toISOString(),
    qrCode: 'TMP-2025-000001',
    isTemporary: true,
  };
  
  const canvasRef = useTempCardCanvas(previewCard, qrRef);

  return (
    <div className="fixed inset-0 bg-secondary-900/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 w-full max-w-2xl shadow-soft-xl border border-secondary-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center">
            <Plus className="w-6 h-6 mr-2 text-green-500" />
            Generate Temporary Card
          </h2>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600 p-2 rounded-xl hover:bg-secondary-100 transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="flex gap-6 mb-6">
          {/* Left side - Form */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">
                Passenger Type
              </label>
              <select
                value={passengerType}
                onChange={(e) => setPassengerType(e.target.value as any)}
                className="w-full px-4 py-3 border-2 border-secondary-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-green-500 bg-white"
              >
                <option value="Regular">Regular</option>
                <option value="Student">Student</option>
                <option value="Senior Citizen">Senior Citizen</option>
                <option value="PWD">PWD</option>
              </select>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-secondary-900">Initial Balance</p>
                  <p className="text-2xl font-bold text-green-600">₱100.00</p>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-secondary-600">
              This card can be used multiple times until the balance is insufficient.
              The passenger will hold the card until the end of their trip.
            </p>
          </div>
          
          {/* Right side - Card Preview */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div ref={qrRef} className="absolute opacity-0 pointer-events-none">
              <QRCodeCanvas value={previewCard.cardId} size={512} level="H" includeMargin={true} />
            </div>
            
            <canvas
              ref={canvasRef}
              className="w-full rounded-2xl shadow-lg"
              style={{ imageRendering: 'crisp-edges' }}
            />
            
            <p className="text-xs text-secondary-500 mt-2">Card Preview</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-secondary-200 rounded-2xl text-sm font-medium text-secondary-600 hover:bg-secondary-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onGenerate(passengerType)}
            disabled={isGenerating}
            className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Card'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TEMP_TEMPLATES: Record<string, string> = {
  'Regular': tempRegularCard,
  'Student': tempStudentCard,
  'Senior Citizen': tempSeniorCard,
  'PWD': tempPwdCard,
};

function useTempCardCanvas(card: QRCard, qrRef: React.RefObject<HTMLDivElement | null>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const timer = setTimeout(() => {
      const img = new Image();
      img.src = TEMP_TEMPLATES[card.passengerType] || tempRegularCard;
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const W = canvas.width;
        const H = canvas.height;

        // Draw card template background
        ctx.drawImage(img, 0, 0);

        // Draw QR code on the right side
        const qrCanvas = qrRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
        if (qrCanvas) {
          const qrSize = Math.round(W * 0.36);
          const qrX = Math.round(W * 0.60);
          const qrY = Math.round(H * 0.18);

          ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
        }

        // Draw card ID below QR code
        const cardIdY = Math.round(H * 0.93);
        const cardIdX = Math.round(W * 0.78);
        const fontSize = Math.round(W * 0.050);
        
        // Get color based on passenger type
        const colorMap: Record<string, string> = {
          'Regular': '#1362e2',
          'Student': '#1fb451',
          'Senior Citizen': '#961995',
          'PWD': '#f70b0e',
        };
        const cardIdColor = colorMap[card.passengerType] || '#1362e2';
        
        // Draw background rectangle to hide existing text
        ctx.font = `800 ${fontSize}px 'Courier New', monospace`;
        const textWidth = ctx.measureText(card.cardId).width;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
          cardIdX - textWidth / 2 - 15,
          cardIdY - fontSize - 8,
          textWidth + 30,
          fontSize + 20
        );
        
        // Draw card ID text
        ctx.fillStyle = cardIdColor;
        ctx.textAlign = 'center';
        ctx.fillText(
          card.cardId,
          cardIdX,
          cardIdY
        );
      };
    }, 120);

    return () => clearTimeout(timer);
  }, [card, qrRef]);

  return canvasRef;
}

function CardDetailModal({ card, onClose }: { card: QRCard; onClose: () => void }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useTempCardCanvas(card, qrRef);
  const [showBack, setShowBack] = useState(false);

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const printWindow = window.open('', '', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Temporary Card - ${card.cardId}</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                img { max-width: 100%; height: auto; }
              </style>
            </head>
            <body>
              <img src="${canvas.toDataURL()}" alt="Temporary Card" />
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-secondary-900/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-4xl shadow-soft-xl border border-secondary-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center">
            <QrCode className="w-6 h-6 mr-2 text-green-500" />
            Card Details
          </h2>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600 p-2 rounded-xl hover:bg-secondary-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Left column — Information */}
          <div className="flex-1 space-y-3 max-w-md">
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
              <p className="text-xs text-secondary-600 mb-1">Card ID</p>
              <p className="font-mono font-bold text-base text-secondary-900 break-all">{card.cardId}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl">
                <p className="text-xs text-secondary-600 mb-1">Balance</p>
                <p className="font-bold text-xl text-green-600">₱100.00</p>
              </div>
              <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl">
                <p className="text-xs text-secondary-600 mb-1">Status</p>
                <p className={`font-bold text-xl capitalize ${
                  card.status === 'active' ? 'text-green-600' : 'text-secondary-600'
                }`}>
                  {card.status}
                </p>
              </div>
            </div>
            <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-2xl">
              <p className="text-xs text-secondary-600 mb-1">Issued Date</p>
              <p className="font-semibold text-secondary-900 text-sm">
                {new Date(card.issuedAt).toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <p className="text-xs text-blue-600 mb-2 font-semibold">How it works:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Card has ₱100 initial balance</li>
                <li>• Can be used for multiple trips</li>
                <li>• Passenger holds card until trip end</li>
                <li>• Conductor scans and displays fare</li>
                <li>• Balance deducted per trip</li>
              </ul>
            </div>
          </div>

          {/* Right column — QR Card */}
          <div className="flex flex-col items-center justify-center gap-4 min-w-56 max-w-72">
            <div ref={qrRef} className="absolute opacity-0 pointer-events-none">
              <QRCodeCanvas value={card.cardId} size={512} level="H" includeMargin={true} />
            </div>
            
            {showBack ? (
              <img src={tempBackCard} alt="Card back" className="w-full rounded-2xl shadow-lg" />
            ) : (
              <canvas
                ref={canvasRef}
                className="w-full rounded-2xl shadow-lg"
                style={{ imageRendering: 'crisp-edges' }}
              />
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowBack(v => !v)}
                className="flex-1 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-xl text-xs font-semibold transition-colors"
              >
                {showBack ? 'Show Front' : 'Show Back'}
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TopUpModal({
  card,
  amount,
  onAmountChange,
  onClose,
  onTopUp,
  isProcessing,
}: {
  card: QRCard;
  amount: string;
  onAmountChange: (value: string) => void;
  onClose: () => void;
  onTopUp: () => void;
  isProcessing: boolean;
}) {
  const isValid = amount && parseFloat(amount) > 0;

  return (
    <div className="fixed inset-0 bg-secondary-900/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md shadow-soft-xl border border-secondary-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-secondary-900 flex items-center">
            <DollarSign className="w-6 h-6 mr-2 text-green-500" />
            Top Up Card
          </h2>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600 p-2 rounded-xl hover:bg-secondary-100 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 mb-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
            <p className="text-xs text-secondary-600 mb-1">Card ID</p>
            <p className="font-mono font-bold text-lg text-secondary-900">{card.cardId}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              Top-up Amount (₱)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-4 py-3 border-2 border-secondary-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-green-500"
            />
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <p className="text-xs text-blue-600 mb-2 font-semibold">Note:</p>
            <p className="text-xs text-blue-700">
              Temporary cards can be topped up with any amount. The balance will be added to the card for multiple trips.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-secondary-200 rounded-2xl text-sm font-medium text-secondary-600 hover:bg-secondary-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onTopUp}
            disabled={!isValid || isProcessing}
            className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Top Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
