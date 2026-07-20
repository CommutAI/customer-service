import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  X, RotateCcw, Wallet,
} from 'lucide-react';
import type { QRCard } from '../types';

import regularCard from '../assets/regular.png';
import studentCard from '../assets/student.png';
import seniorCard  from '../assets/senior_citizien.png';
import pwdCard     from '../assets/pwd.png';
import backCard    from '../assets/back.png';

const TEMPLATES: Record<QRCard['passengerType'], string> = {
  Regular:          regularCard,
  Student:          studentCard,
  'Senior Citizen': seniorCard,
  PWD:              pwdCard,
};

interface Props {
  card: QRCard;
  onClose: () => void;
}

// ── Canvas hook ────────────────────────────────────────────────────────────
function useCardCanvas(card: QRCard, qrRef: React.RefObject<HTMLDivElement | null>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const timer = setTimeout(() => {
      const img = new Image();
      img.src = TEMPLATES[card.passengerType];
      img.onload = () => {
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const W = canvas.width;
        const H = canvas.height;

        // 1. Draw card template background
        ctx.drawImage(img, 0, 0);

        // ── Layout analysis from card images ──────────────────────────
        // Card is split: left panel 0–50%, right panel 50–100%
        // Left panel contains: logo (top), CARD ID label, value, PASSENGER TYPE label, value
        // Right panel: QR code fills it entirely
        //
        // Measured positions (as % of W/H):
        //   CARD ID label  : x=6%, y=28%  (label already on template)
        //   Card ID value  : x=6%, y=36%  ← we draw the actual ID here
        //   PASSENGER TYPE : x=6%, y=52%  (label already on template)
        //   Type value     : x=6%, y=68%  (already on template, we overdraw if needed)
        //   QR zone        : x=52%, y=8%, size=44% of width (square)

        // 2. Draw Card ID value after the "CARD ID:" label
        ctx.font          = `700 ${Math.round(W * 0.035)}px 'Arial', sans-serif`;
        ctx.fillStyle     = '#ffffff';
        ctx.shadowColor   = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur    = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillText(
          card.cardId,
          Math.round(W * 0.08),
          Math.round(H * 0.44)   // Moved card ID lower to 44%
        );

        // 3. Draw QR code inside the rounded box on the right panel
        const qrCanvas = qrRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
        if (qrCanvas) {
          const qrSize = Math.round(W * 0.42);    // Adjusted size for better fit within the panel
          const qrX    = Math.round(W * 0.50);    // Adjusted X position to center better
          const qrY    = Math.round(H * 0.13);    // Adjusted QR code position higher

          ctx.shadowBlur = 0;
          ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
        }

        ctx.shadowBlur    = 0;
        ctx.shadowOffsetY = 0;
      };
    }, 120);

    return () => clearTimeout(timer);
  }, [card, qrRef]);

  return canvasRef;
}

// ── Main modal ─────────────────────────────────────────────────────────────

export default function QRCardDisplay({ card, onClose }: Props) {
  const [showBack, setShowBack] = useState(false);
  const qrRef     = useRef<HTMLDivElement>(null);
  const canvasRef = useCardCanvas(card, qrRef);

  const handleGoToTopUp = () => {
    // Navigate to TopUp page with card ID pre-filled
    window.location.href = `/top-up?cardId=${card.cardId}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-secondary-100 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-secondary-100">
          <div>
            <h2 className="text-base font-bold text-secondary-900">{card.passengerName}</h2>
            <p className="text-xs text-secondary-400 mt-0.5">{card.passengerType} · {card.cardId}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary-100 text-secondary-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Display */}
        <>
            <div ref={qrRef} className="absolute opacity-0 pointer-events-none">
              <QRCodeCanvas value={card.cardId} size={512} level="H" includeMargin={false} />
            </div>

            <div className="px-5 pt-4 pb-3">
              {showBack ? (
                <img src={backCard} alt="Card back" className="w-full rounded-2xl shadow-lg" />
              ) : (
                <canvas
                  ref={canvasRef}
                  className="w-full rounded-2xl shadow-lg"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              )}
              <div className="flex justify-center mt-3">
                <button
                  onClick={() => setShowBack(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-secondary-500 hover:text-secondary-700 px-3 py-1.5 rounded-xl hover:bg-secondary-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {showBack ? 'Show front' : 'Show back'}
                </button>
              </div>
            </div>

            <div className="mx-5 mb-4 grid grid-cols-2 gap-x-4 gap-y-2 p-3 bg-secondary-50 rounded-2xl text-xs">
              <div>
                <p className="text-secondary-400 uppercase tracking-wide text-[10px]">Cardholder</p>
                <p className="font-semibold text-secondary-900 mt-0.5 truncate">{card.passengerName}</p>
              </div>
              <div>
                <p className="text-secondary-400 uppercase tracking-wide text-[10px]">Type</p>
                <p className="font-semibold text-secondary-900 mt-0.5">{card.passengerType}</p>
              </div>
              <div>
                <p className="text-secondary-400 uppercase tracking-wide text-[10px]">Card ID</p>
                <p className="font-mono font-bold text-secondary-900 mt-0.5">{card.cardId}</p>
              </div>
              <div>
                <p className="text-secondary-400 uppercase tracking-wide text-[10px]">Status</p>
                <p className="font-semibold text-emerald-600 mt-0.5 capitalize">{card.status}</p>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={handleGoToTopUp}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                Proceed to Top-up
              </button>
            </div>
        </>
      </div>
    </div>
  );
}
