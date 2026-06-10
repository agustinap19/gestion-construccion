import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoading } from '../../../context/LoadingContext';
import { almacenService } from '../../../services/almacenService';
import movimientoAlmacenService from '../../../services/movimientoAlmacenService';
import {
    Warehouse, Package, ArrowLeft, ArrowUp, ArrowDown, ArrowRight,
    AlertTriangle, TrendingUp, Search, RefreshCw, ChevronRight,
    User, Briefcase, ShoppingCart, XCircle, Eye, Check
} from '../../../components/icons/Icons';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import BotonExportar from '../../../components/ui/BotonExportar';
import KardexModal from './KardexModal';
import EntradaCompraModal from './EntradaCompraModal';
import EntregaSocialModal from './EntregaSocialModal';
import EntregaPrivadaModal from './EntregaPrivadaModal';
import TransferenciaModal from './TransferenciaModal';

const ESTADO_STOCK_COLOR = {
    normal:  'text-emerald-400 bg-emerald-400/10',
    bajo:    'text-yellow-400 bg-yellow-400/10',
    critico: 'text-orange-400 bg-orange-400/10',
    agotado: 'text-red-400 bg-red-400/10',
};

const TIPO_COLOR = {
    entrada_compra:      'text-emerald-400 bg-emerald-500/15',
    entrada_devolucion:  'text-teal-400 bg-teal-500/15',
    salida_social:       'text-violet-400 bg-violet-500/15',
    salida_privado:      'text-amber-400 bg-amber-500/15',
    transferencia_interna:'text-sky-400 bg-sky-500/15',
    salida_ajuste:       'text-rose-400 bg-rose-500/15',
    entrada_ajuste:      'text-blue-400 bg-blue-500/15',
};

const TIPO_LABEL = {
    entrada_compra:       'Compra',
    entrada_devolucion:   'Dev. entrada',
    entrada_transferencia:'Trans. entrada',
    entrada_ajuste:       'Ajuste +',
    salida_social:        'Entrega social',
    salida_privado:       'Entrega privada',
    salida_devolucion_proveedor: 'Dev. proveedor',
    salida_ajuste:        'Ajuste −',
    transferencia_interna:'Transferencia',
    inventario_inicial:   'Inv. inicial',
};

const ESTADO_MOV_STYLE = {
    completado: 'bg-emerald-500/15 text-emerald-400',
    en_transito:'bg-sky-500/15 text-sky-400',
    pendiente:  'bg-amber-500/15 text-amber-400',
    anulado:    'bg-red-500/15 text-red-400 line-through',
    borrador:   'bg-white/10 text-white/40',
};

export default function AlmacenDetalle() {
    const { id }   = useParams();
    const navigate = useNavigate();
    const { startLoading, stopLoading } = useLoading();

    const [data, setData]           = useState(null);
    const [tab, setTab]             = useState('stock');
    const [busqueda, setBusqueda]   = useState('');
    const [kardexItem, setKardexItem] = useState(null);

    // Modals de movimiento
    const [modalEntrada, setModalEntrada]         = useState(false);
    const [modalSocialOpen, setModalSocialOpen]   = useState(false);
    const [modalPrivadaOpen, setModalPrivadaOpen] = useState(false);
    const [modalTransfer, setModalTransfer]       = useState(false);

    // Movimientos list state
    const [movimientos, setMovimientos]   = useState([]);
    const [movPage, setMovPage]           = useState(1);
    const [movLastPage, setMovLastPage]   = useState(1);
    const [filtroTipo, setFiltroTipo]     = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [movBusqueda, setMovBusqueda]   = useState('');
    const [detalleMovId, setDetalleMovId] = useState(null);
    const [detalleMov, setDetalleMov]     = useState(null);
    const [anulandoId, setAnulandoId]     = useState(null);
    const [confirmandoId, setConfirmandoId] = useState(null);

    const loadData = useCallback(async () => {
        try {
            startLoading();
            const res = await almacenService.obtener(id);
            setData(res.data);
        } catch {
            toast.error('No se pudo cargar el almacén.');
            navigate('/dashboard/almacenes');
        } finally {
            stopLoading();
        }
    }, [id]);

    const loadMovimientos = useCallback(async () => {
        try {
            const res = await movimientoAlmacenService.listar({
                almacen_id:  id,
                tipo:        filtroTipo !== 'todos' ? filtroTipo : undefined,
                estado:      filtroEstado !== 'todos' ? filtroEstado : undefined,
                busqueda:    movBusqueda || undefined,
                page:        movPage,
                per_page:    15,
            });
            setMovimientos(res.data?.data || []);
            setMovLastPage(res.data?.last_page || 1);
        } catch {
            toast.error('Error al cargar movimientos.');
        }
    }, [id, filtroTipo, filtroEstado, movBusqueda, movPage]);

    const [devolviendo, setDevolviendo] = useState(false);
    
    const devolverCentral = async () => {
        if (!confirm('¿Está seguro de transferir todo el stock restante al almacén central? Esta acción es irreversible.')) return;
        setDevolviendo(true);
        try {
            await movimientoAlmacenService.devolverCentral(id);
            toast.success('Materiales enviados al almacén central con éxito.');
            loadData();
            if (tab === 'movimientos') loadMovimientos();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al devolver materiales.');
        } finally {
            setDevolviendo(false);
        }
    };

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { if (tab === 'movimientos') loadMovimientos(); }, [tab, loadMovimientos]);

    const handleGuardado = () => {
        loadData();
        if (tab === 'movimientos') loadMovimientos();
    };

    const verDetalle = async (movId) => {
        setDetalleMovId(movId);
        try {
            const res = await movimientoAlmacenService.obtener(movId);
            setDetalleMov(res.data);
        } catch { toast.error('No se pudo cargar el detalle.'); }
    };

    const confirmarTransferencia = async (mov) => {
        setConfirmandoId(mov.id);
        try {
            await movimientoAlmacenService.confirmarTransferencia(mov.id);
            toast.success('Transferencia confirmada como recibida.');
            loadMovimientos();
            loadData();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'No se pudo confirmar.');
        } finally { setConfirmandoId(null); }
    };

    const anular = async (mov) => {
        const motivo = prompt('Motivo de anulación (mínimo 10 caracteres):');
        if (!motivo || motivo.trim().length < 10) { toast.error('Ingrese un motivo válido.'); return; }
        setAnulandoId(mov.id);
        try {
            await movimientoAlmacenService.anular(mov.id, motivo.trim());
            toast.success('Movimiento anulado.');
            loadMovimientos();
            loadData();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'No se pudo anular.');
        } finally { setAnulandoId(null); }
    };

    const stocksFiltrados = (data?.stocks || []).filter(s => {
        if (!busqueda) return true;
        const q = busqueda.toLowerCase();
        return s.material?.nombre?.toLowerCase().includes(q)
            || s.material?.codigo?.toLowerCase().includes(q);
    });

    if (!data) return null;
    const { almacen, resumen } = data;

    // Params para exportar movimientos
    const exportParams = {
        almacen_id: id,
        tipo:    filtroTipo !== 'todos' ? filtroTipo : undefined,
        estado:  filtroEstado !== 'todos' ? filtroEstado : undefined,
        busqueda: movBusqueda || undefined,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            {/* Back + title */}
            <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard/almacenes')}
                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <Warehouse className="w-6 h-6 text-violet-400" />
                            <h1 className="text-2xl font-bold text-white">{almacen.nombre}</h1>
                            <Badge variant={almacen.estado === 'activo' ? 'success' : 'warning'}>{almacen.estado}</Badge>
                        </div>
                        <p className="text-slate-400 text-sm mt-0.5">
                            {almacen.codigo} · {almacen.tipo} {almacen.proyecto && `· ${almacen.proyecto.nombre}`}
                        </p>
                    </div>
                </div>

                {almacen.estado === 'activo' && (
                    <div className="flex flex-wrap gap-2">
                        <button onClick={loadData}
                            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button onClick={() => setModalEntrada(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-medium transition-all">
                            <ShoppingCart className="w-4 h-4" /> Entrada
                        </button>
                        {almacen.proyecto_id && (
                            almacen.proyecto?.es_social
                                ? (
                                    <button onClick={() => setModalSocialOpen(true)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white text-sm font-medium transition-all">
                                        <User className="w-4 h-4" /> Salida Social
                                    </button>
                                ) : (
                                    <button onClick={() => setModalPrivadaOpen(true)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white text-sm font-medium transition-all">
                                        <Briefcase className="w-4 h-4" /> Salida Privada
                                    </button>
                                )
                        )}
                        {almacen.tipo !== 'central' && (
                            <button onClick={() => setModalTransfer(true)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-600/80 hover:bg-sky-600 text-white text-sm font-medium transition-all">
                                <ArrowRight className="w-4 h-4" /> Transferir
                            </button>
                        )}
                    </div>
                )}
                
                {almacen.estado === 'cerrado' && almacen.tipo !== 'central' && (
                    <div className="flex flex-wrap gap-2">
                        <button onClick={devolverCentral} disabled={devolviendo}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-600/80 hover:bg-orange-600 text-white text-sm font-medium transition-all disabled:opacity-50">
                            <ArrowRight className="w-4 h-4" /> 
                            {devolviendo ? 'Devolviendo...' : 'Devolver restante a Central'}
                        </button>
                    </div>
                )}
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Total ítems', value: resumen.total_items, icon: <Package className="w-5 h-5" />, color: 'from-violet-500/20 to-purple-600/20', border: 'border-violet-500/30' },
                    { label: 'Ítems críticos', value: resumen.items_criticos, icon: <AlertTriangle className="w-5 h-5" />, color: 'from-rose-500/20 to-red-600/20', border: 'border-rose-500/30' },
                    { label: 'Valor inventario', value: `Bs ${Number(resumen.valor_inventario || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`, icon: <TrendingUp className="w-5 h-5" />, color: 'from-emerald-500/20 to-teal-600/20', border: 'border-emerald-500/30' },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        className={`bg-gradient-to-br ${s.color} backdrop-blur-sm border ${s.border} rounded-2xl p-4 flex items-center gap-4`}>
                        <div className="text-slate-300 opacity-60">{s.icon}</div>
                        <div>
                            <div className="text-xl font-bold text-white">{s.value}</div>
                            <div className="text-slate-400 text-xs">{s.label}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-white/10">
                {[['stock', 'Stock'], ['movimientos', 'Movimientos']].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px
                            ${tab === key
                                ? 'border-violet-500 text-violet-300'
                                : 'border-transparent text-slate-400 hover:text-white'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Capital Inmovilizado (Sub-fase E adaptado) ───────────────────── */}
            {tab === 'stock' && (() => {
                const DIAS_UMBRAL = 30;
                const hoy = new Date();
                const inmovilizados = (data?.stocks || []).filter(s => {
                    if (!s.cantidad || s.cantidad <= 0) return false;
                    if (!s.ultima_fecha_movimiento) return true;
                    const dias = Math.floor((hoy - new Date(s.ultima_fecha_movimiento)) / 86400000);
                    return dias >= DIAS_UMBRAL;
                });
                if (inmovilizados.length === 0) return null;
                const valorTotal = inmovilizados.reduce((sum, s) => sum + (s.valor_total || 0), 0);
                const bs = n => `Bs. ${Math.round(n).toLocaleString('es-BO')}`;
                return (
                    <div className="mb-4 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06]">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                <h3 className="text-amber-300 font-semibold text-sm">Capital Inmovilizado</h3>
                            </div>
                            <span className="text-amber-400 font-bold text-sm">{bs(valorTotal)}</span>
                        </div>
                        <p className="text-amber-300/60 text-xs mb-3">
                            {inmovilizados.length} material{inmovilizados.length > 1 ? 'es' : ''} en almacén sin movimiento de salida en {DIAS_UMBRAL}+ días.
                        </p>
                        <div className="space-y-1.5">
                            {inmovilizados.slice(0, 5).map(s => {
                                const dias = s.ultima_fecha_movimiento
                                    ? Math.floor((hoy - new Date(s.ultima_fecha_movimiento)) / 86400000)
                                    : null;
                                return (
                                    <div key={s.id} className="flex items-center justify-between text-xs">
                                        <span className="text-white/70">{s.material?.nombre}</span>
                                        <div className="flex items-center gap-3 text-white/40">
                                            <span>{s.cantidad.toFixed(2)} {s.material?.unidadMedida?.simbolo || ''}</span>
                                            <span className="text-amber-400/70">{bs(s.valor_total || 0)}</span>
                                            <span>{dias !== null ? `${dias}d sin mov.` : 'Sin mov.'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {inmovilizados.length > 5 && (
                                <p className="text-amber-300/40 text-xs">+{inmovilizados.length - 5} más…</p>
                            )}
                        </div>
                    </div>
                );
            })()}

            <AnimatePresence mode="wait">
                {tab === 'stock' && (
                    <motion.div key="stock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                                <h2 className="text-white font-semibold">Stock de materiales</h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                        placeholder="Buscar material…"
                                        className="pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/60 w-56" />
                                </div>
                            </div>
                            {stocksFiltrados.length === 0 ? (
                                <EmptyState icon={<Package className="w-10 h-10" />} title="Sin stock" description="Registra una entrada para comenzar." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                {['Material', 'Categoría', 'Cantidad', 'Reservada', 'Disponible', 'PMP', 'Valor Total', 'Estado', ''].map(h => (
                                                    <th key={h} className="text-left text-slate-400 font-medium py-3 px-4 text-xs">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stocksFiltrados.map((s) => (
                                                <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            {s.material?.imagen_url && (
                                                                <img src={s.material.imagen_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                                            )}
                                                            <div>
                                                                <div className="text-white font-medium text-sm">{s.material?.nombre}</div>
                                                                <div className="text-slate-500 text-xs">{s.material?.codigo}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="text-xs px-2 py-0.5 rounded-full"
                                                            style={{ background: `${s.material?.categoria?.color}22`, color: s.material?.categoria?.color || '#94a3b8' }}>
                                                            {s.material?.categoria?.nombre || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-white font-medium">
                                                        {Number(s.cantidad).toFixed(2)} <span className="text-slate-500 text-xs">{s.material?.unidadMedida?.simbolo}</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-400">{Number(s.cantidad_reservada).toFixed(2)}</td>
                                                    <td className="py-3 px-4 text-emerald-400 font-medium">{Number(s.cantidad_disponible).toFixed(2)}</td>
                                                    <td className="py-3 px-4 text-slate-300">Bs {Number(s.costo_promedio).toFixed(2)}</td>
                                                    <td className="py-3 px-4 text-slate-300">Bs {Number(s.valor_total).toFixed(2)}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ESTADO_STOCK_COLOR[s.estado_stock] || ''}`}>
                                                            {s.estado_stock}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <button onClick={() => setKardexItem(s)}
                                                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-violet-400 transition-all flex items-center gap-1 text-xs">
                                                            Kardex <ChevronRight className="w-3 h-3" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {tab === 'movimientos' && (
                    <motion.div key="movimientos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {/* Filtros movimientos */}
                        <div className="flex flex-wrap gap-3 mb-4">
                            <div className="relative flex-1 min-w-[180px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={movBusqueda}
                                    onChange={e => { setMovBusqueda(e.target.value); setMovPage(1); }}
                                    placeholder="Código, factura, receptor…"
                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-all" />
                            </div>
                            <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setMovPage(1); }}
                                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60 transition-all">
                                <option value="todos">Todos los tipos</option>
                                {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setMovPage(1); }}
                                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60 transition-all">
                                <option value="todos">Todos los estados</option>
                                {['completado', 'en_transito', 'pendiente', 'anulado'].map(e => (
                                    <option key={e} value={e} className="capitalize">{e.replace('_', ' ')}</option>
                                ))}
                            </select>
                            <BotonExportar
                                url="/exportar/movimientos-almacen"
                                params={exportParams}
                                formatos={['xlsx', 'pdf']}
                                label="Exportar"
                            />
                        </div>

                        {/* Tabla movimientos */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
                            {movimientos.length === 0 ? (
                                <EmptyState icon={<Package className="w-10 h-10" />} title="Sin movimientos" description="No hay movimientos para los filtros seleccionados." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                {['Código', 'Tipo', 'Fecha', 'Receptor / Proveedor', 'Material / Ítem', 'Total', 'Estado', ''].map(h => (
                                                    <th key={h} className="text-left text-slate-400 font-medium py-3 px-4 text-xs">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {movimientos.map(mov => (
                                                <tr key={mov.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                                                    onClick={() => verDetalle(mov.id)}>
                                                    <td className="py-3 px-4">
                                                        <span className="font-mono text-xs text-violet-300">{mov.codigo}</span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLOR[mov.tipo] || 'bg-white/10 text-white/60'}`}>
                                                            {TIPO_LABEL[mov.tipo] || mov.tipo}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-400 text-xs">
                                                        {new Date(mov.fecha_movimiento).toLocaleDateString('es-BO')}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-300 text-xs">
                                                        {mov.beneficiario
                                                            ? `${mov.beneficiario.nombre} ${mov.beneficiario.apellido_paterno}`
                                                            : mov.receptor_nombre
                                                            ? mov.receptor_nombre
                                                            : mov.proveedor
                                                            ? <Link to={`/dashboard/proveedores/${mov.proveedor.id}`}
                                                                className="text-violet-300 hover:text-violet-200 hover:underline transition-colors">
                                                                {mov.proveedor.razon_social}
                                                              </Link>
                                                            : mov.proveedor_nombre || '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-xs max-w-[180px]">
                                                        {mov.presupuesto_item?.item_constructivo
                                                            ? <div>
                                                                <div className="text-slate-300 truncate">{mov.presupuesto_item.item_constructivo.nombre}</div>
                                                                <div className="text-slate-500">{mov.detalles?.[0]?.material?.nombre ?? ''}</div>
                                                              </div>
                                                            : <div>
                                                                <div className="text-slate-400">{mov.detalles?.length ?? '—'} mat.</div>
                                                                {mov.detalles?.[0]?.material && <div className="text-slate-500 truncate">{mov.detalles[0].material.nombre}</div>}
                                                              </div>
                                                        }
                                                    </td>
                                                    <td className="py-3 px-4 text-white text-xs font-mono">
                                                        Bs {Number(mov.monto_total).toFixed(2)}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${ESTADO_MOV_STYLE[mov.estado] || ''}`}>
                                                            {mov.estado?.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            {mov.estado === 'en_transito' && (
                                                                <button onClick={() => confirmarTransferencia(mov)}
                                                                    disabled={confirmandoId === mov.id}
                                                                    title="Confirmar recepción"
                                                                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-30 transition-all">
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            {mov.estado === 'completado' && (
                                                                <button onClick={() => anular(mov)}
                                                                    disabled={anulandoId === mov.id}
                                                                    title="Anular movimiento"
                                                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-30 transition-all">
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Paginación movimientos */}
                        {movLastPage > 1 && (
                            <div className="flex justify-center gap-2 mt-4">
                                {Array.from({ length: movLastPage }, (_, i) => i + 1).map(p => (
                                    <button key={p} onClick={() => setMovPage(p)}
                                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                                            ${p === movPage
                                                ? 'bg-violet-600 text-white'
                                                : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

            </AnimatePresence>

            {/* Drawer de detalle de movimiento */}
            <AnimatePresence>
                {detalleMovId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-end"
                        onClick={() => { setDetalleMovId(null); setDetalleMov(null); }}>
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }}
                            onClick={e => e.stopPropagation()}
                            className="relative z-10 w-full max-w-sm h-full bg-slate-900/95 border-l border-white/10 overflow-y-auto p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-white font-semibold">Detalle movimiento</h3>
                                <button onClick={() => { setDetalleMovId(null); setDetalleMov(null); }}
                                    className="text-slate-400 hover:text-white">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                            {!detalleMov ? (
                                <div className="text-slate-400 text-sm">Cargando…</div>
                            ) : (
                                <div className="space-y-4 text-sm">
                                    <Campo label="Código" value={detalleMov.codigo} mono />
                                    <Campo label="Tipo" value={TIPO_LABEL[detalleMov.tipo] || detalleMov.tipo} />
                                    <Campo label="Estado" value={detalleMov.estado} />
                                    <Campo label="Fecha" value={new Date(detalleMov.fecha_movimiento).toLocaleString('es-BO')} />
                                    {detalleMov.proveedor
                                        ? <div>
                                            <p className="text-slate-400 text-xs mb-0.5">Proveedor</p>
                                            <Link to={`/dashboard/proveedores/${detalleMov.proveedor.id}`}
                                                className="text-violet-300 hover:text-violet-200 hover:underline text-sm transition-colors flex items-center gap-1">
                                                {detalleMov.proveedor.razon_social}
                                                <span className="text-white/25 text-xs font-mono">({detalleMov.proveedor.codigo})</span>
                                            </Link>
                                            {detalleMov.proveedor.telefono_principal && (
                                                <p className="text-white/40 text-xs mt-0.5">{detalleMov.proveedor.telefono_principal}</p>
                                            )}
                                          </div>
                                        : detalleMov.proveedor_nombre
                                        ? <Campo label="Proveedor" value={detalleMov.proveedor_nombre} />
                                        : null
                                    }
                                    {detalleMov.numero_factura && <Campo label="Factura" value={detalleMov.numero_factura} />}
                                    {detalleMov.receptor_nombre && <Campo label="Receptor" value={detalleMov.receptor_nombre} />}
                                    {detalleMov.beneficiario && (
                                        <Campo label="Beneficiario" value={`${detalleMov.beneficiario.nombre} ${detalleMov.beneficiario.apellido_paterno}`} />
                                    )}
                                    {detalleMov.notas && <Campo label="Notas" value={detalleMov.notas} />}

                                    <div className="border-t border-white/10 pt-3">
                                        <p className="text-slate-400 text-xs font-semibold mb-2">Materiales</p>
                                        {(detalleMov.detalles || []).map(d => (
                                            <div key={d.id} className="flex justify-between py-1.5 border-b border-white/5 text-xs">
                                                <span className="text-white/70">{d.material?.nombre}</span>
                                                <span className="text-white font-mono">{Number(d.cantidad).toFixed(2)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between pt-2 font-semibold">
                                            <span className="text-slate-400">Total</span>
                                            <span className="text-emerald-400 font-mono">Bs {Number(detalleMov.monto_total).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {(detalleMov.evidencias || []).length > 0 && (
                                        <div className="border-t border-white/10 pt-3">
                                            <p className="text-slate-400 text-xs font-semibold mb-2">Evidencias</p>
                                            <div className="flex flex-wrap gap-2">
                                                {detalleMov.evidencias.map(ev => (
                                                    <div key={ev.id} className="text-xs px-2 py-1 rounded-lg bg-white/5 text-white/60 capitalize">
                                                        {ev.tipo}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            {kardexItem && (
                <KardexModal almacen={almacen} stockItem={kardexItem} onClose={() => setKardexItem(null)} />
            )}
            <AnimatePresence>
                {modalEntrada && (
                    <EntradaCompraModal key="modal-entrada" almacen={almacen}
                        onClose={() => setModalEntrada(false)}
                        onGuardado={() => { setModalEntrada(false); handleGuardado(); }} />
                )}
                {modalSocialOpen && (
                    <EntregaSocialModal key="modal-social" almacen={almacen}
                        stocks={data?.stocks || []}
                        onClose={() => setModalSocialOpen(false)}
                        onGuardado={() => { setModalSocialOpen(false); handleGuardado(); }} />
                )}
                {modalPrivadaOpen && (
                    <EntregaPrivadaModal key="modal-privada" almacen={almacen}
                        stocks={data?.stocks || []}
                        onClose={() => setModalPrivadaOpen(false)}
                        onGuardado={() => { setModalPrivadaOpen(false); handleGuardado(); }} />
                )}
                {modalTransfer && (
                    <TransferenciaModal key="modal-transfer" almacen={almacen}
                        stocks={data?.stocks || []}
                        onClose={() => setModalTransfer(false)}
                        onGuardado={() => { setModalTransfer(false); handleGuardado(); }} />
                )}
            </AnimatePresence>
        </div>
    );
}

const Campo = ({ label, value, mono }) => (
    <div className="flex justify-between gap-3 border-b border-white/5 pb-1.5">
        <span className="text-slate-400 shrink-0">{label}</span>
        <span className={`text-white text-right ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '—'}</span>
    </div>
);
