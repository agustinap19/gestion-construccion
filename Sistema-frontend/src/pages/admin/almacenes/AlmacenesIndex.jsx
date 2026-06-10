import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLoading } from '../../../context/LoadingContext';
import { almacenService } from '../../../services/almacenService';
import {
    Search, Plus, Warehouse, ChevronRight, Building2, MapPin,
    AlertTriangle, Package, TrendingUp, Activity, BarChart2,
} from '../../../components/icons/Icons';
import EmptyState from '../../../components/ui/EmptyState';
import AlmacenFormModal from './AlmacenFormModal';

/* ── Fix Leaflet default icons en Vite ──────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl:       new URL('leaflet/dist/images/marker-icon.png',    import.meta.url).href,
    shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png',  import.meta.url).href,
});

/* Marcadores animados por tipo */
const makeIcon = (color) => L.divIcon({
    className: '',
    html: `
        <div style="position:relative;width:22px;height:22px;">
            <div style="
                position:absolute;inset:0;border-radius:50%;
                background:${color};opacity:0.25;
                animation:almacen-ping 2s cubic-bezier(0,0,0.2,1) infinite;">
            </div>
            <div style="
                position:absolute;inset:3px;border-radius:50%;
                background:${color};
                border:2px solid rgba(255,255,255,0.95);
                box-shadow:0 2px 12px ${color}88;">
            </div>
        </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
});
const TIPO_ICON = {
    central:  makeIcon('#8b5cf6'),
    obra:     makeIcon('#3b82f6'),
    temporal: makeIcon('#f59e0b'),
};

/* ── Constantes ────────────────────────────────────────────────────── */
const TIPO_LABELS  = { central: 'Central', obra: 'De Obra', temporal: 'Temporal' };
const TIPO_COLORS  = { central: 'from-violet-500 to-purple-700', obra: 'from-sky-500 to-blue-700', temporal: 'from-amber-400 to-orange-600' };
const TIPO_HEX     = { central: '#8b5cf6', obra: '#3b82f6', temporal: '#f59e0b' };
const ESTADO_CYCLE = { activo: 'inactivo', inactivo: 'cerrado', cerrado: 'activo' };
const ESTADO_STYLES = {
    activo:   'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30',
    inactivo: 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30',
    cerrado:  'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30',
};
const CRITICO_STYLES = {
    agotado: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#f87171', label: 'Agotado' },
    critico: { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', text: '#fb923c', label: 'Crítico' },
    bajo:    { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',  text: '#facc15', label: 'Bajo' },
};

/* ── Helpers ────────────────────────────────────────────────────────── */
const fmt = (val) => {
    if (val >= 1_000_000) return `Bs. ${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000)     return `Bs. ${(val / 1_000).toFixed(1)}K`;
    return `Bs. ${val.toFixed(0)}`;
};

/* ── Custom Tooltip ─────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl px-3 py-2.5 text-xs shadow-xl"
            style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
            {label && <p className="text-slate-400 mb-1.5 font-medium">{label}</p>}
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill || p.color }} />
                    <span className="text-slate-300">{p.name}:</span>
                    <span className="text-white font-semibold">
                        {typeof p.value === 'number' && p.name?.toLowerCase().includes('valor')
                            ? fmt(p.value)
                            : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

/* ── Glass card base ─────────────────────────────────────────────────── */
const Card = ({ children, className = '', style = {} }) => (
    <div className={`rounded-2xl border border-white/8 backdrop-blur-sm ${className}`}
        style={{ background: 'rgba(255,255,255,0.03)', ...style }}>
        {children}
    </div>
);

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════ */
export default function AlmacenesIndex() {
    const navigate = useNavigate();
    const { startLoading, stopLoading } = useLoading();

    const [dashboard, setDashboard]         = useState(null);
    const [loading, setLoading]             = useState(true);
    const [modalOpen, setModalOpen]         = useState(false);
    const [editando, setEditando]           = useState(null);
    const [togglingEstado, setTogglingEstado] = useState({});
    const [busqueda, setBusqueda]           = useState('');
    const [filtroTipo, setFiltroTipo]       = useState('todos');
    const [filtroEstado, setFiltroEstado]   = useState('todos');

    const loadDashboard = useCallback(async () => {
        try {
            startLoading();
            setLoading(true);
            const res = await almacenService.dashboard();
            setDashboard(res.data);
        } catch {
            toast.error('No se pudo cargar el dashboard de almacenes.');
        } finally {
            stopLoading();
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    /* Filtrado de almacenes en frontend */
    const almacenesFiltrados = useMemo(() => {
        if (!dashboard?.almacenes_resumen) return [];
        return dashboard.almacenes_resumen.filter(a => {
            const matchBusqueda = !busqueda ||
                a.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
                a.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
                a.ubicacion?.toLowerCase().includes(busqueda.toLowerCase());
            const matchTipo   = filtroTipo   === 'todos' || a.tipo   === filtroTipo;
            const matchEstado = filtroEstado === 'todos' || a.estado === filtroEstado;
            return matchBusqueda && matchTipo && matchEstado;
        });
    }, [dashboard, busqueda, filtroTipo, filtroEstado]);

    const handleCambiarEstado = async (alm, e) => {
        e.stopPropagation();
        const nuevoEstado = ESTADO_CYCLE[alm.estado] || 'activo';
        setTogglingEstado(t => ({ ...t, [alm.id]: true }));
        try {
            await almacenService.cambiarEstado(alm.id, nuevoEstado);
            setDashboard(prev => ({
                ...prev,
                almacenes_resumen: prev.almacenes_resumen.map(a =>
                    a.id === alm.id ? { ...a, estado: nuevoEstado } : a
                ),
            }));
        } catch { toast.error('Error al cambiar estado.'); }
        finally { setTogglingEstado(t => ({ ...t, [alm.id]: false })); }
    };

    const handleGuardado = () => { setModalOpen(false); setEditando(null); loadDashboard(); };

    const kpis = dashboard?.kpis ?? {};
    const porTipo = dashboard?.por_tipo ?? [];
    const movsMes = dashboard?.movimientos_por_mes ?? [];
    const topMat  = dashboard?.top_materiales ?? [];
    const criticos = dashboard?.stocks_criticos ?? [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 space-y-6">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Warehouse className="w-8 h-8 text-violet-400" />
                        Almacenes
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">Dashboard general de inventario y stock de materiales</p>
                </div>
                <button
                    onClick={() => { setEditando(null); setModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                               bg-gradient-to-r from-violet-600 to-purple-700
                               text-white font-medium shadow-lg shadow-violet-900/40
                               hover:from-violet-500 hover:to-purple-600 transition-all"
                >
                    <Plus className="w-5 h-5" /> Nuevo Almacén
                </button>
            </div>

            {loading ? (
                <DashboardSkeleton />
            ) : (
                <>
                    {/* ── KPI CARDS ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total almacenes', value: kpis.total,    sub: `${kpis.activos} activos`,                     icon: <Warehouse className="w-5 h-5" />,    color: 'violet' },
                            { label: 'Valor inventario', value: fmt(kpis.valor_total ?? 0), sub: 'stock total valorado',           icon: <TrendingUp className="w-5 h-5" />,   color: 'emerald', text: true },
                            { label: 'Ítems críticos',   value: kpis.items_criticos,  sub: `${kpis.items_agotados ?? 0} agotados`, icon: <AlertTriangle className="w-5 h-5" />, color: kpis.items_criticos > 0 ? 'red' : 'slate' },
                            { label: 'Movimientos/mes',  value: movsMes.at(-1) ? (movsMes.at(-1).entradas + movsMes.at(-1).salidas) : 0,
                              sub: `E: ${movsMes.at(-1)?.entradas ?? 0}  S: ${movsMes.at(-1)?.salidas ?? 0}`, icon: <Activity className="w-5 h-5" />, color: 'sky' },
                        ].map((k, i) => {
                            const palette = {
                                violet:  { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.25)',  icon: '#a78bfa', val: '#c4b5fd' },
                                emerald: { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)',   icon: '#4ade80', val: '#86efac' },
                                red:     { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)',   icon: '#f87171', val: '#fca5a5' },
                                sky:     { bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.25)',  icon: '#38bdf8', val: '#7dd3fc' },
                                slate:   { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)', icon: '#94a3b8', val: '#cbd5e1' },
                            };
                            const p = palette[k.color] || palette.slate;
                            return (
                                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                                    className="rounded-2xl p-4 border" style={{ background: p.bg, borderColor: p.border }}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                            style={{ background: `${p.border}`, color: p.icon }}>
                                            {k.icon}
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold" style={{ color: p.val }}>{k.value}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">{k.label}</div>
                                    <div className="text-[10px] text-slate-600 mt-0.5">{k.sub}</div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* ── ROW 1: Movimientos Stock + Mapa ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* Bar chart movimientos */}
                        <Card className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-sm font-bold text-white">Movimientos de Stock</h2>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Entradas y salidas — últimos 3 meses</p>
                                </div>
                                <div className="flex items-center gap-4 text-[11px]">
                                    <span className="flex items-center gap-1.5 text-slate-400">
                                        <span className="w-3 h-3 rounded-sm" style={{ background: '#22c55e' }} /> Entradas
                                    </span>
                                    <span className="flex items-center gap-1.5 text-slate-400">
                                        <span className="w-3 h-3 rounded-sm" style={{ background: '#ef4444' }} /> Salidas
                                    </span>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={movsMes.slice(-3)} barGap={4} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                    <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="salidas"  name="Salidas"  fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Mapa */}
                        <AlmacenesMap almacenes={dashboard?.almacenes_resumen ?? []} />
                    </div>

                    {/* ── ROW 2: Stock Crítico (2) + Por Tipo (1) + Top Materiales (2) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

                        {/* Stock crítico — 2 cols */}
                        <Card className="p-4 lg:col-span-2">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                                    Stock Crítico
                                </h2>
                                {kpis.items_criticos > 0 && (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                                        {kpis.items_criticos}
                                    </span>
                                )}
                            </div>
                            {criticos.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-6 gap-1.5">
                                    <Package className="w-7 h-7 text-slate-700" />
                                    <p className="text-xs text-slate-600">Sin alertas</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {criticos.map((s, i) => {
                                        const meta = CRITICO_STYLES[s.estado] || CRITICO_STYLES.critico;
                                        return (
                                            <div key={i} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                                                style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-medium text-white truncate">{s.material}</p>
                                                    <p className="text-[9px] text-slate-500 truncate">{s.almacen}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[11px] font-bold" style={{ color: meta.text }}>
                                                        {s.disponible}<span className="text-[9px] font-normal text-slate-500 ml-0.5">{s.unidad}</span>
                                                    </p>
                                                </div>
                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                                    style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.text }}>
                                                    {meta.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>

                        {/* Por tipo — 1 col */}
                        <Card className="p-4 lg:col-span-1">
                            <h2 className="text-sm font-bold text-white mb-3">Por Tipo</h2>
                            {porTipo.length === 0 ? (
                                <div className="flex items-center justify-center h-28 text-slate-600 text-xs">Sin datos</div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={120}>
                                        <PieChart>
                                            <Pie data={porTipo} dataKey="cantidad" nameKey="tipo"
                                                cx="50%" cy="50%" innerRadius={30} outerRadius={52}
                                                paddingAngle={3} strokeWidth={0}>
                                                {porTipo.map(e => (
                                                    <Cell key={e.tipo} fill={TIPO_HEX[e.tipo] || '#64748b'} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-1.5 mt-2">
                                        {porTipo.map(e => {
                                            const total = porTipo.reduce((s, x) => s + x.cantidad, 0) || 1;
                                            return (
                                                <div key={e.tipo}>
                                                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                                                        <span className="flex items-center gap-1.5 text-slate-400">
                                                            <span className="w-2 h-2 rounded-sm shrink-0"
                                                                style={{ background: TIPO_HEX[e.tipo] || '#64748b' }} />
                                                            {TIPO_LABELS[e.tipo] || e.tipo}
                                                        </span>
                                                        <span className="font-bold text-white">{e.cantidad}</span>
                                                    </div>
                                                    <div className="h-0.5 rounded-full bg-white/5 overflow-hidden">
                                                        <div className="h-full rounded-full"
                                                            style={{
                                                                width: `${Math.round((e.cantidad / total) * 100)}%`,
                                                                background: TIPO_HEX[e.tipo] || '#64748b',
                                                            }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </Card>

                        {/* Top materiales — 2 cols */}
                        <Card className="p-4 lg:col-span-2">
                            <h2 className="text-sm font-bold text-white flex items-center gap-1.5 mb-3">
                                <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                                Top Materiales
                            </h2>
                            {topMat.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-6 gap-1.5">
                                    <BarChart2 className="w-7 h-7 text-slate-700" />
                                    <p className="text-xs text-slate-600">Sin materiales en stock</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={topMat} layout="vertical" barSize={12} margin={{ left: 0, right: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false}
                                            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                                        <YAxis type="category" dataKey="nombre" width={75}
                                            tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false}
                                            tickFormatter={v => v?.length > 12 ? v.slice(0, 12) + '…' : v} />
                                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                        <Bar dataKey="valor_total" name="Valor" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Card>
                    </div>

                    {/* ── SECCIÓN ALMACENES ── */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Warehouse className="w-4 h-4 text-violet-400" />
                                Almacenes ({almacenesFiltrados.length})
                            </h2>
                        </div>

                        {/* Filtros */}
                        <div className="flex flex-wrap gap-3 mb-5">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                    placeholder="Buscar por nombre, código, ubicación…"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                                               text-white placeholder-slate-500 text-sm focus:outline-none
                                               focus:border-violet-500/60 focus:bg-white/8 transition-all" />
                            </div>
                            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                                           focus:outline-none focus:border-violet-500/60 transition-all">
                                <option value="todos">Todos los tipos</option>
                                <option value="central">Central</option>
                                <option value="obra">De obra</option>
                                <option value="temporal">Temporal</option>
                            </select>
                            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                                           focus:outline-none focus:border-violet-500/60 transition-all">
                                <option value="todos">Todos los estados</option>
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                                <option value="cerrado">Cerrado</option>
                            </select>
                        </div>

                        {/* Grid */}
                        {almacenesFiltrados.length === 0 ? (
                            <EmptyState icon={<Warehouse className="w-12 h-12" />} title="Sin almacenes" description="No hay almacenes que coincidan con los filtros." />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                <AnimatePresence>
                                    {almacenesFiltrados.map((alm, idx) => (
                                        <AlmacenCard
                                            key={alm.id}
                                            almacen={alm}
                                            idx={idx}
                                            onEdit={() => { setEditando(alm); setModalOpen(true); }}
                                            onClick={() => navigate(`/dashboard/almacenes/${alm.id}`)}
                                            onCambiarEstado={(e) => handleCambiarEstado(alm, e)}
                                            toggling={!!togglingEstado[alm.id]}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </>
            )}

            {modalOpen && (
                <AlmacenFormModal
                    almacen={editando}
                    onClose={() => { setModalOpen(false); setEditando(null); }}
                    onGuardado={handleGuardado}
                />
            )}
        </div>
    );
}

/* ── Skeleton loader ─────────────────────────────────────────────────── */
/* ── Keyframe ping para marcadores ──────────────────────────────────── */
const MAP_ANIM_STYLE = `
@keyframes almacen-ping {
    0%   { transform: scale(1);   opacity: 0.4; }
    70%  { transform: scale(2.2); opacity: 0;   }
    100% { transform: scale(2.2); opacity: 0;   }
}
.almacen-map-popup .leaflet-popup-content-wrapper {
    background: #0f172a !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
    padding: 0 !important;
}
.almacen-map-popup .leaflet-popup-content {
    margin: 0 !important;
}
.almacen-map-popup .leaflet-popup-tip {
    background: #0f172a !important;
}
.almacen-map-popup .leaflet-popup-close-button {
    display: none !important;
}
`;

/* ── Mapa de ubicaciones de almacenes ───────────────────────────────── */
function AlmacenesMap({ almacenes }) {
    const conCoordenadas = almacenes.filter(a => a.latitud != null && a.longitud != null);

    const center = useMemo(() => {
        if (conCoordenadas.length === 0) return [-16.5, -64.5];
        const avgLat = conCoordenadas.reduce((s, a) => s + a.latitud,  0) / conCoordenadas.length;
        const avgLng = conCoordenadas.reduce((s, a) => s + a.longitud, 0) / conCoordenadas.length;
        return [avgLat, avgLng];
    }, [conCoordenadas]);

    const zoom = conCoordenadas.length === 0 ? 6 : conCoordenadas.length === 1 ? 14 : 10;

    return (
        <>
            <style>{MAP_ANIM_STYLE}</style>
            <div className="rounded-2xl overflow-hidden border border-white/8 flex flex-col"
                style={{ background: 'rgba(255,255,255,0.03)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="text-sm font-bold text-white">Ubicaciones</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                            {conCoordenadas.length}/{almacenes.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                        {[{ label: 'Central', color: '#8b5cf6' }, { label: 'Obra', color: '#3b82f6' }, { label: 'Temporal', color: '#f59e0b' }].map(l => (
                            <span key={l.label} className="flex items-center gap-1 text-slate-500">
                                <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                                {l.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Mapa */}
                <div className="flex-1" style={{ height: 258, filter: 'brightness(0.88) saturate(0.8)' }}>
                    <MapContainer center={center} zoom={zoom}
                        style={{ height: '100%', width: '100%' }}
                        attributionControl={false} zoomControl={true}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
                        {conCoordenadas.map(a => {
                            const tipoColor = TIPO_HEX[a.tipo] || '#64748b';
                            const popupHtml = `
                                <div style="padding:12px 14px;min-width:190px;font-family:system-ui,sans-serif;">
                                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                                        <div style="width:8px;height:8px;border-radius:50%;background:${tipoColor};flex-shrink:0;"></div>
                                        <p style="font-weight:700;font-size:12px;color:#f8fafc;margin:0;line-height:1.3;">${a.nombre}</p>
                                    </div>
                                    <p style="font-size:10px;color:#475569;margin:0 0 8px;font-family:monospace;">${a.codigo}</p>
                                    <div style="display:flex;gap:6px;margin-bottom:8px;">
                                        <span style="font-size:9px;font-weight:600;padding:2px 7px;border-radius:999px;background:${tipoColor}22;color:${tipoColor};">${TIPO_LABELS[a.tipo] || a.tipo}</span>
                                        <span style="font-size:9px;font-weight:600;padding:2px 7px;border-radius:999px;background:${a.estado === 'activo' ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)'};color:${a.estado === 'activo' ? '#4ade80' : '#94a3b8'};">${a.estado}</span>
                                    </div>
                                    <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:8px;display:flex;flex-direction:column;gap:3px;">
                                        <div style="display:flex;justify-content:space-between;font-size:10px;">
                                            <span style="color:#64748b;">Ítems en stock</span>
                                            <span style="color:#e2e8f0;font-weight:600;">${a.total_items}</span>
                                        </div>
                                        <div style="display:flex;justify-content:space-between;font-size:10px;">
                                            <span style="color:#64748b;">Valor inventario</span>
                                            <span style="color:#fbbf24;font-weight:600;">Bs. ${(a.valor_inventario || 0).toLocaleString('es-BO')}</span>
                                        </div>
                                        ${a.items_criticos > 0 ? `<div style="font-size:10px;color:#f87171;margin-top:2px;">⚠ ${a.items_criticos} ítem${a.items_criticos > 1 ? 's' : ''} crítico${a.items_criticos > 1 ? 's' : ''}</div>` : ''}
                                        ${a.ubicacion ? `<div style="font-size:10px;color:#475569;margin-top:2px;">📍 ${a.ubicacion}</div>` : ''}
                                    </div>
                                </div>`;

                            return (
                                <Marker key={a.id}
                                    position={[a.latitud, a.longitud]}
                                    icon={TIPO_ICON[a.tipo] ?? TIPO_ICON.obra}
                                    eventHandlers={{
                                        mouseover: (e) => e.target.openPopup(),
                                        mouseout:  (e) => e.target.closePopup(),
                                    }}
                                >
                                    <Popup className="almacen-map-popup" closeButton={false} autoClose={false}>
                                        <div dangerouslySetInnerHTML={{ __html: popupHtml }} />
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>

                {conCoordenadas.length === 0 && (
                    <div className="py-3 text-center border-t border-white/5">
                        <p className="text-xs text-slate-600">Sin coordenadas — edita un almacén para añadir ubicación GPS.</p>
                    </div>
                )}
            </div>
        </>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-white/5" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="h-72 rounded-2xl bg-white/5 lg:col-span-2" />
                <div className="h-72 rounded-2xl bg-white/5" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="h-64 rounded-2xl bg-white/5" />
                <div className="h-64 rounded-2xl bg-white/5" />
            </div>
        </div>
    );
}

/* ── Almacen card (enriquecida con stats) ────────────────────────────── */
function AlmacenCard({ almacen, idx, onEdit, onClick, onCambiarEstado, toggling }) {
    const gradiente = TIPO_COLORS[almacen.tipo] || 'from-slate-500 to-slate-700';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: idx * 0.04 }}
            onClick={onClick}
            className="group relative cursor-pointer rounded-2xl overflow-hidden
                       border border-white/10 backdrop-blur-sm
                       bg-white/5 hover:bg-white/8 hover:border-white/20
                       shadow-xl shadow-black/30 hover:shadow-black/50
                       transition-all duration-300 hover:-translate-y-1"
        >
            <div className={`h-1 w-full bg-gradient-to-r ${gradiente}`} />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradiente} flex items-center justify-center shadow-lg`}>
                        <Warehouse className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onCambiarEstado} disabled={toggling} title="Click para cambiar estado"
                            className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-all
                                ${ESTADO_STYLES[almacen.estado] || 'bg-white/10 border-white/20 text-white/60'}
                                ${toggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                            {almacen.estado}
                        </button>
                        <button onClick={e => { e.stopPropagation(); onEdit(); }}
                            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg
                                       bg-white/10 hover:bg-white/20 flex items-center justify-center
                                       text-slate-400 hover:text-white transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <h3 className="text-white font-semibold text-sm leading-tight mb-0.5 truncate">{almacen.nombre}</h3>
                <p className="text-slate-500 text-xs mb-2.5">{almacen.codigo}</p>

                <span className={`inline-block text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${gradiente} text-white font-medium mb-3`}>
                    {TIPO_LABELS[almacen.tipo] || almacen.tipo}
                </span>

                {/* Stats de stock */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-lg px-2.5 py-2 text-center"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-base font-bold text-violet-300">{almacen.total_items}</p>
                        <p className="text-[9px] text-slate-600">ítems</p>
                    </div>
                    <div className="rounded-lg px-2.5 py-2 text-center"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-base font-bold text-amber-300">{fmt(almacen.valor_inventario)}</p>
                        <p className="text-[9px] text-slate-600">valor</p>
                    </div>
                </div>

                {/* Alerta críticos */}
                {almacen.items_criticos > 0 && (
                    <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 mb-3"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="text-[10px] text-red-400">{almacen.items_criticos} ítem{almacen.items_criticos > 1 ? 's' : ''} crítico{almacen.items_criticos > 1 ? 's' : ''}</span>
                    </div>
                )}

                {/* Meta */}
                <div className="space-y-1 border-t border-white/5 pt-3">
                    {almacen.proyecto && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{almacen.proyecto}</span>
                        </div>
                    )}
                    {almacen.ubicacion && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{almacen.ubicacion}</span>
                        </div>
                    )}
                </div>

                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
            </div>
        </motion.div>
    );
}
