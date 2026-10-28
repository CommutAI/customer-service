import { useRef, useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Printer, RotateCcw, Download } from 'lucide-react';
import type { QRCard } from '../types';
import { apiCalls } from '../lib/api';
import type { Transaction } from '../types';

import tempRegularCard from '../assets/TEMP-REG.png';
import tempStudentCard from '../assets/TEMP-STUD.png';
import tempSeniorCard from '../assets/temp-senior.png';
import tempPwdCard from '../assets/TEMP-PWD.png';
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
          const qrSize = Math.round(W * 0.36); // Increased size
          const qrX = Math.round(W * 0.60); // Moved further right to avoid left border
          const qrY = Math.round(H * 0.15); // Moved down to avoid top border

          // White background for QR code (smaller than QR code to avoid overlap)
          const bgPadding = Math.round(qrSize * 0.05); // 5% padding
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(
            qrX + bgPadding,
            qrY + bgPadding,
            qrSize - bgPadding * 2,
            qrSize - bgPadding * 2
          );

          ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
        }

        // Draw card ID below QR code
        const cardIdY = Math.round(H * 0.88); // Match TemporaryQRCards
        const cardIdX = Math.round(W * 0.75); // Moved left (was 0.78)
        const fontSize = Math.round(W * 0.035); // Increased font size (was 0.028)
        
        // Get color based on passenger type (match TemporaryQRCards)
        const colorMap: Record<string, string> = {
          'Regular': '#1362e2',
          'Student': '#1fb451',
          'Senior Citizen': '#961995',
          'PWD': '#f70b0e',
        };
        const cardIdColor = colorMap[card.passengerType] || '#1362e2';

        // Draw background rectangle to hide existing text
        ctx.font = `800 ${fontSize}px 'Courier New', monospace`; // Match TemporaryQRCards
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

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
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
              <title>Temporary Card - ${card.cardId}</title>
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
                  <h1>Temporary Card</h1>
                  <p>${card.cardId}</p>
                </div>

                <div class="card-section">
                  <h2>Front of Card</h2>
                  <img src="${canvasDataUrl}" alt="Temporary Card Front" class="card-image" />
                </div>

                <div class="card-section">
                  <h2>Back of Card</h2>
                  <img src="${tempBackCard}" alt="Temporary Card Back" class="card-image" />
                </div>
              </div>

              <!-- Page 2: Card Details and Transactions -->
              <div class="page">
                <div class="header">
                  <h1>Card Details</h1>
                  <p>${card.cardId}</p>
                </div>

                <div class="card-section">
                  <h2>Card Information</h2>
                  <div class="info-grid">
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
      backImg.src = tempBackCard;
    } else {
      // Canvas not ready yet, wait a bit and try again
      setTimeout(() => handleDownload(), 100);
    }
  };

  const confirmDownload = () => {
    if (combinedImage) {
      const link = document.createElement('a');
      link.download = `temp-card-${card.cardId}.png`;
      link.href = combinedImage;
      link.click();
      setShowDownloadPreview(false);
      setCombinedImage(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/20">
          <div>
            <h2 className="text-base font-bold text-white">Temporary Pass</h2>
            <p className="text-xs text-white/60 mt-0.5">{card.passengerType} · {card.cardId}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/60">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Display */}
        <div className="px-5 pt-4 pb-3">
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

        {/* Card Info */}
        <div className="mx-5 mb-4 grid grid-cols-2 gap-x-4 gap-y-2 p-3 bg-white/10 rounded-2xl text-xs">
          <div>
            <p className="text-white/60 uppercase tracking-wide text-[10px]">Card ID</p>
            <p className="font-mono font-bold text-white mt-0.5 truncate">{card.cardId}</p>
          </div>
          <div>
            <p className="text-white/60 uppercase tracking-wide text-[10px]">Type</p>
            <p className="font-semibold text-white mt-0.5">{card.passengerType}</p>
          </div>
          <div>
            <p className="text-white/60 uppercase tracking-wide text-[10px]">Balance</p>
            <p className="font-semibold text-white mt-0.5">₱{(card.balance ?? 0).toFixed(2)}</p>
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

        {/* Footer */}
        <div className="px-5 pb-5">
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
        </div>
      </div>

      {/* Download Preview Modal */}
      {showDownloadPreview && combinedImage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-4xl border border-white/20 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/20">
              <div>
                <h2 className="text-base font-bold text-white">Download Preview</h2>
                <p className="text-xs text-white/60 mt-0.5">Temporary Card - {card.cardId}</p>
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
                <p className="text-xs text-white/60 mt-0.5">Temporary Card - {card.cardId}</p>
              </div>
              <button onClick={() => setShowPrintPreview(false)} className="p-2 rounded-xl hover:bg-white/10 text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-white rounded-2xl p-6 text-gray-900">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">Temporary Card</h1>
                  <p className="text-gray-600">{card.cardId}</p>
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-3 border-b-2 border-gray-900 pb-2">Front of Card</h2>
                  {canvasRef.current && canvasRef.current.width > 0 ? (
                    <img src={canvasRef.current.toDataURL()} alt="Temporary Card Front" className="mx-auto max-w-sm" />
                  ) : (
                    <div className="text-center text-gray-500 py-8">Loading card preview...</div>
                  )}
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-3 border-b-2 border-gray-900 pb-2">Back of Card</h2>
                  <img src={tempBackCard} alt="Temporary Card Back" className="mx-auto max-w-sm" />
                </div>

                <div className="border-t-2 border-gray-300 pt-6">
                  <h2 className="text-lg font-bold mb-3 border-b-2 border-gray-900 pb-2">Card Information</h2>
                  <div className="grid grid-cols-2 gap-4 mb-6">
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
