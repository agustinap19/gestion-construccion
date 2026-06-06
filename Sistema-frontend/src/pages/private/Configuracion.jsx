import React, { useState, useEffect, useCallback } from 'react';
import {
    Settings, Sun, Moon, Bell, Layers, Plus, Edit, Trash2,
    Upload, X, Check, AlertCircle, RefreshCw, FileText, ChevronDown, ChevronUp
} from '../../components/icons/Icons';
import Card from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';
import tipoViviendaService from '../../services/tipoViviendaService';
import api from '../../services/api';

/* ── Modal glass para crear / editar tipología ─────────────────────────── */
const ESTADO_LABELS = { activo: 'Activo', inactivo: 'Inactivo' };

const initialForm = { nombre: '', descripcion: '', estado: 'activo', plano_url: '' };

function ModalTipologia({ editando, onClose, onSaved }) {
    const [form, setForm] = useState(editando ? {
        nombre:      editando.nombre       ?? '',
        descripcion: editando.descripcion  ?? '',
        estado:      editando.estado       ?? 'activo',
        plano_url:   editando.plano_url    ?? '',
    } : { ...initialForm });
    const [planoFile, setPlanoFile] = useState(null);
    const [planoPreview, setPlanoPreview] = useState(editando?.plano_url ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [uploadingPlano, setUploadingPlano] = useState(false);

    const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

    const handlePlano = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setError('El plano no debe superar 5 MB.'); return; }
        setPlanoFile(file);
        if (file.type.startsWith('image/')) {
            setPlanoPreview(URL.createObjectURL(file));
        } else {
            setPlanoPreview('pdf');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
        setSaving(true); setError(null);
        try {
            let plano_url = form.plano_url;
            if (planoFile) {
                setUploadingPlano(true);
                plano_url = await tipoViviendaService.subirPlano(planoFile);
                setUploadingPlano(false);
            }
            const payload = { ...form, plano_url };
            if (editando) {
                await tipoViviendaService.update(editando.id, payload);
            } else {
                await tipoViviendaService.create(payload);
            }
            onSaved();
        } catch (err) {
            const msg = err?.response?.data?.message
                ?? err?.response?.data?.errors
                ?? err?.message
                ?? 'Error al guardar';
            setError(typeof msg === 'object' ? Object.values(msg).flat().join(' ') : msg);
        } finally {
            setSaving(false);
            setUploadingPlano(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white/10 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
                            <Layers size={18} />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                            {editando ? 'Editar tipología' : 'Nueva tipología'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Nombre */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Nombre <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.nombre}
                            onChange={e => set('nombre', e.target.value)}
                            placeholder="TIPO 1, TIPO 1-A, TIPO 2…"
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Descripción</label>
                        <textarea
                            value={form.descripcion}
                            onChange={e => set('descripcion', e.target.value)}
                            rows={3}
                            placeholder="Características generales de esta tipología…"
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all resize-none"
                        />
                    </div>

                    {/* Plano */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Plano (PDF o imagen, máx. 5 MB)
                        </label>
                        {planoPreview && planoPreview !== 'pdf' ? (
                            <div className="relative mb-2">
                                <img src={planoPreview} alt="Plano" className="w-full h-32 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                                <button type="button" onClick={() => { setPlanoPreview(''); setPlanoFile(null); set('plano_url', ''); }}
                                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors">
                                    <X size={12} />
                                </button>
                            </div>
                        ) : planoPreview === 'pdf' ? (
                            <div className="flex items-center gap-2 mb-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <FileText size={16} className="text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-300 flex-1 truncate">{planoFile?.name ?? 'plano.pdf'}</span>
                                <button type="button" onClick={() => { setPlanoPreview(''); setPlanoFile(null); set('plano_url', ''); }} className="text-slate-400 hover:text-red-400">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : null}
                        <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-violet-500 cursor-pointer transition-colors text-sm text-slate-500 dark:text-slate-400 hover:text-violet-500">
                            <Upload size={16} />
                            <span>{planoPreview ? 'Cambiar archivo' : 'Seleccionar archivo'}</span>
                            <input type="file" accept="image/*,application/pdf" onChange={handlePlano} className="hidden" />
                        </label>
                    </div>

                    {/* Estado */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Estado</span>
                        <button
                            type="button"
                            onClick={() => set('estado', form.estado === 'activo' ? 'inactivo' : 'activo')}
                            className={`w-11 h-6 rounded-full transition-colors relative ${form.estado === 'activo' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.estado === 'activo' ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                            {saving ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    {uploadingPlano ? 'Subiendo plano…' : 'Guardando…'}
                                </>
                            ) : (
                                <><Check size={14} /> {editando ? 'Actualizar' : 'Crear tipología'}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Dialog confirmar eliminación ──────────────────────────────────────── */
function ModalConfirmDelete({ tipologia, onConfirm, onClose, deleting }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                        <Trash2 size={20} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Eliminar tipología</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Esta acción no se puede deshacer</p>
                    </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
                    ¿Eliminar <strong className="text-slate-900 dark:text-white">{tipologia.nombre}</strong>?
                    Si hay beneficiarios con esta tipología la operación será rechazada.
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                        {deleting ? <><RefreshCw size={13} className="animate-spin" /> Eliminando…</> : 'Eliminar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Row de tipología ──────────────────────────────────────────────────── */
function FilaTipologia({ t, onEdit, onToggleEstado, onDelete }) {
    const activo = t.estado === 'activo';
    return (
        <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <td className="px-4 py-3">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">{t.nombre}</span>
            </td>
            <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{t.descripcion ?? '—'}</span>
            </td>
            <td className="px-4 py-3 hidden md:table-cell">
                {t.plano_url ? (
                    <a href={t.plano_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-violet-500 hover:text-violet-400 text-xs font-medium transition-colors">
                        <FileText size={14} /> Ver plano
                    </a>
                ) : (
                    <span className="text-xs text-slate-400">—</span>
                )}
            </td>
            <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {ESTADO_LABELS[t.estado] ?? t.estado}
                </span>
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onEdit(t)} title="Editar"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                        <Edit size={14} />
                    </button>
                    <button onClick={() => onToggleEstado(t)} title={activo ? 'Desactivar' : 'Activar'}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${activo ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}>
                        {activo ? <X size={14} /> : <Check size={14} />}
                    </button>
                    <button onClick={() => onDelete(t)} title="Eliminar"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

/* ── Página principal ──────────────────────────────────────────────────── */
const Configuracion = () => {
    const { theme, setTheme } = useTheme();
    const [notificacionesEnSistema, setNotificacionesEnSistema] = useState(true);

    /* tipologías */
    const [tipologias, setTipologias]       = useState([]);
    const [loadingTipos, setLoadingTipos]   = useState(true);
    const [errorTipos, setErrorTipos]       = useState(null);
    const [modalOpen, setModalOpen]         = useState(false);
    const [editando, setEditando]           = useState(null);
    const [deleteTarget, setDeleteTarget]   = useState(null);
    const [deleting, setDeleting]           = useState(false);

    /* plantillas checklist */
    const [plantillas, setPlantillas]               = useState([]);
    const [loadingPlantillas, setLoadingPlantillas] = useState(true);
    const [expandedPlantilla, setExpandedPlantilla] = useState(null);
    const [modalPlantilla, setModalPlantilla]       = useState(null); // null | 'nueva' | plantilla obj
    const [modalItem, setModalItem]                 = useState(null); // null | { plantillaId, item? }
    const [plantillaForm, setPlantillaForm]         = useState({ clave: '', nombre: '', tipo_obra: '', descripcion: '', es_predeterminada: false });
    const [itemForm, setItemForm]                   = useState({ nombre: '', ponderacion: '', descripcion: '' });
    const [savingPlantilla, setSavingPlantilla]     = useState(false);

    const fetchTipologias = useCallback(async () => {
        setLoadingTipos(true); setErrorTipos(null);
        try {
            const data = await tipoViviendaService.getAll();
            setTipologias(data);
        } catch {
            setErrorTipos('No se pudieron cargar las tipologías.');
        } finally {
            setLoadingTipos(false);
        }
    }, []);

    const fetchPlantillas = useCallback(async () => {
        setLoadingPlantillas(true);
        try {
            const res = await api.get('/plantillas-checklist');
            setPlantillas(res.data.data);
        } catch { /* silently fail */ }
        finally { setLoadingPlantillas(false); }
    }, []);

    const handleGuardarPlantilla = async () => {
        if (!plantillaForm.clave.trim() || !plantillaForm.nombre.trim()) return alert('Clave y nombre son obligatorios');
        setSavingPlantilla(true);
        try {
            if (modalPlantilla && modalPlantilla !== 'nueva') {
                await api.put(`/plantillas-checklist/${modalPlantilla.id}`, plantillaForm);
            } else {
                await api.post('/plantillas-checklist', plantillaForm);
            }
            setModalPlantilla(null);
            fetchPlantillas();
        } catch (e) { alert(e.response?.data?.message || 'Error al guardar'); }
        finally { setSavingPlantilla(false); }
    };

    const handleToggleActivoPlantilla = async (p) => {
        try {
            await api.patch(`/plantillas-checklist/${p.id}/toggle-activo`);
            fetchPlantillas();
        } catch (e) { alert(e.response?.data?.message || 'Error'); }
    };

    const handleEliminarPlantilla = async (p) => {
        if (!window.confirm(`¿Eliminar la plantilla "${p.nombre}"?`)) return;
        try {
            await api.delete(`/plantillas-checklist/${p.id}`);
            fetchPlantillas();
        } catch (e) { alert(e.response?.data?.message || 'No se puede eliminar'); }
    };

    const handleGuardarItem = async () => {
        if (!itemForm.nombre.trim()) return alert('El nombre del ítem es obligatorio');
        if (!itemForm.ponderacion || parseFloat(itemForm.ponderacion) <= 0) return alert('La ponderación debe ser mayor a 0');
        setSavingPlantilla(true);
        try {
            if (modalItem.item) {
                await api.put(`/plantillas-checklist/${modalItem.plantillaId}/items/${modalItem.item.id}`, itemForm);
            } else {
                await api.post(`/plantillas-checklist/${modalItem.plantillaId}/items`, itemForm);
            }
            setModalItem(null);
            fetchPlantillas();
        } catch (e) { alert(e.response?.data?.message || 'Error al guardar ítem'); }
        finally { setSavingPlantilla(false); }
    };

    const handleEliminarItem = async (plantillaId, itemId) => {
        if (!window.confirm('¿Eliminar este ítem?')) return;
        try {
            await api.delete(`/plantillas-checklist/${plantillaId}/items/${itemId}`);
            fetchPlantillas();
        } catch (e) { alert(e.response?.data?.message || 'Error'); }
    };

    const handleMoverItem = async (plantillaId, items, fromIdx, toIdx) => {
        const newOrder = [...items];
        const [moved] = newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, moved);
        try {
            await api.put(`/plantillas-checklist/${plantillaId}/reordenar`, { orden: newOrder.map(i => i.id) });
            fetchPlantillas();
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchTipologias(); fetchPlantillas(); }, [fetchTipologias, fetchPlantillas]);

    const handleEdit  = (t) => { setEditando(t); setModalOpen(true); };
    const handleNew   = ()  => { setEditando(null); setModalOpen(true); };
    const handleClose = ()  => { setModalOpen(false); setEditando(null); };
    const handleSaved = ()  => { handleClose(); fetchTipologias(); };

    const handleToggleEstado = async (t) => {
        const nuevo = t.estado === 'activo' ? 'inactivo' : 'activo';
        try {
            await tipoViviendaService.cambiarEstado(t.id, nuevo);
            fetchTipologias();
        } catch (err) {
            alert(err?.response?.data?.message ?? 'Error al cambiar estado');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await tipoViviendaService.destroy(deleteTarget.id);
            setDeleteTarget(null);
            fetchTipologias();
        } catch (err) {
            alert(err?.response?.data?.message ?? 'No se pudo eliminar la tipología.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
            {/* Modales */}
            {modalOpen && (
                <ModalTipologia editando={editando} onClose={handleClose} onSaved={handleSaved} />
            )}
            {deleteTarget && (
                <ModalConfirmDelete
                    tipologia={deleteTarget}
                    onConfirm={handleDeleteConfirm}
                    onClose={() => setDeleteTarget(null)}
                    deleting={deleting}
                />
            )}

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Settings size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración</h1>
                    <p className="text-slate-500 dark:text-slate-400">Personaliza la apariencia y el comportamiento del sistema</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Apariencia */}
                <Card title="Apariencia" subtitle="Gestiona el tema y visualización">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">Tema del Sistema</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'}`}
                                >
                                    <Sun size={24} className={theme === 'light' ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400'} />
                                    <span className={`mt-2 text-sm font-medium ${theme === 'light' ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`}>Claro</span>
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'}`}
                                >
                                    <Moon size={24} className={theme === 'dark' ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400'} />
                                    <span className={`mt-2 text-sm font-medium ${theme === 'dark' ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`}>Oscuro</span>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">Tamaño de Fuente (Próximamente)</label>
                            <div className="flex gap-3">
                                {['Pequeño', 'Normal', 'Grande'].map(size => (
                                    <button key={size} disabled className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed">
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Notificaciones */}
                <Card title="Notificaciones" subtitle="Preferencias de alertas">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <Bell size={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Notificaciones en sistema</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Mostrar panel y contadores</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setNotificacionesEnSistema(!notificacionesEnSistema)}
                                className={`w-11 h-6 rounded-full transition-colors relative ${notificacionesEnSistema ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notificacionesEnSistema ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between opacity-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <Bell size={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Sonidos</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Reproducir sonido al recibir</p>
                                </div>
                            </div>
                            <button disabled className="w-11 h-6 rounded-full bg-slate-300 dark:bg-slate-700 relative cursor-not-allowed">
                                <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white" />
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Atajos */}
                <Card title="Atajos de Teclado" subtitle="Acciones rápidas" className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { keys: ['Ctrl', 'K'], desc: 'Búsqueda global' },
                            { keys: ['Ctrl', 'B'], desc: 'Colapsar barra lateral' },
                            { keys: ['Ctrl', 'Shift', 'L'], desc: 'Cambiar tema' },
                            { keys: ['Ctrl', ','], desc: 'Abrir configuración' },
                            { keys: ['Esc'], desc: 'Cerrar modales/menús' },
                        ].map((atajo, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                                <span className="text-sm text-slate-600 dark:text-slate-300">{atajo.desc}</span>
                                <div className="flex gap-1">
                                    {atajo.keys.map(k => (
                                        <kbd key={k} className="px-2 py-1 text-xs font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm text-slate-600 dark:text-slate-300">
                                            {k}
                                        </kbd>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* ── Tipologías de Vivienda ──────────────────────────────── */}
                <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
                    {/* Card header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                                <Layers size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tipologías de Vivienda</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Catálogo de tipos de vivienda para los proyectos</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchTipologias} title="Recargar"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <RefreshCw size={15} className={loadingTipos ? 'animate-spin' : ''} />
                            </button>
                            <button onClick={handleNew}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors">
                                <Plus size={14} /> Nueva tipología
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    {loadingTipos ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                            <RefreshCw size={16} className="animate-spin" />
                            <span className="text-sm">Cargando tipologías…</span>
                        </div>
                    ) : errorTipos ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-red-400">
                            <AlertCircle size={16} />
                            <span className="text-sm">{errorTipos}</span>
                        </div>
                    ) : tipologias.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Layers size={24} className="opacity-40" />
                            </div>
                            <p className="text-sm">No hay tipologías registradas</p>
                            <button onClick={handleNew}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                                <Plus size={14} /> Crear primera tipología
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nombre</th>
                                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:table-cell">Descripción</th>
                                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden md:table-cell">Plano</th>
                                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</th>
                                        <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tipologias.map(t => (
                                        <FilaTipologia
                                            key={t.id}
                                            t={t}
                                            onEdit={handleEdit}
                                            onToggleEstado={handleToggleEstado}
                                            onDelete={setDeleteTarget}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>


                {/* ── Plantillas de Checklist ──────────────────────────────── */}
                <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <FileText size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Plantillas de Checklist</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Ítems de inspección con ponderaciones (suma = 100%)</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={fetchPlantillas} title="Recargar"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <RefreshCw size={15} className={loadingPlantillas ? 'animate-spin' : ''} />
                            </button>
                            <button onClick={() => { setPlantillaForm({ clave: '', nombre: '', tipo_obra: '', descripcion: '', es_predeterminada: false }); setModalPlantilla('nueva'); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors">
                                <Plus size={14} /> Nueva plantilla
                            </button>
                        </div>
                    </div>

                    {loadingPlantillas ? (
                        <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                            <RefreshCw size={16} className="animate-spin" /><span className="text-sm">Cargando plantillas…</span>
                        </div>
                    ) : plantillas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                            <FileText size={28} className="opacity-30" />
                            <p className="text-sm">No hay plantillas registradas</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {plantillas.map(p => {
                                const sumaPond = (p.items || []).reduce((s, i) => s + parseFloat(i.ponderacion || 0), 0);
                                const sumaOk = Math.abs(sumaPond - 100) < 0.5;
                                const isExpanded = expandedPlantilla === p.id;
                                return (
                                    <div key={p.id}>
                                        <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <button onClick={() => setExpandedPlantilla(isExpanded ? null : p.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{p.nombre}</span>
                                                    <span className="text-xs text-slate-400 font-mono">{p.clave}</span>
                                                    {p.es_predeterminada && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-violet-500/15 text-violet-600 dark:text-violet-400">Predeterminada</span>
                                                    )}
                                                    {!p.activo && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-500/15 text-slate-500">Inactiva</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="text-xs text-slate-500">{p.items?.length ?? 0} ítems</span>
                                                    <span className={`text-xs font-semibold ${sumaOk ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                        Σ {sumaPond.toFixed(1)}%{!sumaOk && ' ⚠'}
                                                    </span>
                                                    {p.tipo_obra && <span className="text-xs text-slate-400">{p.tipo_obra}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button onClick={() => handleToggleActivoPlantilla(p)}
                                                    className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${p.activo ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                                                    {p.activo ? 'Activa' : 'Inactiva'}
                                                </button>
                                                <button onClick={() => { setPlantillaForm({ clave: p.clave, nombre: p.nombre, tipo_obra: p.tipo_obra || '', descripcion: p.descripcion || '', es_predeterminada: p.es_predeterminada }); setModalPlantilla(p); }}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                                                    <Edit size={13} />
                                                </button>
                                                <button onClick={() => handleEliminarPlantilla(p)}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="bg-slate-50 dark:bg-slate-800/20 px-5 pb-3">
                                                <div className="flex items-center justify-between py-2">
                                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ítems</span>
                                                    <button onClick={() => { setItemForm({ nombre: '', ponderacion: '', descripcion: '' }); setModalItem({ plantillaId: p.id, item: null }); }}
                                                        className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                                                        <Plus size={11} /> Agregar ítem
                                                    </button>
                                                </div>
                                                {(p.items || []).length === 0 ? (
                                                    <p className="text-xs text-slate-400 py-2">Sin ítems — haz clic en "Agregar ítem"</p>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {(p.items || []).map((item, idx) => (
                                                            <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors group">
                                                                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {idx > 0 && <button onClick={() => handleMoverItem(p.id, p.items, idx, idx - 1)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                                                        <ChevronUp size={12} />
                                                                    </button>}
                                                                    {idx < p.items.length - 1 && <button onClick={() => handleMoverItem(p.id, p.items, idx, idx + 1)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                                                        <ChevronDown size={12} />
                                                                    </button>}
                                                                </div>
                                                                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{item.nombre}</span>
                                                                <span className="text-xs font-bold text-slate-500 w-14 text-right">{parseFloat(item.ponderacion).toFixed(1)}%</span>
                                                                <button onClick={() => { setItemForm({ nombre: item.nombre, ponderacion: item.ponderacion, descripcion: item.descripcion || '' }); setModalItem({ plantillaId: p.id, item }); }}
                                                                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all">
                                                                    <Edit size={11} />
                                                                </button>
                                                                <button onClick={() => handleEliminarItem(p.id, item.id)}
                                                                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
                                                                    <Trash2 size={11} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal nueva/editar plantilla ── */}
            {modalPlantilla && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {modalPlantilla === 'nueva' ? 'Nueva plantilla' : 'Editar plantilla'}
                            </h3>
                            <button onClick={() => setModalPlantilla(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"><X size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Clave *</label>
                                <input value={plantillaForm.clave} onChange={e => setPlantillaForm(f => ({ ...f, clave: e.target.value }))} placeholder="Ej: vivienda_social" className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre *</label>
                                <input value={plantillaForm.nombre} onChange={e => setPlantillaForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre descriptivo" className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de obra</label>
                                <input value={plantillaForm.tipo_obra} onChange={e => setPlantillaForm(f => ({ ...f, tipo_obra: e.target.value }))} placeholder="Ej: vivienda_social" className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label>
                                <textarea value={plantillaForm.descripcion} onChange={e => setPlantillaForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={plantillaForm.es_predeterminada} onChange={e => setPlantillaForm(f => ({ ...f, es_predeterminada: e.target.checked }))} className="rounded" />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Plantilla predeterminada</span>
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
                            <button onClick={() => setModalPlantilla(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">Cancelar</button>
                            <button onClick={handleGuardarPlantilla} disabled={savingPlantilla} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                                <Check size={14} />{savingPlantilla ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal nuevo/editar ítem ── */}
            {modalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{modalItem.item ? 'Editar ítem' : 'Nuevo ítem'}</h3>
                            <button onClick={() => setModalItem(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"><X size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre *</label>
                                <input value={itemForm.nombre} onChange={e => setItemForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Verificación de cimentación" className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ponderación (%) *</label>
                                <input type="number" min="0" max="100" step="0.5" value={itemForm.ponderacion} onChange={e => setItemForm(f => ({ ...f, ponderacion: e.target.value }))} placeholder="Ej: 20" className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label>
                                <textarea value={itemForm.descripcion} onChange={e => setItemForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
                            <button onClick={() => setModalItem(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">Cancelar</button>
                            <button onClick={handleGuardarItem} disabled={savingPlantilla} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                                <Check size={14} />{savingPlantilla ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Configuracion;
