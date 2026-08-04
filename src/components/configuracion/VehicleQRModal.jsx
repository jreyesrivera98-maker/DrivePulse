import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { X, QrCode, Download } from "lucide-react";

export default function VehicleQRModal({ open, onClose, vehicle }) {
  const canvasRef = useRef(null);
  if (!open || !vehicle) return null;

  const url = `${window.location.origin}/vehiculo/${vehicle.id}`;

  const download = () => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `QR-${vehicle.identifier || vehicle.plate}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <QrCode size={16} className="text-teal-600" /> Código QR — {vehicle.identifier || vehicle.plate}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <div ref={canvasRef} className="bg-white p-3 rounded-xl border border-slate-200">
            <QRCodeCanvas value={url} size={200} level="M" />
          </div>
          <p className="text-[11px] text-slate-400 font-mono break-all text-center">{url}</p>
          <button onClick={download} className="w-full bg-dp-black hover:bg-[#161d30] text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
            <Download size={14} /> Descargar QR
          </button>
        </div>
      </div>
    </div>
  );
}
