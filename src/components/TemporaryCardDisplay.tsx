import { useRef, useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Printer, RotateCcw } from 'lucide-react';
import type { QRCard } from '../types';

import tempRegularCard from '../assets/temp-regular.png';
import tempStudentCard from '../assets/temp-student.png';
import tempSeniorCard from '../assets/temp-senior.png';
import tempPwdCard from '../assets/temp-pwd.png';
import tempBackCard from '../assets/temp-back.png';

const TEMP_TEMPLATES: Record<string, string> = {
  'Regular': tempRegularCard,
  'Student': tempStudentCard,
  'Senior Citizen': tempSeniorCard,
  'PWD': tempPwdCard,
};

interface Props {
  card: QRCard;
  onClose: () => void;
}

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

export default function TemporaryCardDisplay({ card, onClose }: Props) {
  const [showBack, setShowBack] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const canvasRef = useTempCardCanvas(card, qrRef);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-secondary-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-secondary-100">
          <div>
            <h2 className="text-base font-bold text-secondary-900">Temporary Pass</h2>
            <p className="text-xs text-secondary-400 mt-0.5">{card.passengerType} · {card.cardId}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary-100 text-secondary-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Display */}
        <div className="px-5 pt-4 pb-3">
          <div ref={qrRef} className="absolute opacity-0 pointer-events-none">
            <QRCodeCanvas value={card.cardId} size={512} level="H" includeMargin={false} />
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

        {/* Card Info */}
        <div className="mx-5 mb-4 grid grid-cols-2 gap-x-4 gap-y-2 p-3 bg-secondary-50 rounded-2xl text-xs">
          <div>
            <p className="text-secondary-400 uppercase tracking-wide text-[10px]">Card ID</p>
            <p className="font-mono font-bold text-secondary-900 mt-0.5 truncate">{card.cardId}</p>
          </div>
          <div>
            <p className="text-secondary-400 uppercase tracking-wide text-[10px]">Type</p>
            <p className="font-semibold text-secondary-900 mt-0.5">{card.passengerType}</p>
          </div>
          <div>
            <p className="text-secondary-400 uppercase tracking-wide text-[10px]">Balance</p>
            <p className="font-semibold text-secondary-900 mt-0.5">₱100.00</p>
          </div>
          <div>
            <p className="text-secondary-400 uppercase tracking-wide text-[10px]">Status</p>
            <p className="font-semibold text-emerald-600 mt-0.5 capitalize">{card.status}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={handlePrint}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Card
          </button>
        </div>
      </div>
    </div>
  );
}
