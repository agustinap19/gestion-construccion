import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Shield, Plus, Edit, Trash2, RotateCcw,
    ChevronDown, ChevronUp, User,
    Calendar, RefreshCw, Download, Filter,
} from '../icons/Icons';
import Spinner from './Spinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ETIQUETAS_EVENTO = {
    created:  'Creó el registro',
    updated:  'Modificó el registro',
    deleted:  'Eliminó el registro',
    restored: 'Restauró el registro',
};

const ICONOS_EVENTO = {
    created:  { Icon: Plus,      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    updated:  { Icon: Edit,      color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30' },
    deleted:  { Icon: Trash2,    color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/30' },
    restored: { Icon: RotateCcw, color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30' },
};

const LABELS_CAMPO = {
    nombre: 'Nombre', apellido_paterno: 'Apellido paterno', apellido_materno: 'Apellido materno',
    email: 'Email', telefono: 'Teléfono', estado: 'Estado', rol_id: 'Rol',
    nombre_visible: 'Nombre visible', descripcion: 'Descripción',
    tipo: 'Tipo', ci: 'CI', ci_complemento: 'Complemento CI',
    direccion: 'Dirección', fecha_nacimiento: 'Fecha de nacimiento',
    salario_base: 'Salario base', tipo_contrato: 'Tipo de contrato',
    fecha_contratacion: 'Fecha de contratación', estado_laboral: 'Estado laboral',
    especialidad: 'Especialidad', categoria: 'Categoría',
    frecuencia_pago: 'Frecuencia de pago', banco: 'Banco',
    numero_cuenta: 'N° de cuenta', tipo_cuenta: 'Tipo de cuenta',
    nit: 'NIT', nivel: 'Nivel', sigla: 'Sigla',
    zona_id: 'Zona', usuario_creador_id: 'Creador',
    documento_tipo: 'Tipo doc.', documento_numero: 'N° documento',
    telefono_principal: 'Teléfono principal', telefono_alternativo: 'Teléfono alternativo',
    representante_legal: 'Representante legal', cargo_representante: 'Cargo',
    nombre_comercial: 'Nombre comercial', sector: 'Sector', origen: 'Origen',
    genero: 'Género', cantidad_familiares: 'Cantidad de familiares',
    personas_dependientes: 'Personas dependientes', estado_seleccion: 'Estado de selección',
    debe_cambiar_password: 'Debe cambiar contraseña',
    intentos_fallidos: 'Intentos fallidos',
    totp_activo: 'TOTP activado',
};

function nombreUsuario(user) {
    if (!user) return 'Sistema';
    const partes = [user.nombre, user.apellido_paterno].filter(Boolean);
    return partes.length > 0 ? partes.join(' ') : user.email;
}

function formatearValor(val) {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Sí' : 'No';
    return String(val);
}

function DiffCampos({ oldValues, newValues }) {
    const camposModificados = Object.keys(newValues || {}).filter(
        k => JSON.stringify((oldValues || {})[k]) !== JSON.stringify(newValues[k])
    );
    if (camposModificados.length === 0) return null;
    return (
        <div className="mt-3 space-y-1.5">
            {camposModificados.map(campo => (
                <div key={campo} className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-2 gap-y-0.5 text-xs items-baseline">
                    <span className="text-slate-500 font-medium col-span-4">
                        {LABELS_CAMPO[campo] || campo}
                    </span>
                    <span className="text-rose-400/80 line-through truncate">
                        {formatearValor((oldValues || {})[campo])}
                    </span>
                    <span className="text-slate-600">→</span>
                    <span className="text-emerald-400 truncate col-span-2">
                        {formatearValor(newValues[campo])}
                    </span>
                </div>
            ))}
        </div>
    );
}

function EntradaAuditoria({ audit }) {
    const [expandido, setExpandido] = useState(false);
    const evento = audit.event || 'updated';
    const { Icon, color, bg } = ICONOS_EVENTO[evento] || ICONOS_EVENTO.updated;
    const etiqueta = ETIQUETAS_EVENTO[evento] || evento;

    const camposModificados = evento === 'updated'
        ? Object.keys(audit.new_values || {}).filter(
            k => JSON.stringify((audit.old_values || {})[k]) !== JSON.stringify((audit.new_values || {})[k])
          ).length
        : 0;

    const tieneDiff = evento === 'updated' && camposModificados > 0;
    const tieneValores = (evento === 'created' && Object.keys(audit.new_values || {}).length > 0) ||
                         tieneDiff ||
                         (evento === 'deleted' && Object.keys(audit.old_values || {}).length > 0);

    const descripcion = evento === 'updated' && camposModificados > 0
        ? `Modificó ${camposModificados} campo${camposModificados > 1 ? 's' : ''}`
        : etiqueta;

    return (
        <div className="flex gap-4 group">
            <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-9 h-9 rounded-full border ${bg} shrink-0`}>
                    <Icon size={15} className={color} />
                </div>
                <div className="w-px flex-1 bg-slate-700/50 mt-2 group-last:hidden" />
            </div>

            <div className="pb-6 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-200">{descripcion}</span>
                    <span className="text-xs text-slate-500 shrink-0 tabular-nums">
                        {new Date(audit.created_at).toLocaleString('es-BO', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                        })}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                    <User size={12} />
                    <span>{nombreUsuario(audit.user)}</span>
                    {audit.ip_address && (
                        <span className="text-slate-600">· {audit.ip_address}</span>
                    )}
                </div>

                {tieneValores && (
                    <button
                        onClick={() => setExpandido(v => !v)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        {expandido ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {expandido ? 'Ocultar detalles' : 'Ver detalles'}
                    </button>
                )}

                {expandido && tieneDiff && (
                    <DiffCampos oldValues={audit.old_values} newValues={audit.new_values} />
                )}

                {expandido && evento === 'created' && (
                    <div className="mt-3">
                        <pre className="text-xs bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-400 overflow-x-auto">
                            {JSON.stringify(audit.new_values, null, 2)}
                        </pre>
                    </div>
                )}

                {expandido && evento === 'deleted' && Object.keys(audit.old_values || {}).length > 0 && (
                    <div className="mt-3">
                        <pre className="text-xs bg-slate-900 border border-rose-900/30 rounded-lg p-3 text-slate-400 overflow-x-auto">
                            {JSON.stringify(audit.old_values, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 30_000;

const AuditoriaTimeline = ({ entidad, id, minDesde }) => {
    const hoy = new Date().toISOString().slice(0, 10);
    const minDesdeStr = minDesde ? minDesde.slice(0, 10) : undefined;

    const [audits, setAudits] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [meta, setMeta] = useState(null);
    const [cargandoMas, setCargandoMas] = useState(false);
    const [cargandoPdf, setCargandoPdf] = useState(false);
    const [refrescando, setRefrescando] = useState(false);
    const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

    const [desde, setDesde] = useState(minDesdeStr ?? '');
    const [hasta, setHasta] = useState('');

    const intervalRef = useRef(null);

    const cargar = useCallback(async (pag = 1, acumular = false, silencioso = false) => {
        if (!silencioso) {
            if (pag === 1) setCargando(true);
            else setCargandoMas(true);
        } else {
            setRefrescando(true);
        }
        setError(null);
        try {
            const params = { page: pag, per_page: 20 };
            if (desde) params.desde = desde;
            if (hasta) params.hasta = hasta;

            const res = await api.get(`/auditoria/${entidad}/${id}`, { params });
            const payload = res.data.data;
            setMeta({
                currentPage: payload.current_page,
                lastPage: payload.last_page,
                total: payload.total,
            });
            setAudits(prev => acumular ? [...prev, ...payload.data] : payload.data);
            setPagina(pag);
            setUltimaActualizacion(new Date());
        } catch {
            if (!silencioso) setError('No se pudo cargar el historial de auditoría.');
        } finally {
            setCargando(false);
            setCargandoMas(false);
            setRefrescando(false);
        }
    }, [entidad, id, desde, hasta]);

    // Carga inicial y cuando cambian los filtros
    useEffect(() => {
        cargar(1, false, false);
    }, [cargar]);

    // Auto-refresh cada 30 s (silencioso)
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            cargar(1, false, true);
        }, REFRESH_INTERVAL);
        return () => clearInterval(intervalRef.current);
    }, [cargar]);

    const descargarPdf = async () => {
        setCargandoPdf(true);
        try {
            const params = {};
            if (desde) params.desde = desde;
            if (hasta) params.hasta = hasta;
            const res = await api.get(`/auditoria/${entidad}/${id}/exportar-pdf`, {
                params,
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `auditoria_${entidad}_${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success('PDF generado correctamente');
        } catch {
            toast.error('No se pudo generar el PDF');
        } finally {
            setCargandoPdf(false);
        }
    };

    const limpiarFiltros = () => {
        setDesde(minDesdeStr ?? '');
        setHasta('');
    };

    const hayFiltrosActivos = (desde && desde !== minDesdeStr) || !!hasta;

    if (cargando) {
        return (
            <div className="rounded-2xl border border-white/7 bg-[rgba(8,12,26,0.95)] p-8 flex justify-center items-center gap-3">
                <Spinner className="h-5 w-5" color="text-slate-400" />
                <span className="text-slate-400 text-sm">Cargando historial...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-white/7 bg-[rgba(8,12,26,0.95)] p-6 text-center">
                <p className="text-rose-400 text-sm">{error}</p>
                <button onClick={() => cargar(1)} className="mt-3 text-xs text-slate-400 hover:text-white underline">
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-white/7 bg-[rgba(8,12,26,0.95)] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-white/7">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Shield size={15} className="text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white leading-tight">Historial de Cambios</h3>
                        <p className="text-xs text-slate-500 leading-tight">
                            {meta ? `${meta.total} registro${meta.total !== 1 ? 's' : ''}` : '—'}
                            {refrescando && <span className="ml-2 text-blue-400">· actualizando...</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {ultimaActualizacion && !refrescando && (
                        <span className="hidden sm:inline text-xs text-slate-600">
                            {ultimaActualizacion.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={() => cargar(1, false, false)}
                        disabled={cargando || refrescando}
                        title="Actualizar"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-40"
                    >
                        <RefreshCw size={14} className={refrescando ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={descargarPdf}
                        disabled={cargandoPdf}
                        title="Exportar PDF"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                    >
                        {cargandoPdf
                            ? <Spinner className="h-3.5 w-3.5" color="text-blue-400" />
                            : <Download size={13} />
                        }
                        PDF
                    </button>
                </div>
            </div>

            {/* Filtros de fecha */}
            <div className="flex flex-wrap items-end gap-3 px-6 py-3 border-b border-white/5 bg-white/2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                    <Filter size={12} />
                    <span>Filtrar por fecha</span>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex flex-col gap-0.5">
                        <label className="text-xs text-slate-600">Desde</label>
                        <input
                            type="date"
                            value={desde}
                            min={minDesdeStr}
                            max={hasta || hoy}
                            onChange={e => setDesde(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-200 text-xs focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-colors [color-scheme:dark]"
                        />
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-xs text-slate-600">Hasta</label>
                        <input
                            type="date"
                            value={hasta}
                            min={desde || minDesdeStr}
                            max={hoy}
                            onChange={e => setHasta(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-200 text-xs focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-colors [color-scheme:dark]"
                        />
                    </div>

                    {hayFiltrosActivos && (
                        <button
                            onClick={limpiarFiltros}
                            className="mt-4 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700/50 hover:border-slate-600 rounded-lg transition-colors"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline */}
            <div className="px-6 py-5">
                {audits.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-white/5 flex items-center justify-center mx-auto mb-3">
                            <Calendar size={20} className="text-slate-600" />
                        </div>
                        <p className="text-slate-500 text-sm">No hay registros de auditoría en este período.</p>
                        {hayFiltrosActivos && (
                            <button
                                onClick={limpiarFiltros}
                                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                                Quitar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div>
                        {audits.map(audit => (
                            <EntradaAuditoria key={audit.id} audit={audit} />
                        ))}

                        {meta && pagina < meta.lastPage && (
                            <button
                                onClick={() => cargar(pagina + 1, true, false)}
                                disabled={cargandoMas}
                                className="mt-2 w-full py-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {cargandoMas
                                    ? <><Spinner className="h-4 w-4" color="text-slate-400" /> Cargando...</>
                                    : 'Cargar más registros'
                                }
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Footer: auto-refresh indicator */}
            <div className="px-6 py-2.5 border-t border-white/5 flex items-center gap-1.5 text-xs text-slate-700">
                <RefreshCw size={10} />
                <span>Se actualiza automáticamente cada 30 segundos</span>
            </div>
        </div>
    );
};

export default AuditoriaTimeline;
