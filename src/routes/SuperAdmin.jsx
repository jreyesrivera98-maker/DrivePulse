import { useState, useEffect, useCallback, useMemo } from "react";
import { Building2, Search, Loader2, Users, Car, ClipboardList, ShieldCheck, ShieldOff, ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useToasts, ToastStack } from "../components/ui/Toast";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_META = {
  trial: { label: "Prueba", color: "bg-blue-50 text-blue-700" },
  activo: { label: "Activo", color: "bg-emerald-50 text-emerald-700" },
  suspendido: { label: "Suspendido", color: "bg-rose-50 text-rose-700" },
  cancelado: { label: "Cancelado", color: "bg-slate-100 text-slate-500" },
};

const PLAN_OPTIONS = ["trial", "basico", "pro", "enterprise"];

export default function SuperAdmin() {
  const { toasts, toast, remove } = useToasts();
  const [orgs, setOrgs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState("organizaciones");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: orgData }, { data: statsData }] = await Promise.all([
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
      supabase.rpc("platform_admin_org_stats"),
    ]);
    setOrgs(orgData || []);
    const statsMap = {};
    (statsData || []).forEach((s) => {
      statsMap[s.organization_id] = s;
    });
    setStats(statsMap);
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data } = await supabase
      .from("profiles")
      .select("*, organizations(name)")
      .order("created_at", { ascending: false })
      .limit(500);
    setUsers(data || []);
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab === "usuarios" && users.length === 0) loadUsers();
  }, [tab, users.length, loadUsers]);

  const filteredOrgs = useMemo(
    () => orgs.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()) || o.slug.toLowerCase().includes(q.toLowerCase())),
    [orgs, q]
  );

  const filteredUsers = useMemo(
    () =>
      users.filter((u) =>
        `${u.name} ${u.email} ${u.organizations?.name || ""}`.toLowerCase().includes(q.toLowerCase())
      ),
    [users, q]
  );

  const totals = useMemo(() => {
    const activos = orgs.filter((o) => o.status === "activo" || o.status === "trial").length;
    const vehiculos = Object.values(stats).reduce((s, x) => s + Number(x.vehicles_count || 0), 0);
    const usuarios = Object.values(stats).reduce((s, x) => s + Number(x.users_count || 0), 0);
    return { total: orgs.length, activos, vehiculos, usuarios };
  }, [orgs, stats]);

  const toggleStatus = async (org) => {
    const next = org.status === "suspendido" ? "activo" : "suspendido";
    setBusyId(org.id);
    try {
      const { error } = await supabase.rpc("platform_admin_set_org_status", { p_org_id: org.id, p_status: next });
      if (error) throw error;
      toast(`${org.name} → ${STATUS_META[next].label}.`);
      load();
    } catch (err) {
      toast(err.message || "No se pudo actualizar.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const changePlan = async (org, plan) => {
    setBusyId(org.id);
    try {
      const { error } = await supabase.rpc("platform_admin_set_org_plan", { p_org_id: org.id, p_plan: plan });
      if (error) throw error;
      toast(`Plan de ${org.name} actualizado a "${plan}".`);
      load();
    } catch (err) {
      toast(err.message || "No se pudo actualizar el plan.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-dp-surface">
      <div className="bg-dp-black text-white px-6 py-4 flex items-center gap-2">
        <Building2 size={18} className="text-teal-400" />
        <div>
          <p className="font-bold text-sm">Panel de Plataforma</p>
          <p className="text-[11px] text-slate-400">Solo visible para administradores de DrivePulse</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <ToastStack toasts={toasts} remove={remove} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xl font-bold text-slate-900">{totals.total}</p>
            <p className="text-[11px] text-slate-500">Organizaciones totales</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xl font-bold text-slate-900">{totals.activos}</p>
            <p className="text-[11px] text-slate-500">Activas / en prueba</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xl font-bold text-slate-900">{totals.vehiculos}</p>
            <p className="text-[11px] text-slate-500">Vehículos en la plataforma</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xl font-bold text-slate-900">{totals.usuarios}</p>
            <p className="text-[11px] text-slate-500">Usuarios totales</p>
          </div>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {["organizaciones", "usuarios"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs font-semibold px-4 py-2 rounded-lg capitalize transition ${tab === t ? "bg-white shadow text-slate-800" : "text-slate-500"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "organizaciones" ? "Buscar organización..." : "Buscar usuario o correo..."} className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-xs" />
        </div>

        {tab === "organizaciones" ? (
          loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center"><Loader2 size={16} className="animate-spin" /> Cargando…</div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Organización</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Estatus</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Plan</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Vehículos</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Usuarios</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Bitácoras (mes)</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Alta</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map((o) => {
                    const s = stats[o.id] || {};
                    const busy = busyId === o.id;
                    return (
                      <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-medium text-slate-700">{o.name}<p className="text-[10px] text-slate-400 font-mono">{o.slug}</p></td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${STATUS_META[o.status]?.color}`}>{STATUS_META[o.status]?.label}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="relative inline-block">
                            <select
                              value={o.plan}
                              disabled={busy}
                              onChange={(e) => changePlan(o, e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg pl-2 pr-6 py-1 appearance-none capitalize"
                            >
                              {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600"><Car size={11} className="inline mr-1 text-slate-400" />{s.vehicles_count ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-600"><Users size={11} className="inline mr-1 text-slate-400" />{s.users_count ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-600"><ClipboardList size={11} className="inline mr-1 text-slate-400" />{s.bitacoras_mes_count ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-500">{fmtDate(o.created_at)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => toggleStatus(o)}
                            disabled={busy}
                            className={`text-[11px] font-semibold flex items-center gap-1 ml-auto ${o.status === "suspendido" ? "text-emerald-600 hover:underline" : "text-rose-500 hover:underline"}`}
                          >
                            {busy ? <Loader2 size={12} className="animate-spin" /> : o.status === "suspendido" ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
                            {o.status === "suspendido" ? "Reactivar" : "Suspender"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrgs.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-8 text-sm">Sin organizaciones.</td></tr>}
                </tbody>
              </table>
            </div>
          )
        ) : loadingUsers ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center"><Loader2 size={16} className="animate-spin" /> Cargando…</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Nombre</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Correo</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Organización</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Rol</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t border-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{u.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{u.email}</td>
                    <td className="px-4 py-2.5 text-slate-600">{u.organizations?.name || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600 capitalize">{u.role}</td>
                    <td className="px-4 py-2.5 text-slate-500 capitalize">{u.status}</td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-8 text-sm">Sin usuarios.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center pt-2">
          Este panel no muestra vehículos, bitácoras ni datos operativos de ningún cliente — solo conteos agregados.
        </p>
      </div>
    </div>
  );
}
