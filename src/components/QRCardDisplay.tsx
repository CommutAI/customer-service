import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  X, RotateCcw, Wallet, Download, Printer,
} from 'lucide-react';
import type { QRCard } from '../types';
import { apiCalls } from '../lib/api';
import type { Transaction } from '../types';

import regularCard from '../assets/REGULAR.png';
import studentCard from '../assets/STUDENT.png';
import seniorCard  from '../assets/SENIOR-CITIZIEN.png';
import pwdCard     from '../assets/PWD.png';
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
function useCardCanvas(card: QRCard, qrRef: React.RefObject<HTMLDivElement | null>, showBack: boolean) {
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
        ctx.font          = `700 ${Math.round(W * 0.05)}px 'Telegraf', sans-serif`; // Reduced from 0.07 to 0.05
        ctx.fillStyle     = '#ffffff';
        ctx.shadowColor   = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur    = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillText(
          card.cardId,
          Math.round(W * 0.08),
          Math.round(H * 0.54)   // Moved card ID down (was 0.44)
        );

        // 3. Draw QR code on the right panel (no glass style, same size as box)
        const qrBoxX = Math.round(W * 0.52); // Moved left (was 0.56)
        const qrBoxY = Math.round(H * 0.17);
        const qrBoxSize = Math.round(W * 0.38);

        // Draw white background (same size as QR code)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

        // Draw QR code (same size as background)
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
  }, [card, qrRef, showBack]);

  return canvasRef;
}

// ── Main modal ─────────────────────────────────────────────────────────────

export default function QRCardDisplay({ card, onClose }: Props) {
  const [showBack, setShowBack] = useState(false);
  const qrRef     = useRef<HTMLDivElement>(null);
  const canvasRef = useCardCanvas(card, qrRef, showBack);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showDownloadPreview, setShowDownloadPreview] = useState(false);
  const [combinedImage, setCombinedImage] = useState<string | null>(null);

  // Fetch transactions when card changes
  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoadingTransactions(true);
      try {
        const txs = await apiCalls.getCardTransactions(card.cardId);
        setTransactions(txs);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    fetchTransactions();
  }, [card.cardId]);

  const handleGoToTopUp = () => {
    // Navigate to TopUp page with card ID pre-filled
    window.location.href = `/top-up?cardId=${card.cardId}`;
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      // Create a new canvas to combine front and back
      const combinedCanvas = document.createElement('canvas');
      const ctx = combinedCanvas.getContext('2d');
      if (!ctx) return;

      // Load the back card image
      const backImg = new Image();
      backImg.crossOrigin = 'anonymous';
      backImg.onload = () => {
        // Set combined canvas dimensions (2x width for side-by-side)
        combinedCanvas.width = canvas.width * 2;
        combinedCanvas.height = Math.max(canvas.height, backImg.naturalHeight);

        // Draw front card on the left
        ctx.drawImage(canvas, 0, 0);

        // Draw back card on the right
        const backHeight = canvas.height;
        const backWidth = canvas.width;
        ctx.drawImage(backImg, canvas.width, 0, backWidth, backHeight);

        // Add labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('FRONT', 20, 30);
        ctx.fillText('BACK', canvas.width + 20, 30);

        // Show preview instead of immediate download
        setCombinedImage(combinedCanvas.toDataURL('image/png'));
        setShowDownloadPreview(true);
      };
      backImg.onerror = () => {
        console.error('Failed to load back card image');
      };
      backImg.src = backCard;
    } else {
      // Canvas not ready yet, wait a bit and try again
      setTimeout(() => handleDownload(), 100);
    }
  };

  const confirmDownload = () => {
    if (combinedImage) {
      const link = document.createElement('a');
      link.download = `qr-card-${card.cardId}.png`;
      link.href = combinedImage;
      link.click();
      setShowDownloadPreview(false);
      setCombinedImage(null);
    }
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      setShowPrintPreview(true);
    } else {
      // Canvas not ready yet, wait a bit and try again
      setTimeout(() => handlePrint(), 100);
    }
  };

  const confirmPrint = () => {
    const canvas = canvasRef.current;
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      const printWindow = window.open('', '', 'width=800,height=1000');
      if (printWindow) {
        const transactionsHtml = transactions.length > 0
          ? transactions.map(tx => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date(tx.timestamp).toLocaleDateString()}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${tx.type}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₱${tx.amount.toFixed(2)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₱${tx.balanceAfter.toFixed(2)}</td>
              </tr>
            `).join('')
          : '<tr><td colspan="4" style="padding: 8px; text-align: center;">No transactions found</td></tr>';

        const canvasDataUrl = canvas.toDataURL('image/png');

        printWindow.document.write(`
          <html>
            <head>
              <title>QR Card - ${card.cardId}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .page { page-break-after: always; }
                .card-image { max-width: 400px; height: auto; display: block; margin: 0 auto; }
                .card-section { margin-bottom: 30px; }
                .card-section h2 { margin-bottom: 15px; color: #333; border-bottom: 2px solid #333; padding-bottom: 5px; }
                .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
                .info-item { }
                .info-label { font-weight: bold; color: #666; font-size: 12px; }
                .info-value { font-size: 14px; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background: #f5f5f5; padding: 10px; text-align: left; font-weight: bold; }
                td { padding: 8px; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { margin: 0; color: #333; }
                .header p { margin: 5px 0; color: #666; }
              </style>
            </head>
            <body>
              <!-- Page 1: Card Front and Back -->
              <div class="page">
                <div class="header">
                  <h1>QR Card</h1>
                  <p>${card.cardId}</p>
                </div>

                <div class="card-section">
                  <h2>Front of Card</h2>
                  <img src="${canvasDataUrl}" alt="QR Card Front" class="card-image" />
                </div>

                <div class="card-section">
                  <h2>Back of Card</h2>
                  <img src="${backCard}" alt="QR Card Back" class="card-image" />
                </div>
              </div>

              <!-- Page 2: Card Details and Transactions -->
              <div class="page">
                <div class="header">
                  <h1>Card Details</h1>
                  <p>${card.cardId}</p>
                </div>

                <div class="card-section">
                  <h2>Cardholder Information</h2>
                  <div class="info-grid">
                    <div class="info-item">
                      <div class="info-label">Cardholder Name</div>
                      <div class="info-value">${card.passengerName}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Contact Number</div>
                      <div class="info-value">${card.contactNumber || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Card ID</div>
                      <div class="info-value">${card.cardId}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Passenger Type</div>
                      <div class="info-value">${card.passengerType}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Status</div>
                      <div class="info-value">${card.status}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Current Balance</div>
                      <div class="info-value">₱${(card.balance ?? 0).toFixed(2)}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Issued Date</div>
                      <div class="info-value">${new Date(card.issuedAt).toLocaleDateString()}</div>
                    </div>
                    ${card.expiresAt ? `
                    <div class="info-item">
                      <div class="info-label">Expiration Date</div>
                      <div class="info-value">${new Date(card.expiresAt).toLocaleDateString()}</div>
                    </div>
                    ` : ''}
                  </div>
                </div>

                <div class="card-section">
                  <h2>Transaction History</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th style="text-align: right;">Amount</th>
                        <th style="text-align: right;">Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${transactionsHtml}
                    </tbody>
                  </table>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();

        // Wait for images to load before printing
        setTimeout(() => {
          printWindow.print();
          setShowPrintPreview(false);
        }, 500);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md border border-white/20 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/20">
          <div>
            <h2 className="text-base font-bold text-white">{card.passengerName}</h2>
            <p className="text-xs text-white/60 mt-0.5">{card.passengerType} · {card.cardId}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/60">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Display */}
        <>
            <div ref={qrRef} className="absolute opacity-0 pointer-events-none">
              <QRCodeCanvas value={card.cardId} size={512} level="H" includeMargin={true} />
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
                  className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {showBack ? 'Show front' : 'Show back'}
                </button>
              </div>
            </div>

            <div className="mx-5 mb-4 grid grid-cols-2 gap-x-4 gap-y-2 p-3 bg-white/10 rounded-2xl text-xs">
              <div>
                <p className="text-white/60 uppercase tracking-wide text-[10px]">Cardholder</p>
                <p className="font-semibold text-white mt-0.5 truncate">{card.passengerName}</p>
              </div>
              <div>
                <p className="text-white/60 uppercase tracking-wide text-[10px]">Type</p>
                <p className="font-semibold text-white mt-0.5">{card.passengerType}</p>
              </div>
              <div>
                <p className="text-white/60 uppercase tracking-wide text-[10px]">Card ID</p>
                <p className="font-mono font-bold text-white mt-0.5">{card.cardId}</p>
              </div>
              <div>
                <p className="text-white/60 uppercase tracking-wide text-[10px]">Status</p>
                <p className="font-semibold text-emerald-400 mt-0.5 capitalize">{card.status}</p>
              </div>
              {card.expiresAt && (
                <div className="col-span-2">
                  <p className="text-white/60 uppercase tracking-wide text-[10px]">Expiration Date</p>
                  <p className="font-semibold text-white mt-0.5">{new Date(card.expiresAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            <div className="px-5 pb-5 space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-primary-400"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-emerald-400"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
              <button
                onClick={handleGoToTopUp}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-amber-400"
              >
                <Wallet className="w-4 h-4" />
                Proceed to Top-up
              </button>
            </div>
        </>
      </div>

      {/* Download Preview Modal */}
      {showDownloadPreview && combinedImage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-4xl border border-white/20 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/20">
              <div>
                <h2 className="text-base font-bold text-white">Download Preview</h2>
                <p className="text-xs text-white/60 mt-0.5">QR Card - {card.cardId}</p>
              </div>
              <button onClick={() => { setShowDownloadPreview(false); setCombinedImage(null); }} className="p-2 rounded-xl hover:bg-white/10 text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <img src={combinedImage} alt="Card Preview" className="w-full rounded-2xl shadow-lg" />
            </div>
            <div className="px-5 pb-5">
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDownloadPreview(false); setCombinedImage(null); }}
                  className="flex-1 py-2.5 border border-white/20 rounded-2xl text-sm font-medium text-white/60 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDownload}
                  className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-primary-400"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-4xl border border-white/20 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/20">
              <div>
                <h2 className="text-base font-bold text-white">Print Preview</h2>
                <p className="text-xs text-white/60 mt-0.5">QR Card - {card.cardId}</p>
              </div>
              <button onClick={() => setShowPrintPreview(false)} className="p-2 rounded-xl hover:bg-white/10 text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-white rounded-2xl p-6 text-gray-900">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">QR Card</h1>
                  <p className="text-gray-600">{card.cardId}</p>
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-3 border-b-2 border-gray-900 pb-2">Front of Card</h2>
                  {canvasRef.current && canvasRef.current.width > 0 ? (
                    <img src={canvasRef.current.toDataURL()} alt="QR Card Front" className="mx-auto max-w-sm" />
                  ) : (
                    <div className="text-center text-gray-500 py-8">Loading card preview...</div>
                  )}
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-3 border-b-2 border-gray-900 pb-2">Back of Card</h2>
                  <img src={backCard} alt="QR Card Back" className="mx-auto max-w-sm" />
                </div>

                <div className="border-t-2 border-gray-300 pt-6">
                  <h2 className="text-lg font-bold mb-3 border-b-2 border-gray-900 pb-2">Cardholder Information</h2>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-gray-600 text-xs">Cardholder Name</div>
                      <div className="text-sm">{card.passengerName}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-gray-600 text-xs">Contact Number</div>
                      <div className="text-sm">{card.contactNumber || 'N/A'}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-gray-600 text-xs">Card ID</div>
                      <div className="text-sm">{card.cardId}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-gray-600 text-xs">Passenger Type</div>
                      <div className="text-sm">{card.passengerType}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-gray-600 text-xs">Status</div>
                      <div className="text-sm">{card.status}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-gray-600 text-xs">Current Balance</div>
                      <div className="text-sm">₱{(card.balance ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-gray-600 text-xs">Issued Date</div>
                      <div className="text-sm">{new Date(card.issuedAt).toLocaleDateString()}</div>
                    </div>
                    {card.expiresAt && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="font-bold text-gray-600 text-xs">Expiration Date</div>
                        <div className="text-sm">{new Date(card.expiresAt).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>

                  <h2 className="text-lg font-bold mb-3 border-b-2 border-gray-900 pb-2">Transaction History</h2>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 p-2 text-left font-bold">Date</th>
                        <th className="bg-gray-100 p-2 text-left font-bold">Type</th>
                        <th className="bg-gray-100 p-2 text-right font-bold">Amount</th>
                        <th className="bg-gray-100 p-2 text-right font-bold">Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length > 0 ? (
                        transactions.map(tx => (
                          <tr key={tx.id}>
                            <td className="p-2 border-b">{new Date(tx.timestamp).toLocaleDateString()}</td>
                            <td className="p-2 border-b">{tx.type}</td>
                            <td className="p-2 border-b text-right">₱{tx.amount.toFixed(2)}</td>
                            <td className="p-2 border-b text-right">₱{tx.balanceAfter.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-2 text-center">No transactions found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="flex-1 py-2.5 border border-white/20 rounded-2xl text-sm font-medium text-white/60 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPrint}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-emerald-400"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
