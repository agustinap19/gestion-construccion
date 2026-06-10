import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { X, Check, Building2, User, Plus } from '../../../components/icons/Icons';
import { proveedorService } from '../../../services/proveedorService';

const glassInput = (err) =>
    `w-full px-3 py-2 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/30
     focus:outline-none transition-all
     ${err ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-violet-400/60 focus:bg-white/10'}`;

const labelCls = 'block text-white/50 text-xs mb-1 font-medium';

const EMPTY = {
    razon_social: '', nit: '', tipo: 'empresa',
    categoria_id: '', contacto_nombre: '', contacto_telefono: '',
    contacto_email: '', telefono_principal: '', direccion: '', zona_id: '',
    productos_servicios: '', observaciones: '',
};

// ── Mini-formulario inline para crear una categoría nueva ──────────────────────
function NuevaCategoriaInline({ onCreada }) {
    const [open, setOpen]     = useState(false);
    const [nombre, setNombre] = useState('');
    const [saving, setSaving] = useState(false);
    const inputRef            = useRef(null);

    useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

    const guardar = async () => {
        if (!nombre.trim()) return;
        setSaving(true);
        try {
            const res = await proveedorService.crearCategoria(nombre.trim());
            toast.success(`Categoría "${nombre.trim()}" creada.`);
            onCreada(res.data);
            setNombre('');
            setOpen(false);
        } catch (err) {
            const msg = err?.response?.data?.message || 'Error al crear categoría.';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)}
                className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-xs font-medium transition-colors">
                <Plus className="w-3 h-3" /> Añadir categoría
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <input
                ref={inputRef}
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardar(); } if (e.key === 'Escape') setOpen(false); }}
                placeholder="Nombre de la categoría"
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-violet-500/40 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-400"
            />
            <button type="button" onClick={guardar} disabled={saving || !nombre.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs hover:bg-violet-500/30 disabled:opacity-40 transition-all">
                {saving ? '…' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setOpen(false)}
                className="px-2 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs hover:text-white/70 transition-all">
                ✕
            </button>
        </div>
    );
}

// ── Modal principal ────────────────────────────────────────────────────────────
export default function ProveedorFormModal({ proveedor, onClose, onGuardado }) {
    const [form, setForm] = useState(proveedor ? {
        razon_social:       proveedor.razon_social       ?? '',
        nit:                proveedor.nit                ?? '',
        tipo:               proveedor.tipo               ?? 'empresa',
        categoria_id:       proveedor.categoria_id       ?? '',
        contacto_nombre:    proveedor.contacto_nombre    ?? '',
        contacto_telefono:  proveedor.contacto_telefono  ?? '',
        contacto_email:     proveedor.contacto_email     ?? proveedor.email_oficial ?? '',
        telefono_principal: proveedor.telefono_principal ?? '',
        direccion:          proveedor.direccion          ?? '',
        zona_id:            proveedor.zona_id            ?? '',
        productos_servicios:proveedor.productos_servicios ?? '',
        observaciones:      proveedor.observaciones      ?? '',
    } : { ...EMPTY });

    const [categorias, setCategorias] = useState([]);
    const [zonas, setZonas]           = useState([]);
    const [saving, setSaving]         = useState(false);
    const [errors, setErrors]         = useState({});

    useEffect(() => {
        proveedorService.categorias().then(r => setCategorias(r.data || [])).catch(() => {});
        proveedorService.zonas().then(r => setZonas(r.data || [])).catch(() => {});
    }, []);

    const set = (field, val) => {
        setForm(p => ({ ...p, [field]: val }));
        if (errors[field]) setErrors(p => ({ ...p, [field]: null }));
    };

    const validate = () => {
        const e = {};
        if (!form.razon_social.trim())
            e.razon_social = 'La razón social es requerida.';
        if (!form.tipo)
            e.tipo = 'Seleccione un tipo.';
        if (form.contacto_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contacto_email))
            e.contacto_email = 'Formato de email inválido.';
        if (form.nit && form.nit.trim().length < 4)
            e.nit = 'El NIT/CI debe tener al menos 4 caracteres.';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        const payload = { ...form };
        if (payload.categoria_id === '') payload.categoria_id = null;
        if (payload.zona_id === '')       payload.zona_id       = null;

        setSaving(true);
        try {
            if (proveedor?.id) {
                await proveedorService.actualizar(proveedor.id, payload);
                toast.success('Proveedor actualizado correctamente.');
            } else {
                await proveedorService.crear(payload);
                toast.success('Proveedor creado correctamente.');
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
                            {form.tipo === 'empresa'
                                ? <Building2 className="w-5 h-5 text-violet-300" />
                                : <User className="w-5 h-5 text-violet-300" />}
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-base">
                                {proveedor?.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h2>
                            <p className="text-white/40 text-xs">
                                {proveedor?.codigo ?? 'Código generado automáticamente'}
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
                        <div className="flex gap-2">
                            {[
                                { val: 'empresa',        label: 'Empresa',         icon: Building2 },
                                { val: 'persona_natural', label: 'Persona Natural', icon: User      },
                            ].map(({ val, label, icon: Icon }) => (
                                <button key={val} type="button" onClick={() => set('tipo', val)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all
                                        ${form.tipo === val
                                            ? 'bg-violet-500/20 border-violet-500/50 text-violet-200'
                                            : 'bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/[0.08]'}`}>
                                    <Icon className="w-4 h-4" /> {label}
                                </button>
                            ))}
                        </div>

                        {/* Datos principales */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className={labelCls}>Razón Social / Nombre *</label>
                                <input value={form.razon_social}
                                    onChange={e => set('razon_social', e.target.value)}
                                    placeholder="Nombre completo o razón social"
                                    className={glassInput(errors.razon_social)} />
                                {errors.razon_social && <p className="text-red-400 text-xs mt-1">{errors.razon_social}</p>}
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}>NIT / CI</label>
                                <input value={form.nit}
                                    onChange={e => set('nit', e.target.value)}
                                    placeholder="Número de identificación tributaria"
                                    className={glassInput(errors.nit)} />
                                {errors.nit && <p className="text-red-400 text-xs mt-1">{errors.nit}</p>}
                            </div>
                        </div>

                        {/* Categoría y Zona */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-white/50 text-xs font-medium">Categoría</label>
                                    <NuevaCategoriaInline
                                        onCreada={cat => {
                                            setCategorias(prev => [...prev, cat].sort((a, b) => a.nombre.localeCompare(b.nombre)));
                                            set('categoria_id', String(cat.id));
                                        }}
                                    />
                                </div>
                                <select value={form.categoria_id}
                                    onChange={e => set('categoria_id', e.target.value)}
                                    className={glassInput(false)}>
                                    <option value="">Sin categoría</option>
                                    {categorias.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Zona Geográfica</label>
                                <select value={form.zona_id}
                                    onChange={e => set('zona_id', e.target.value)}
                                    className={glassInput(false)}>
                                    <option value="">Sin zona</option>
                                    {zonas.map(z => (
                                        <option key={z.id} value={z.id}>{z.nombre} — {z.departamento}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Contacto */}
                        <div>
                            <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Contacto</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Nombre de contacto</label>
                                    <input value={form.contacto_nombre}
                                        onChange={e => set('contacto_nombre', e.target.value)}
                                        placeholder="Persona de contacto"
                                        className={glassInput(false)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Teléfono principal</label>
                                    <input value={form.telefono_principal}
                                        onChange={e => set('telefono_principal', e.target.value)}
                                        placeholder="+591 7XXXXXXX"
                                        className={glassInput(false)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Teléfono contacto</label>
                                    <input value={form.contacto_telefono}
                                        onChange={e => set('contacto_telefono', e.target.value)}
                                        placeholder="+591 7XXXXXXX"
                                        className={glassInput(false)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Email</label>
                                    <input type="email" value={form.contacto_email}
                                        onChange={e => set('contacto_email', e.target.value)}
                                        placeholder="correo@proveedor.com"
                                        className={glassInput(errors.contacto_email)} />
                                    {errors.contacto_email && <p className="text-red-400 text-xs mt-1">{errors.contacto_email}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Dirección */}
                        <div>
                            <label className={labelCls}>Dirección</label>
                            <input value={form.direccion}
                                onChange={e => set('direccion', e.target.value)}
                                placeholder="Dirección física del proveedor"
                                className={glassInput(false)} />
                        </div>

                        {/* Productos/servicios */}
                        <div>
                            <label className={labelCls}>Productos / Servicios que ofrece</label>
                            <textarea rows={2} value={form.productos_servicios}
                                onChange={e => set('productos_servicios', e.target.value)}
                                placeholder="Descripción de materiales o servicios que provee"
                                className={`${glassInput(false)} resize-none`} />
                        </div>

                        {/* Observaciones */}
                        <div>
                            <label className={labelCls}>Observaciones</label>
                            <textarea rows={2} value={form.observaciones}
                                onChange={e => set('observaciones', e.target.value)}
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
                            {saving ? 'Guardando…' : <><Check className="w-4 h-4" /> {proveedor?.id ? 'Guardar cambios' : 'Crear proveedor'}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
