import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Home, Building2, ChevronDown, ChevronRight, FileText, RefreshCw, AlertTriangle } from '../../components/icons/Icons';
import { useBreadcrumbTitle } from '../../context/BreadcrumbContext';
import { activoService } from '../../services/activoService';
import TimelineEstadoActa from '../../components/activos/TimelineEstadoActa';
import AccionActaButton from '../../components/activos/AccionActaButton';
import { asignacionActivoService } from '../../services/asignacionActivoService';
import { actaEntregaService } from '../../services/actaEntregaService';
import { formatFecha } from '../../utils/format';
import { Badge } from '../../components/ui';

const ACTA_ESTADO_CFG = {
    generada:       { label: 'Generada',  color: 'light',   variant: 'light' },
    impresa:        { label: 'Impresa',   color: 'info',    variant: 'light' },
    firmada_subida: { label: 'Firmada',   color: 'warning', variant: 'light' },
    aprobada:       { label: 'Aprobada',  color: 'success', variant: 'light' },
    entregada:      { label: 'Entregada', color: 'success', variant: 'solid' },
    devuelta:       { label: 'Devuelta',  color: 'light',   variant: 'solid' },
};

const ESTADOS_FILTRO = ['todos', 'generada', 'impresa', 'firmada_subida', 'aprobada', 'entregada', 'devuelta'];

function nombreBeneficiario(b) {
    if (!b) return null;
    return [b.nombre, b.apellido_paterno, b.apellido_materno].filter(Boolean).join(' ');
}

function ViviendaActaCard({ asignacion, onActualizar }) {
    const [expandida, setExpandida] = useState(false);
    const acta = asignacion.actas_entrega?.[0] ?? null;
    const estadoCfg = ACTA_ESTADO_CFG[acta?.estado] ?? ACTA_ESTADO_CFG.generada;

    const nombreBenef = nombreBeneficiario(asignacion.vivienda?.beneficiario)
        ?? asignacion.vivienda?.codigo
        ?? `Vivienda ${asignacion.vivienda_id}`;

    const devueltaTarde = acta?.fecha_devolucion_real && acta?.fecha_devolucion_estimada
        && new Date(acta.fecha_devolucion_real) > new Date(acta.fecha_devolucion_estimada);

    const devolucionVencida = acta?.fecha_devolucion_estimada
        && acta.estado === 'entregada'
        && new Date(acta.fecha_devolucion_estimada) < new Date();

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all hover:bg-white/[0.03]">
            <button onClick={() => setExpandida(p => !p)} className="w-full flex items-center gap-3 p-4 text-left">
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
                    <Home className="w-4 h-4 text-pink-400" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{nombreBenef}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">
                        {asignacion.vivienda?.codigo}{acta && ` · ${acta.numero_acta}`}
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {acta && <Badge variant={estadoCfg.variant} color={estadoCfg.color}>{estadoCfg.label}</Badge>}
                    {expandida ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
                </div>
            </button>

            {expandida && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-white/40 mb-1">Inicio asignación</p>
                            <p className="text-sm font-semibold text-white">{formatFecha(asignacion.fecha_inicio)}</p>
                        </div>
                        <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-white/40 mb-1">Fin estimado</p>
                            <p className="text-sm font-semibold text-white">{formatFecha(asignacion.fecha_fin_estimada)}</p>
                        </div>
                    </div>

                    {acta ? (
                        <div className="space-y-4">
                            <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                <TimelineEstadoActa estadoActual={acta.estado} />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-[10px] text-white/30 mb-0.5">Entrega estimada</p>
                                    <p className="text-xs text-white/70">{formatFecha(acta.fecha_entrega_estimada)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/30 mb-0.5">Devolución estimada</p>
                                    {devolucionVencida ? (
                                        <p className="text-xs text-red-400 font-semibold flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> {formatFecha(acta.fecha_devolucion_estimada)}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-white/70">{acta.fecha_devolucion_estimada ? formatFecha(acta.fecha_devolucion_estimada) : '—'}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/30 mb-0.5">Entrega real</p>
                                    <p className="text-xs text-white/70">{acta.fecha_entrega_real ? formatFecha(acta.fecha_entrega_real) : '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/30 mb-0.5">Devolución real</p>
                                    {devueltaTarde ? (
                                        <p className="text-xs text-red-400 font-semibold flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> {formatFecha(acta.fecha_devolucion_real)}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-white/70">{acta.fecha_devolucion_real ? formatFecha(acta.fecha_devolucion_real) : '—'}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {acta.pdf_generado_url && (
                                    <button onClick={() => actaEntregaService.verPdfGenerado(acta.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-[11px] text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors">
                                        <FileText className="w-3 h-3" /> PDF original
                                    </button>
                                )}
                                {acta.pdf_firmado_url && (
                                    <button onClick={() => actaEntregaService.verPdfFirmado(acta.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-[11px] text-emerald-300 hover:bg-emerald-500/20 transition-colors">
                                        <FileText className="w-3 h-3" /> PDF firmado
                                    </button>
                                )}
                            </div>

                            {(acta.foto_entrega_url || acta.foto_devolucion_url) && (
                                <div className="grid grid-cols-2 gap-3">
                                    {acta.foto_entrega_url && (
                                        <div>
                                            <p className="text-[10px] text-white/30 mb-1.5">Foto de entrega</p>
                                            <img src={acta.foto_entrega_url} alt="Foto de entrega"
                                                className="w-full h-28 object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => window.open(acta.foto_entrega_url, '_blank')} />
                                        </div>
                                    )}
                                    {acta.foto_devolucion_url && (
                                        <div>
                                            <p className="text-[10px] text-white/30 mb-1.5">Foto de devolución</p>
                                            <img src={acta.foto_devolucion_url} alt="Foto de devolución"
                                                className="w-full h-28 object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => window.open(acta.foto_devolucion_url, '_blank')} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {acta.nota_rechazo && (
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-[11px] text-amber-300">⚠ Rechazada: {acta.nota_rechazo}</p>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <AccionActaButton acta={acta} onUpdated={onActualizar} />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
                            <FileText className="w-8 h-8 text-white/10 mx-auto mb-2" />
                            <p className="text-sm text-white/30">Sin acta generada</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ProyectoGroup({ proyecto, asignaciones, onActualizar }) {
    const [collapsed, setCollapsed] = useState(false);

    const totalActas = asignaciones.length;
    const devueltas = asignaciones.filter(a => a.actas_entrega?.[0]?.estado === 'devuelta').length;
    const entregadas = asignaciones.filter(a => a.actas_entrega?.[0]?.estado === 'entregada').length;

    return (
        <div className="rounded-3xl border border-white/10 bg-white/[0.01] overflow-hidden">
            <button onClick={() => setCollapsed(p => !p)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white truncate">{proyecto.nombre}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                        {proyecto.codigo} · {totalActas} vivienda{totalActas !== 1 ? 's' : ''}
                        {devueltas > 0 && ` · ${devueltas} devuelta${devueltas !== 1 ? 's' : ''}`}
                        {entregadas > 0 && ` · ${entregadas} en uso`}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                        <p className="text-xs text-white/60 font-semibold">{devueltas}/{totalActas}</p>
                        <p className="text-[10px] text-white/30">completadas</p>
                    </div>
                    {collapsed ? <ChevronRight className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                </div>
            </button>

            {!collapsed && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-4">
                    {asignaciones.map(asig => (
                        <ViviendaActaCard key={asig.id} asignacion={asig} onActualizar={onActualizar} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function FlujoPrestamosPage() {
    const { id } = useParams();

    const [activo, setActivo] = useState(null);
    const [grupos, setGrupos] = useState({});
    const [cargando, setCargando] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('todos');

    useBreadcrumbTitle(`/dashboard/activos/${id}`, activo?.nombre);
    useBreadcrumbTitle(`/dashboard/activos/${id}/prestamos-sociales`, 'Préstamos Sociales');

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const [resActivo, resAsig] = await Promise.all([
                activoService.obtener(id),
                asignacionActivoService.listar({ activo_id: id, tipo: 'social', per_page: 100 }),
            ]);
            setActivo(resActivo.data ?? resActivo);

            const asignaciones = (resAsig.data?.data ?? resAsig.data ?? [])
                // Solo asignaciones de vivienda individual: las de nivel-proyecto
                // (sin vivienda_id, generadas por el modo Simplex antes de "Distribuir
                // entre viviendas") no tienen acta posible todavía.
                .filter(a => a.vivienda_id);

            const agrupadas = {};
            asignaciones.forEach(a => {
                const pid = a.proyecto_id;
                if (!pid) return;
                if (!agrupadas[pid]) agrupadas[pid] = { proyecto: a.proyecto, asignaciones: [] };
                agrupadas[pid].asignaciones.push(a);
            });

            setGrupos(agrupadas);
        } catch {
            toast.error('Error al cargar los préstamos sociales del activo.');
        } finally {
            setCargando(false);
        }
    }, [id]);

    useEffect(() => { cargar(); }, [cargar]);

    const gruposFiltrados = Object.entries(grupos).reduce((acc, [pid, grupo]) => {
        const asigsFiltradas = filtroEstado === 'todos'
            ? grupo.asignaciones
            : grupo.asignaciones.filter(a => a.actas_entrega?.[0]?.estado === filtroEstado);
        if (asigsFiltradas.length > 0) acc[pid] = { ...grupo, asignaciones: asigsFiltradas };
        return acc;
    }, {});

    const totalViviendas = Object.values(grupos).reduce((s, g) => s + g.asignaciones.length, 0);
    const totalDevueltas = Object.values(grupos).reduce(
        (s, g) => s + g.asignaciones.filter(a => a.actas_entrega?.[0]?.estado === 'devuelta').length, 0
    );

    if (cargando && !activo) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-white">Préstamos Sociales — {activo?.nombre}</h1>
                    <p className="text-sm text-white/40 mt-1">
                        {totalViviendas} vivienda{totalViviendas !== 1 ? 's' : ''} · {totalDevueltas} completada{totalDevueltas !== 1 ? 's' : ''}
                    </p>
                </div>
                <button onClick={cargar}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-white/40 text-xs hover:text-white hover:bg-white/[0.04] transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                </button>
            </div>

            <div className="flex gap-2 flex-wrap">
                {ESTADOS_FILTRO.map(estado => (
                    <button key={estado} onClick={() => setFiltroEstado(estado)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors
                            ${filtroEstado === estado
                                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                                : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/60'}`}>
                        {estado === 'todos' ? 'Todos'
                            : estado === 'generada' ? 'Generada'
                            : estado === 'impresa' ? 'Impresa'
                            : estado === 'firmada_subida' ? 'Firmada'
                            : estado === 'aprobada' ? 'Aprobada'
                            : estado === 'entregada' ? 'Entregada' : 'Devuelta'}
                    </button>
                ))}
            </div>

            {cargando ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                </div>
            ) : Object.keys(gruposFiltrados).length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl">
                    <Home className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30">
                        {filtroEstado === 'todos'
                            ? 'No hay préstamos sociales registrados para este activo.'
                            : `No hay actas en estado "${filtroEstado}".`}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.values(gruposFiltrados).map(({ proyecto, asignaciones }) => (
                        <ProyectoGroup key={proyecto.id} proyecto={proyecto} asignaciones={asignaciones} onActualizar={cargar} />
                    ))}
                </div>
            )}
        </div>
    );
}
