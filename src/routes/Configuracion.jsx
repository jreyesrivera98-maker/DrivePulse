import { useState, useEffect } from "react";
import { Save, UserPlus, Zap, Calendar, ClipboardList, QrCode, EyeOff, Loader2, Trash2 } from "lucide-react";
import { uploadFile, BUCKETS, resetPasswordForEmail } from "../lib/supabaseClient";
import { useBranding } from "../hooks/useBranding";
import { useProfiles } from "../hooks/useProfiles";
import { useToasts, ToastStack } from "../components/ui/Toast";
import { Field, inputCls } from "../components/ui/formPrimitives";
import InviteUserModal from "../components/configuracion/InviteUserModal";
import VehiculosTab from "../components/configuracion/VehiculosTab";
import GpsIntegrationTab from "../components/configuracion/GpsIntegrationTab";

const TABS = [
  { key: "vehiculos", label: "Vehículos" },
  { key: "branding", label: "Marca y Login" },
  { key: "lightning", label: "Botón Rápido" },
  { key: "usuarios", label: "Usuarios" },
  { key: "gps", label: "GPS" },
];

const LIGHTNING_OPTIONS = [
  { v: "a", label: "Nueva Reserva Rápida", icon: Calendar },
  { v: "b", label: "Check-in / Out Inmediato", icon: ClipboardList },
  { v: "c", label: "Escanear QR", icon: QrCode },
  { v: "d", label: "Ocultar ícono", icon: EyeOff },
];

export default function Configuracion() {
  const { branding, loading: loadingBranding, updateBranding } = useBranding();
  const { profiles, loading: loadingProfiles, updateRole, toggleStatus } = useProfiles();
  const { toasts, toast, remove } = useToasts();

  const [tab, setTab] = useState("vehiculos");
  const [form, setForm] = useState(branding);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);

  useEffect(() => setForm(branding), [branding]);

  const saveBranding = async (patch = {}) => {
    setSaving(true);
    try {
      await updateBranding({ ...form, ...patch });
      toast("Configuración de marca actualizada.");
    } catch (err) {
      toast(err.message || "No se pudo guardar.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file, kind) => {
    if (!file) return;
    const setBusy = kind === "logo" ? setUploadingLogo : setUploadingBanner;
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${kind}-${Date.now()}.${ext}`;
      const url = await uploadFile(BUCKETS.branding, path, file, { isPublic: true });
      const field = kind === "logo" ? "logo_url" : "login_banner_url";
      const updated = { ...form, [field]: url };
      setForm(updated);
      await updateBranding({ [field]: url });
      toast(kind === "logo" ? "Logotipo actualizado." : "Banner de login actualizado.");
    } catch (err) {
      toast(err.message || "No se pudo subir la imagen.", "error");
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (id, role) => {
    setBusyUserId(id);
    try {
      await updateRole(id, role);
      toast("Rol actualizado.");
    } catch (err) {
      toast(err.message || "No se pudo cambiar el rol.", "error");
    } finally {
      setBusyUserId(null);
    }
  };

  const changeStatus = async (id, status) => {
    setBusyUserId(id);
    try {
      await toggleStatus(id, status);
      toast(status === "activo" ? "Colaborador reactivado." : "Colaborador desactivado.");
    } catch (err) {
      toast(err.message || "No se pudo actualizar el estatus.", "error");
    } finally {
      setBusyUserId(null);
    }
  };

  const sendReset = async (email) => {
    try {
      await resetPasswordForEmail(email);
      toast(`Correo de restablecimiento enviado a ${email}.`);
    } catch (err) {
      toast(err.message || "No se pudo enviar el correo.", "error");
    }
  };

  if (loadingBranding || loadingProfiles) {
    return (
      <div className="flex items-center justify-center h-full py-24 text-slate-400 gap-2">
        <Loader2 size={18} className="animate-spin" /> Cargando configuración…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <ToastStack toasts={toasts} remove={remove} />

      <div>
        <h1 className="text-xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500">Administra el branding, accesos rápidos y usuarios de la plataforma.</p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition ${tab === t.key ? "bg-white shadow text-slate-800" : "text-slate-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "vehiculos" && <VehiculosTab toast={toast} />}

      {tab === "gps" && <GpsIntegrationTab toast={toast} />}

      {tab === "branding" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Identidad de marca</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Nombre comercial">
                <input className={inputCls} value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Logotipo oficial">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  {form.logo_url && <img src={form.logo_url} alt="Logo actual" className="w-9 h-9 rounded-lg object-cover border border-slate-200" />}
                  <span className="text-teal-600 font-medium flex items-center gap-1.5">
                    {uploadingLogo && <Loader2 size={13} className="animate-spin" />}
                    {uploadingLogo ? "Subiendo…" : "Cambiar logotipo"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files[0], "logo")} disabled={uploadingLogo} />
                </label>
              </Field>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Pantalla de inicio de sesión</h3>
            <Field label="Título de bienvenida">
              <input className={inputCls} value={form.login_title || ""} onChange={(e) => setForm({ ...form, login_title: e.target.value })} />
            </Field>
            <Field label="Banner / imagen de fondo">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                {form.login_banner_url && <img src={form.login_banner_url} alt="Banner actual" className="w-16 h-9 rounded-lg object-cover border border-slate-200" />}
                <span className="text-teal-600 font-medium flex items-center gap-1.5">
                  {uploadingBanner && <Loader2 size={13} className="animate-spin" />}
                  {uploadingBanner ? "Subiendo…" : "Cambiar banner"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files[0], "banner")} disabled={uploadingBanner} />
              </label>
            </Field>
            <Field label="Aviso legal de pie de página">
              <input className={inputCls} value={form.footer_text || ""} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} />
            </Field>
          </div>

          <button onClick={() => saveBranding()} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={14} />}
            Guardar cambios
          </button>
        </div>
      )}

      {tab === "lightning" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 text-sm mb-1 flex items-center gap-2">
            <Zap size={15} className="text-teal-600" /> Configuración del botón rápido
          </h3>
          <p className="text-xs text-slate-500 mb-4">Define qué acción ejecuta el ícono de rayo en la barra lateral.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {LIGHTNING_OPTIONS.map((opt) => (
              <button
                key={opt.v}
                onClick={() => setForm({ ...form, lightning_action: opt.v })}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${form.lightning_action === opt.v ? "border-teal-400 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <opt.icon size={18} className={form.lightning_action === opt.v ? "text-teal-600" : "text-slate-400"} />
                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => saveBranding()} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold flex items-center gap-2 mt-5 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={14} />}
            Guardar cambios
          </button>
        </div>
      )}

      {tab === "usuarios" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Gestión de usuarios</h3>
            <button onClick={() => setInviteOpen(true)} className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg px-3 py-2">
              <UserPlus size={14} /> Invitar colaborador
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                  <th className="text-left px-3 py-2 font-semibold">Correo</th>
                  <th className="text-left px-3 py-2 font-semibold">Rol</th>
                  <th className="text-left px-3 py-2 font-semibold">Estatus</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((u) => {
                  const busy = busyUserId === u.id;
                  return (
                    <tr key={u.id} className="border-t border-slate-50">
                      <td className="px-3 py-2.5 font-medium text-slate-700">{u.name}</td>
                      <td className="px-3 py-2.5 text-slate-500">{u.email}</td>
                      <td className="px-3 py-2.5">
                        <select value={u.role} disabled={busy} onChange={(e) => changeRole(u.id, e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1">
                          <option value="trabajador">Trabajador</option>
                          <option value="administrador">Administrador</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                            u.status === "activo" ? "bg-emerald-50 text-emerald-700" : u.status === "invitado" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {u.status === "activo" ? "Activo" : u.status === "invitado" ? "Invitación pendiente" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {u.status === "activo" && (
                          <button onClick={() => sendReset(u.email)} className="text-slate-400 text-[11px] font-semibold hover:text-amber-600 mr-3">
                            Restablecer contraseña
                          </button>
                        )}
                        {u.status !== "inactivo" ? (
                          <button onClick={() => changeStatus(u.id, "inactivo")} disabled={busy} className="text-slate-400 hover:text-rose-600">
                            <Trash2 size={13} className="inline" />
                          </button>
                        ) : (
                          <button onClick={() => changeStatus(u.id, "activo")} disabled={busy} className="text-[11px] font-semibold text-teal-600 hover:underline">
                            Reactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={(email) => toast(`Invitación enviada a ${email}.`)} />
    </div>
  );
}
