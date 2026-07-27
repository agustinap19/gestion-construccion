import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Check, Wrench } from '../../../components/icons/Icons';
import { activoService } from '../../../services/activoService';
import { almacenService } from '../../../services/almacenService';

const glassInput = (err) =>
    `w-full px-3 py-2 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/30
     focus:outline-none transition-all
     ${err ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-violet-400/60 focus:bg-white/10'}`;

const labelCls = 'block text-white/50 text-xs mb-1 font-medium';

const TIPOS = [
    { val: 'maquinaria',  label: 'Maquinaria' },
    { val: 'equipo',      label: 'Equipo' },
    { val: 'herramienta', label: 'Herramienta' },
    { val: 'vehiculo',    label: 'Vehículo' },
];

const EMPTY = {
    nombre: '', tipo: 'maquinaria', marca: '', modelo: '', serie: '',
    anio_fabricacion: '', costo_dia_uso: '', horas_mantenimiento_cada: '250',
    propiedad: 'propio', almacen_id: '', descripcion: '', notas: '',
};

export default function ActivoFormModal({ activo, onClose, onGuardado }) {
    const [form, setForm] = useState(activo ? {
        nombre:                   activo.nombre                   ?? '',
        tipo:                     activo.tipo                     ?? 'maquinaria',
        marca:                    activo.marca                    ?? '',
        modelo:                   activo.modelo                   ?? '',
        serie:                    activo.serie                    ?? '',
        anio_fabricacion:         activo.anio_fabricacion         ?? '',
        costo_dia_uso:            activo.costo_dia_uso            ?? '',
        horas_mantenimiento_cada: activo.horas_mantenimiento_cada ?? '250',
        propiedad:                activo.propiedad                ?? 'propio',
        almacen_id:               activo.almacen_id               ?? '',
        descripcion:              activo.descripcion              ?? '',
        notas:                    activo.notas                    ?? '',
    } : { ...EMPTY });

    const [almacenes, setAlmacenes] = useState([]);
    const [saving, setSaving]       = useState(false);
    const [errors, setErrors]       = useState({});

    useEffect(() => {
        almacenService.listar({ per_page: 100 })
            .then(r => setAlmacenes(r.data?.data ?? []))
            .catch(() => {});
    }, []);

    const set = (field, val) => {
        setForm(p => ({ ...p, [field]: val }));
        if (errors[field]) setErrors(p => ({ ...p, [field]: null }));
    };

    const validate = () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'El nombre es requerido.';
        if (!form.tipo) e.tipo = 'Seleccione un tipo.';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        const payload = { ...form };
        if (payload.almacen_id === '') payload.almacen_id = null;
        if (payload.anio_fabricacion === '') payload.anio_fabricacion = null;
        if (payload.costo_dia_uso === '') payload.costo_dia_uso = 0;

        setSaving(true);
        try {
            if (activo?.id) {
                await activoService.actualizar(activo.id, payload);
                toast.success('Activo actualizado correctamente.');
            } else {
                await activoService.crear(payload);
                toast.success('Activo creado correctamente.');
            }
            onGuardado();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.response?.data?.errors;
            if (typeof msg === 'object') {
                toast.error(Object.values(msg).flat()[0] || 'Error al guardar.');
            } else {
                toast.error(msg || 'Error al guardar.');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden
                    shadow-2xl shadow-black/50 backdrop-blur-2xl
                    bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/30 to-purple-500/20 border border-white/10 flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-violet-300" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-base">
                                {activo?.id ? 'Editar Activo' : 'Nuevo Activo'}
                            </h2>
                            <p className="text-white/40 text-xs">
                                {activo?.codigo ?? 'Código generado automáticamente'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">

                        {/* Tipo */}
                        <div className="grid grid-cols-4 gap-2">
                            {TIPOS.map(({ val, label }) => (
                                <button key={val} type="button" onClick={() => set('tipo', val)}
                                    className={`flex items-center justify-center py-2.5 rounded-xl border text-xs font-medium transition-all
                                        ${form.tipo === val
                                            ? 'bg-violet-500/20 border-violet-500/50 text-violet-200'
                                            : 'bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/[0.08]'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Datos principales */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className={labelCls}>Nombre *</label>
                                <input value={form.nombre}
                                    onChange={e => set('nombre', e.target.value)}
                                    placeholder="Ej: Excavadora CAT 320D"
                                    className={glassInput(errors.nombre)} />
                                {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Marca</label>
                                <input value={form.marca}
                                    onChange={e => set('marca', e.target.value)}
                                    className={glassInput(false)} />
                            </div>
                            <div>
                                <label className={labelCls}>Modelo</label>
                                <input value={form.modelo}
                                    onChange={e => set('modelo', e.target.value)}
                                    className={glassInput(false)} />
                            </div>
                            <div>
                                <label className={labelCls}>Serie</label>
                                <input value={form.serie}
                                    onChange={e => set('serie', e.target.value)}
                                    className={glassInput(false)} />
                            </div>
                            <div>
                                <label className={labelCls}>Año de fabricación</label>
                                <input type="number" value={form.anio_fabricacion}
                                    onChange={e => set('anio_fabricacion', e.target.value)}
                                    placeholder="2024"
                                    className={glassInput(false)} />
                            </div>
                        </div>

                        {/* Costo y mantenimiento */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Costo por día de uso (Bs.)</label>
                                <input type="number" step="0.01" min="0" value={form.costo_dia_uso}
                                    onChange={e => set('costo_dia_uso', e.target.value)}
                                    className={glassInput(false)} />
                            </div>
                            <div>
                                <label className={labelCls}>Horas entre mantenimientos</label>
                                <input type="number" step="0.01" min="0" value={form.horas_mantenimiento_cada}
                                    onChange={e => set('horas_mantenimiento_cada', e.target.value)}
                                    className={glassInput(false)} />
                            </div>
                        </div>

                        {/* Propiedad y almacén */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Propiedad</label>
                                <select value={form.propiedad}
                                    onChange={e => set('propiedad', e.target.value)}
                                    className={glassInput(false)}>
                                    <option value="propio">Propio</option>
                                    <option value="arrendado">Arrendado</option>
                                    <option value="en_comodato">En comodato</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Almacén / ubicación</label>
                                <select value={form.almacen_id}
                                    onChange={e => set('almacen_id', e.target.value)}
                                    className={glassInput(false)}>
                                    <option value="">Sin asignar</option>
                                    {almacenes.map(a => (
                                        <option key={a.id} value={a.id}>{a.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className={labelCls}>Descripción</label>
                            <textarea rows={2} value={form.descripcion}
                                onChange={e => set('descripcion', e.target.value)}
                                className={`${glassInput(false)} resize-none`} />
                        </div>

                        {/* Notas */}
                        <div>
                            <label className={labelCls}>Notas</label>
                            <textarea rows={2} value={form.notas}
                                onChange={e => set('notas', e.target.value)}
                                placeholder="Notas internas"
                                className={`${glassInput(false)} resize-none`} />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 transition-all">
                            {saving ? 'Guardando…' : <><Check className="w-4 h-4" /> {activo?.id ? 'Guardar cambios' : 'Crear activo'}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
