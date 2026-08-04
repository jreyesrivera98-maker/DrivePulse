import { useState } from "react";
import { ScanLine, Loader2, Upload } from "lucide-react";
import { uploadFile, BUCKETS } from "../../lib/supabaseClient";

const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/40";

export default function VoucherOCR({ voucher, setVoucher, vehicleId, toast }) {
  const [processing, setProcessing] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setProcessing(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${vehicleId}/${Date.now()}_voucher.${ext}`;
      const imagenUrl = await uploadFile(BUCKETS.fuelVouchers, path, file);

      // OCR simulado: no hay servicio de reconocimiento óptico conectado
      // todavía (se integraría vía Edge Function con Google Vision / Mindee).
      const estaciones = ["Pemex Gonzalitos", "Oxxo Gas Constitución", "Pemex García", "Shell Cumbres"];
      const litros = (Math.random() * 30 + 15).toFixed(1);
      const precioLitro = 22.5 + Math.random() * 2;
      const monto = (litros * precioLitro).toFixed(2);

      setVoucher({
        attached: true,
        imagenUrl,
        litros,
        monto,
        estacion: estaciones[Math.floor(Math.random() * estaciones.length)],
        folio: `F-${Math.floor(Math.random() * 900000 + 100000)}`,
        ocrConfidence: "Media",
        fecha: new Date().toISOString().slice(0, 16),
      });
      toast("Ticket subido. Datos extraídos por OCR (simulado) — verifica antes de guardar.");
    } catch (err) {
      toast(err.message || "No se pudo subir el voucher.", "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
      <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
        <ScanLine size={14} className="text-teal-600" /> Voucher de combustible (OCR)
      </p>
      {!voucher.attached ? (
        <label className="w-full border-2 border-dashed border-slate-300 rounded-lg py-4 text-xs text-slate-500 flex flex-col items-center gap-1.5 hover:border-teal-400 hover:text-teal-600 transition cursor-pointer">
          {processing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          {processing ? "Subiendo y extrayendo datos..." : "Adjuntar foto del ticket / voucher"}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files[0])} disabled={processing} />
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400">Litros cargados</label>
            <input className={inputCls} value={voucher.litros} onChange={(e) => setVoucher({ ...voucher, litros: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Monto total ($)</label>
            <input className={inputCls} value={voucher.monto} onChange={(e) => setVoucher({ ...voucher, monto: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Folio</label>
            <input className={inputCls} value={voucher.folio || ""} onChange={(e) => setVoucher({ ...voucher, folio: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-slate-400">Estación de servicio</label>
            <input className={inputCls} value={voucher.estacion} onChange={(e) => setVoucher({ ...voucher, estacion: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-slate-400">Fecha y hora del ticket</label>
            <input type="datetime-local" className={inputCls} value={voucher.fecha} onChange={(e) => setVoucher({ ...voucher, fecha: e.target.value })} />
          </div>
          <button type="button" onClick={() => setVoucher({ attached: false })} className="col-span-2 text-[11px] text-rose-500 mt-1 text-left">
            Quitar voucher
          </button>
        </div>
      )}
    </div>
  );
}
