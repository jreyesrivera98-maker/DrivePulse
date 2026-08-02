import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";

/**
 * QR real y escaneable (no decorativo) que apunta a la landing
 * pública del vehículo: {origen}/vehiculo/{id}. Pensado para
 * imprimirse y pegarse en el tablero/parabrisas de la unidad.
 */
export default function VehicleQRCode({ vehicleId, size = 140, showUrl = false }) {
  const url = `${window.location.origin}/vehiculo/${vehicleId}`;

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="bg-white p-3 rounded-xl border border-slate-200">
        <QRCodeSVG value={url} size={size} level="M" includeMargin={false} />
      </div>
      <p className="text-[11px] text-slate-500 flex items-center gap-1">
        <QrCode size={12} /> Código de acceso rápido
      </p>
      {showUrl && <p className="text-[10px] text-slate-400 font-mono break-all text-center">{url}</p>}
    </div>
  );
}
