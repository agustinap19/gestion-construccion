import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import competenciaService from '../../services/competenciaService';
import personalService from '../../services/personalService';

// Calcula semáforo: green=vigente, yellow=por_vencer (≤30d), red=vencida
const calcSemaforo = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const [y, m, d] = fechaVencimiento.split('-').map(Number);
    const vence = new Date(y, m - 1, d);
    const diffDays = Math.floor((vence - hoy) / 86400000);
    if (diffDays < 0) return { color: '#ef4444', label: 'Vencida', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' };
    if (diffDays <= 30) return { color: '#f59e0b', label: `Vence en ${diffDays}d`, bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' };
    return { color: '#10b981', label: 'Vigente', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' };
};

const CAMPO_CLS = [
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
    'bg-white border-slate-200 text-slate-900 dark:bg-slate-900/50 dark:border-slate-700/50 dark:text-slate-200',
    'border focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40',
].join(' ');

const CAMPO_ERR_CLS = [
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
    'bg-white dark:bg-slate-900/50 dark:text-slate-200',
    'ring-2 ring-red-500/40 border border-red-500/30',
].join(' ');

const AsignarCompetenciaModal = ({ personalId, competenciaId = null, pivotId = null, onClose, onSuccess }) => {
    const isEdit = !!pivotId;
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [catalogo, setCatalogo] = useState([]);
    const [errores, setErrores] = useState({});

    const [form, setForm] = useState({
        competencia_id:     competenciaId ? String(competenciaId) : '',
        fecha_emision:      new Date().toISOString().split('T')[0],
        fecha_vencimiento:  '',
        entidad_emisora:    '',
        numero_certificado: '',
        archivo_url:        '',
    });

    const competenciaSeleccionada = catalogo.find(c => String(c.id) === String(form.competencia_id));
    const semaforo = calcSemaforo(form.fecha_vencimiento);

    useEffect(() => {
        const init = async () => {
            try {
                setCargando(true);
                // Cargar catálogo
                const res = await competenciaService.listar({}, 200);
                const lista = res.data?.data ?? res.data ?? [];
                setCatalogo(lista);

                // Si es edición y tenemos pivotId, cargar datos del pivot desde competencias del personal
                if (isEdit && personalId && competenciaId) {
                    const compRes = await personalService.obtenerCompetencias(personalId);
                    const compData = compRes.data ?? [];
                    const registro = compData.find(c => c.id === Number(competenciaId));
                    if (registro?.pivot) {
                        setForm({
                            competencia_id:     String(registro.id),
                            fecha_emision:      registro.pivot.fecha_emision ?? '',
                            fecha_vencimiento:  registro.pivot.fecha_vencimiento ?? '',
                            entidad_emisora:    registro.pivot.entidad_emisora ?? '',
                            numero_certificado: registro.pivot.numero_certificado ?? '',
                            archivo_url:        registro.pivot.archivo_url ?? '',
                        });
                    }
                }
            } catch {
                toast.error('Error al cargar datos');
                onClose();
            } finally {
                setCargando(false);
            }
        };
        init();
    }, [personalId, competenciaId, isEdit, onClose]);

    // Si la competencia no requiere renovación, limpiar fecha_vencimiento
    useEffect(() => {
        if (competenciaSeleccionada && !competenciaSeleccionada.requiere_renovacion) {
            setForm(p => ({ ...p, fecha_vencimiento: '' }));
        }
    }, [form.competencia_id, competenciaSeleccionada]);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const validar = () => {
        const e = {};
        if (!form.competencia_id) e.competencia_id = 'Selecciona una competencia';
        if (!form.fecha_emision) e.fecha_emision = 'Obligatoria';
        if (competenciaSeleccionada?.requiere_renovacion && !form.fecha_vencimiento) e.fecha_vencimiento = 'Obligatoria para esta competencia';
        if (form.fecha_vencimiento && form.fecha_vencimiento <= form.fecha_emision) e.fecha_vencimiento = 'Debe ser posterior a la emisión';
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const handleGuardar = async () => {
        if (!validar()) return;
        try {
            setGuardando(true);
            const datos = {
                competencia_id:     Number(form.competencia_id),
                fecha_emision:      form.fecha_emision,
                fecha_vencimiento:  form.fecha_vencimiento || null,
                entidad_emisora:    form.entidad_emisora.trim() || null,
                numero_certificado: form.numero_certificado.trim() || null,
                archivo_url:        form.archivo_url.trim() || null,
            };

            if (isEdit) {
                // El pivotId es el ID de la fila en personal_competencia
                await personalService.actualizarCompetencia(personalId, pivotId, datos);
                toast.success('Competencia actualizada');
            } else {
                await personalService.asignarCompetencia(personalId, datos);
                toast.success('Competencia asignada');
            }
            onSuccess();
            onClose();
        } catch (e) {
            const data = e.response?.data;
            if (data?.errors) setErrores(data.errors);
            else toast.error(data?.message ?? 'Error al guardar');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={isEdit ? 'Editar Competencia Asignada' : 'Asignar Competencia'}
            size="md"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button>
                    <Button onClick={handleGuardar} loading={guardando}>
                        {isEdit ? 'Guardar cambios' : 'Asignar'}
                    </Button>
                </>
            }>
            {cargando ? (
                <div className="py-10 flex justify-center">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Competencia */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                            Competencia / Certificación <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.competencia_id}
                            onChange={e => set('competencia_id', e.target.value)}
                            disabled={isEdit}
                            className={errores.competencia_id ? CAMPO_ERR_CLS : CAMPO_CLS + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
                            <option value="">Selecciona una competencia…</option>
                            {catalogo.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre} — {c.tipo.replace('_', ' ')}
                                    {c.requiere_renovacion ? ` (${c.vigencia_meses}m)` : ' (permanente)'}
                                </option>
                            ))}
                        </select>
                        {errores.competencia_id && <p className="text-xs text-red-400 mt-1">{errores.competencia_id}</p>}
                    </div>

                    {/* Info competencia seleccionada */}
                    {competenciaSeleccionada && (
                        <div className="p-3 rounded-xl text-xs"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <p className="text-slate-400">{competenciaSeleccionada.descripcion || 'Sin descripción'}</p>
                            <p className="mt-1.5 font-semibold" style={{ color: competenciaSeleccionada.requiere_renovacion ? '#f59e0b' : '#10b981' }}>
                                {competenciaSeleccionada.requiere_renovacion
                                    ? `Requiere renovación cada ${competenciaSeleccionada.vigencia_meses} meses`
                                    : 'Permanente — no requiere renovación'}
                            </p>
                        </div>
                    )}

                    {/* Fechas */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                                Fecha emisión <span className="text-red-500">*</span>
                            </label>
                            <input type="date" value={form.fecha_emision}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={e => set('fecha_emision', e.target.value)}
                                className={errores.fecha_emision ? CAMPO_ERR_CLS : CAMPO_CLS} />
                            {errores.fecha_emision && <p className="text-xs text-red-400 mt-1">{errores.fecha_emision}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                                Fecha vencimiento
                                {competenciaSeleccionada?.requiere_renovacion && <span className="text-red-500 ml-0.5">*</span>}
                            </label>
                            <input type="date" value={form.fecha_vencimiento}
                                disabled={!competenciaSeleccionada?.requiere_renovacion}
                                onChange={e => set('fecha_vencimiento', e.target.value)}
                                className={(errores.fecha_vencimiento ? CAMPO_ERR_CLS : CAMPO_CLS) + ' disabled:opacity-40 disabled:cursor-not-allowed'} />
                            {errores.fecha_vencimiento && <p className="text-xs text-red-400 mt-1">{errores.fecha_vencimiento}</p>}
                        </div>
                    </div>

                    {/* Semáforo de vencimiento */}
                    {semaforo && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                            style={{ background: semaforo.bg, border: `1px solid ${semaforo.border}`, color: semaforo.color }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: semaforo.color }} />
                            {semaforo.label}
                        </div>
                    )}

                    {/* Entidad emisora */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Entidad emisora</label>
                        <input value={form.entidad_emisora} onChange={e => set('entidad_emisora', e.target.value)}
                            placeholder="Ej: Universidad, Instituto, SIB…" className={CAMPO_CLS} />
                    </div>

                    {/* Número certificado */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Número de certificado</label>
                        <input value={form.numero_certificado} onChange={e => set('numero_certificado', e.target.value)}
                            placeholder="Nro. matrícula o registro…" className={CAMPO_CLS} />
                    </div>

                    {/* URL documento */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">URL del documento</label>
                        <input type="url" value={form.archivo_url} onChange={e => set('archivo_url', e.target.value)}
                            placeholder="https://drive.google.com/…" className={CAMPO_CLS} />
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default AsignarCompetenciaModal;
