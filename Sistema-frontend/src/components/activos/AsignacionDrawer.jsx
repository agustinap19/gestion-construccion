import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, Briefcase, Home, Calendar, Clock, FileText, DollarSign } from '../../components/icons/Icons';
import TimelineEstadoActa from './TimelineEstadoActa';
import AccionActaButton from './AccionActaButton';
import { asignacionActivoService } from '../../services/asignacionActivoService';
import { actaEntregaService } from '../../services/actaEntregaService';
import { useAuth } from '../../context/AuthContext';
import { formatFecha } from '../../utils/format';
import { Badge, Button, InputField, ComponentCard } from '../../components/ui';

const ESTADO_ASIGNACION_CFG = {
    planificada: { label: 'Planificada', variant: 'light', color: 'info' },
    activa:      { label: 'Activa',      variant: 'light', color: 'primary' },
    completada:  { label: 'Completada',  variant: 'light', color: 'success' },
    cancelada:   { label: 'Cancelada',   variant: 'light', color: 'error' },
};

function StatTile({ icon: Icon, label, value }) {
    return (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 shadow-inner flex flex-col justify-center transition-all hover:bg-white/[0.04]">
            <p className="text-white/40 text-[10px] mb-1.5 flex items-center gap-1.5 uppercase tracking-wider font-medium">
                <Icon className="w-3.5 h-3.5 text-violet-400/70" /> {label}
            </p>
            <p className="font-bold text-base text-white">{value}</p>
        </div>
    );
}

// Sin actas → puede generar si la asignación está planificada o activa (asignación manual).
// Con actas → solo puede generar la siguiente si la última ya fue devuelta
// (no se puede prestar el mismo activo a otra vivienda mientras la entrega anterior está en curso).
function puedeGenerarNuevaActa(actas, asignacion) {
    if (actas.length === 0) {
        return asignacion.estado === 'planificada' || asignacion.estado === 'activa';
    }
    const ultimaActa = actas[actas.length - 1];
    return ultimaActa.estado === 'devuelta';
}

export default function AsignacionDrawer({ asignacion, onClose, onUpdated }) {
    const { hasPermission } = useAuth();
    const esSocial = asignacion.proyecto?.categoria === 'social';
    const estadoCfg = ESTADO_ASIGNACION_CFG[asignacion.estado] || ESTADO_ASIGNACION_CFG.planificada;

    const [actas, setActas] = useState([]);
    const [cargandoActas, setCargandoActas] = useState(esSocial);
    const [horasReales, setHorasReales] = useState(asignacion.horas_reales_acumuladas ?? 0);
    const [generandoActa, setGenerandoActa] = useState(false);
    const [completando, setCompletando] = useState(false);

    const cargarActas = useCallback(async () => {
        if (!esSocial) return;
        setCargandoActas(true);
        try {
            const res = await actaEntregaService.listarPorAsignacion(asignacion.id);
            setActas(res.data ?? []);
        } catch {
            toast.error('Error al cargar las actas de esta asignación.');
        } finally {
            setCargandoActas(false);
        }
    }, [asignacion.id, esSocial]);

    useEffect(() => { cargarActas(); }, [cargarActas]);

    const generarActa = async () => {
        setGenerandoActa(true);
        try {
            await actaEntregaService.crear(asignacion.id);
            toast.success('Acta generada.');
            cargarActas();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al generar el acta.');
        } finally {
            setGenerandoActa(false);
        }
    };

    const completarAsignacion = async () => {
        setCompletando(true);
        try {
            await asignacionActivoService.cambiarEstado(asignacion.id, 'completada', { horas_reales_acumuladas: horasReales });
            toast.success('Asignación completada.');
            onUpdated?.();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al completar la asignación.');
        } finally {
            setCompletando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose} className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-md" />

            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="relative w-full max-w-lg h-full shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col
                    bg-[#0d0f1a] border-l border-white/10">

                {/* Header */}
                <div className="px-7 py-6 border-b border-white/10 shrink-0 bg-white/[0.02]">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/20">
                                <Briefcase className="w-6 h-6 text-violet-300" />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-white leading-tight">{asignacion.proyecto?.nombre}</p>
                                <p className="text-xs text-white/50 mt-1">{asignacion.proyecto?.codigo} · {esSocial ? 'Proyecto social' : 'Proyecto privado'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all shrink-0 border border-white/5">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-5">
                        <Badge variant={estadoCfg.variant} color={estadoCfg.color}>{estadoCfg.label}</Badge>
                        {asignacion.vivienda && (
                            <Badge variant="light" color="light" startIcon={<Home className="w-3 h-3" />}>
                                {asignacion.vivienda.codigo}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-7 space-y-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                    {/* Datos generales */}
                    <div className="grid grid-cols-2 gap-4">
                        <StatTile icon={Calendar} label="Inicio" value={formatFecha(asignacion.fecha_inicio)} />
                        <StatTile icon={Calendar} label="Fin estimado" value={formatFecha(asignacion.fecha_fin_estimada)} />
                        <StatTile icon={Clock} label="Horas/día" value={asignacion.horas_dia_estimadas} />
                        <StatTile icon={DollarSign} label="Costo" value={`Bs. ${Number(asignacion.costo_total_real ?? 0).toFixed(2)}`} />
                    </div>

                    {asignacion.notas && (
                        <div>
                            <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Notas de asignación</h3>
                            <p className="text-sm text-white/80 bg-white/[0.02] p-4 rounded-2xl border border-white/10 shadow-inner leading-relaxed">
                                {asignacion.notas}
                            </p>
                        </div>
                    )}

                    {/* Proyecto privado: completar asignación */}
                    {!esSocial && asignacion.estado === 'activa' && hasPermission('activos.asignar') && (
                        <ComponentCard title="Completar asignación" className="shadow-none">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-white/50 mb-2 font-medium">Horas reales acumuladas</label>
                                    <InputField type="number" min="0" step="0.5" value={horasReales} onChange={e => setHorasReales(e.target.value)} />
                                </div>
                                <Button disabled={completando} onClick={completarAsignacion} className="w-full">
                                    {completando ? 'Completando…' : 'Finalizar y liberar activo'}
                                </Button>
                            </div>
                        </ComponentCard>
                    )}

                    {/* Proyecto social: actas de entrega */}
                    {esSocial && (
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider">Actas de entrega</h3>
                                {hasPermission('activos.asignar') && puedeGenerarNuevaActa(actas, asignacion) && (
                                    <Button size="sm" disabled={generandoActa} onClick={generarActa}>
                                        {generandoActa ? 'Generando…' : actas.length === 0 ? '+ Generar acta' : '+ Acta siguiente vivienda'}
                                    </Button>
                                )}
                            </div>

                            {cargandoActas ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                                </div>
                            ) : actas.length === 0 ? (
                                <div className="text-center py-10 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
                                    <FileText className="w-10 h-10 text-white/10 mx-auto mb-3" />
                                    <p className="text-sm text-white/30">No se han generado actas para esta asignación.</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {actas.map(acta => (
                                        <div key={acta.id} className="p-5 rounded-3xl border border-white/10 bg-white/[0.02] shadow-xl hover:bg-white/[0.03] transition-colors">
                                            <div className="flex items-center justify-between mb-6">
                                                <p className="text-sm font-bold text-white tracking-wide">{acta.numero_acta}</p>
                                            </div>
                                            
                                            <div className="mb-6 bg-[#0a0a0a]/50 p-4 rounded-2xl border border-white/5">
                                                <TimelineEstadoActa estadoActual={acta.estado} />
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {acta.pdf_generado_url && (
                                                        <Button size="sm" variant="outline" onClick={() => actaEntregaService.verPdfGenerado(acta.id)}
                                                            startIcon={<FileText className="w-3.5 h-3.5" />}>
                                                            Original
                                                        </Button>
                                                    )}
                                                    {acta.pdf_firmado_url && (
                                                        <Button size="sm" variant="outline" onClick={() => actaEntregaService.verPdfFirmado(acta.id)}
                                                            startIcon={<FileText className="w-3.5 h-3.5" />}>
                                                            Firmado
                                                        </Button>
                                                    )}
                                                </div>

                                                <AccionActaButton acta={acta} onUpdated={cargarActas} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
