import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Check, Briefcase, Search, AlertTriangle } from '../../components/icons/Icons';
import { asignacionActivoService } from '../../services/asignacionActivoService';
import proyectoService from '../../services/proyectoService';
import viviendaService from '../../services/viviendaService';
import { Modal, Button, InputField, Label, TextArea } from '../../components/ui';

const sectionTitleCls = 'text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3';

export default function NuevaAsignacionModal({ activo, onClose, onCreado }) {
    const [proyectos, setProyectos] = useState([]);
    const [buscarProyecto, setBuscarProyecto] = useState('');
    const [proyecto, setProyecto] = useState(null);

    const [viviendas, setViviendas] = useState([]);
    const [buscarVivienda, setBuscarVivienda] = useState('');
    const [viviendaId, setViviendaId] = useState('');

    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [horasDia, setHorasDia] = useState(8);
    const [notas, setNotas] = useState('');

    const [conflicto, setConflicto] = useState(null);
    const [advertencia, setAdvertencia] = useState(null);
    const [confirmaAdvertencia, setConfirmaAdvertencia] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        proyectoService.listarSimples().then(data => setProyectos(Array.isArray(data) ? data : [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (proyecto?.categoria === 'social') {
            viviendaService.listarPorProyecto(proyecto.id, {}, 1, 200)
                .then(res => setViviendas(res?.data?.data ?? res?.data ?? []))
                .catch(() => setViviendas([]));
        } else {
            setViviendas([]);
            setViviendaId('');
        }
    }, [proyecto]);

    useEffect(() => {
        setConflicto(null);
        if (!fechaInicio || !fechaFin) return;
        const t = setTimeout(() => {
            asignacionActivoService.verificarDisponibilidad(activo.id, fechaInicio, fechaFin)
                .then(res => {
                    if (!res.data?.disponible) setConflicto(res.data?.conflicto);
                })
                .catch(() => {});
        }, 400);
        return () => clearTimeout(t);
    }, [fechaInicio, fechaFin, activo.id]);

    const proyectosFiltrados = useMemo(() => {
        if (!buscarProyecto.trim()) return proyectos.slice(0, 8);
        const q = buscarProyecto.toLowerCase();
        return proyectos.filter(p => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)).slice(0, 8);
    }, [proyectos, buscarProyecto]);

    const viviendasFiltradas = useMemo(() => {
        if (!buscarVivienda.trim()) return viviendas.slice(0, 8);
        const q = buscarVivienda.toLowerCase();
        return viviendas.filter(v => v.codigo.toLowerCase().includes(q)).slice(0, 8);
    }, [viviendas, buscarVivienda]);

    const esSocial = proyecto?.categoria === 'social';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!proyecto) { toast.error('Seleccione un proyecto.'); return; }
        if (esSocial && !viviendaId) { toast.error('Seleccione una vivienda para el proyecto social.'); return; }
        if (!fechaInicio || !fechaFin) { toast.error('Indique las fechas de inicio y fin.'); return; }
        if (fechaFin < fechaInicio) { toast.error('La fecha de fin no puede ser anterior a la fecha de inicio.'); return; }
        if (conflicto) { toast.error('El activo tiene una asignación que se superpone con esas fechas.'); return; }

        const hoy = new Date().toISOString().split('T')[0];
        if (fechaInicio < hoy && !confirmaAdvertencia) {
            setAdvertencia(`La fecha de inicio (${fechaInicio}) es en el pasado. ¿Deseas continuar?`);
            return;
        }

        setSaving(true);
        setAdvertencia(null);
        try {
            const payload = {
                proyecto_id: proyecto.id,
                vivienda_id: esSocial ? viviendaId : null,
                fecha_inicio: fechaInicio,
                fecha_fin_estimada: fechaFin,
                horas_dia_estimadas: horasDia,
                notas: notas || null,
                forzar_pese_a_advertencia: confirmaAdvertencia,
            };
            const res = await asignacionActivoService.crear(activo.id, payload);
            toast.success('Asignación creada.');
            onCreado?.(res.data);
        } catch (err) {
            const errors = err?.response?.data?.errors;
            if (errors?.advertencia) {
                setAdvertencia(errors.advertencia[0]);
            } else {
                toast.error(err?.response?.data?.message || 'Error al crear la asignación.');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} className="max-w-2xl max-h-[90vh] flex flex-col" showCloseButton={true}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-violet-500 dark:text-violet-300" />
                    </div>
                    <div>
                        <h2 className="text-gray-800 dark:text-white font-semibold text-base">Nueva asignación</h2>
                        <p className="text-gray-500 dark:text-white/40 text-xs">{activo.codigo} — {activo.nombre}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Columna izquierda: proyecto + vivienda */}
                        <div className="space-y-4">
                            <div>
                                <h3 className={sectionTitleCls}>Proyecto</h3>
                                {proyecto ? (
                                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                                        <div>
                                            <p className="text-sm font-medium text-emerald-800 dark:text-white">{proyecto.nombre}</p>
                                            <p className="text-xs text-emerald-600 dark:text-white/40">{proyecto.codigo} · {proyecto.categoria === 'social' ? 'Social' : 'Privado'}</p>
                                        </div>
                                        <button type="button" onClick={() => { setProyecto(null); setBuscarProyecto(''); }}
                                            className="text-xs text-emerald-600 dark:text-white/40 hover:text-emerald-800 dark:hover:text-white transition-colors">Cambiar</button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        <InputField value={buscarProyecto} onChange={e => setBuscarProyecto(e.target.value)}
                                            placeholder="Buscar proyecto…" className="pl-9" />
                                        {proyectosFiltrados.length > 0 && (
                                            <div className="mt-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] shadow-xl overflow-hidden max-h-48 overflow-y-auto absolute z-10 w-full left-0">
                                                {proyectosFiltrados.map(p => (
                                                    <button key={p.id} type="button" onClick={() => { setProyecto(p); setBuscarProyecto(''); }}
                                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                        <p className="text-sm text-gray-800 dark:text-white">{p.nombre}</p>
                                                        <p className="text-xs text-gray-500 dark:text-white/40">{p.codigo} · {p.categoria === 'social' ? 'Social' : 'Privado'}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {esSocial && (
                                <div>
                                    <h3 className={sectionTitleCls}>Vivienda</h3>
                                    {viviendaId ? (
                                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                                            <p className="text-sm font-medium text-blue-800 dark:text-white">
                                                {viviendas.find(v => String(v.id) === String(viviendaId))?.codigo}
                                            </p>
                                            <button type="button" onClick={() => setViviendaId('')}
                                                className="text-xs text-blue-600 dark:text-white/40 hover:text-blue-800 dark:hover:text-white transition-colors">Cambiar</button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            <InputField value={buscarVivienda} onChange={e => setBuscarVivienda(e.target.value)}
                                                placeholder="Buscar por código de vivienda…" className="pl-9" />
                                            {viviendasFiltradas.length > 0 && (
                                                <div className="mt-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] shadow-xl overflow-hidden max-h-48 overflow-y-auto absolute z-10 w-full left-0">
                                                    {viviendasFiltradas.map(v => (
                                                        <button key={v.id} type="button" onClick={() => { setViviendaId(String(v.id)); setBuscarVivienda(''); }}
                                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm text-gray-800 dark:text-white">
                                                            {v.codigo}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Columna derecha: fechas */}
                        <div className="space-y-4">
                            <h3 className={sectionTitleCls}>Periodo</h3>
                            <div>
                                <Label>Fecha de inicio *</Label>
                                <InputField type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                            </div>
                            <div>
                                <Label>Fecha de fin estimada *</Label>
                                <InputField type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} min={fechaInicio || undefined} />
                            </div>
                            <div>
                                <Label>Horas estimadas por día</Label>
                                <InputField type="number" min="0.5" max="24" step="0.5" value={horasDia} onChange={e => setHorasDia(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {conflicto && (
                        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-800 dark:text-red-300">
                                El activo ya está asignado a <strong>{conflicto.proyecto}</strong> del {conflicto.fecha_inicio} al {conflicto.fecha_fin_estimada}. Elija otras fechas.
                            </p>
                        </div>
                    )}

                    {advertencia && (
                        <div className="px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 space-y-2">
                            <div className="flex items-start gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 dark:text-amber-300">{advertencia}</p>
                            </div>
                            <label className="flex items-center gap-2 pl-6.5 text-xs text-amber-800 dark:text-amber-300 cursor-pointer">
                                <input type="checkbox" checked={confirmaAdvertencia} onChange={e => setConfirmaAdvertencia(e.target.checked)}
                                    className="rounded border-amber-500/40 bg-transparent" />
                                Entiendo y quiero asignar de todas formas
                            </label>
                        </div>
                    )}

                    <div>
                        <Label>Notas</Label>
                        <TextArea rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas adicionales (opcional)" />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-end gap-3 shrink-0">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={saving || !!conflicto || (!!advertencia && !confirmaAdvertencia)} startIcon={<Check className="w-4 h-4" />}>
                        {saving ? 'Guardando…' : 'Crear asignación'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
