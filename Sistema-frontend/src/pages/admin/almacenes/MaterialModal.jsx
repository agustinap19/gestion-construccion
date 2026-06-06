import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoading } from '../../../context/LoadingContext';
import { materialService } from '../../../services/materialService';
import proyectoService from '../../../services/proyectoService';
import { Camera, X, Package, Check, Upload } from '../../../components/icons/Icons';

const MAX_NOMBRE  = 50;
const MAX_MARCA   = 40;
const MAX_UNIDAD  = 20;
const MAX_DESC    = 60;

const ESTADOS_ACTIVOS = ['formulacion', 'licitacion', 'adjudicado', 'en_ejecucion', 'pausado'];

const emptyForm = {
    nombre: '',
    descripcion: '',
    categoria_id: '',
    unidad_medida_id: '',
    nueva_unidad: '',
    precio_referencial: '',
    stock_minimo: '0',
    marca: '',
    tipo: 'maestro',
    proyecto_id: '',
};

/* ──────────────── helpers ──────────────── */

const CharCount = ({ value, max }) => {
    const len  = (value || '').length;
    const over = len > max;
    const near = !over && len > max * 0.8;
    return (
        <span className={`text-[10px] font-mono tabular-nums ${over ? 'text-red-500 font-bold' : near ? 'text-amber-500' : 'text-slate-400'}`}>
            {len}/{max}
        </span>
    );
};

const FieldError = ({ msg }) =>
    msg ? (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <span className="shrink-0">⚠</span>{msg}
        </p>
    ) : null;

/* bloquea - y e en inputs numéricos */
const blockNegativeKeys = (e) => {
    if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault();
};

/* ──────────────── validador por campo ──────────────── */
const validateField = (name, value, state) => {
    switch (name) {
        case 'nombre':
            if (!value || !value.trim()) return 'El nombre es requerido';
            if (value.length > MAX_NOMBRE) return `Máximo ${MAX_NOMBRE} caracteres`;
            return null;
        case 'categoria_id':
            if (!value) return 'Seleccione una categoría';
            return null;
        case 'marca':
            if (value && value.length > MAX_MARCA) return `Máximo ${MAX_MARCA} caracteres`;
            return null;
        case 'descripcion':
            if (value && value.length > MAX_DESC) return `Máximo ${MAX_DESC} caracteres`;
            return null;
        case 'nueva_unidad':
            if (state.isNuevaUnidad) {
                if (!value || !value.trim()) return 'Ingrese el nombre de la nueva unidad';
                if (value.length > MAX_UNIDAD) return `Máximo ${MAX_UNIDAD} caracteres`;
            }
            return null;
        case 'unidad_medida_id':
            if (!state.isNuevaUnidad && !value) return 'Seleccione una unidad de medida';
            return null;
        case 'precio_referencial':
            if (value !== '' && value !== null && value !== undefined) {
                const num = Number(value);
                if (isNaN(num) || num < 0) return 'Debe ser un número positivo';
                if (num === 0) return 'El precio debe ser mayor a cero';
            }
            return null;
        case 'stock_minimo':
            if (value !== '' && value !== null && value !== undefined) {
                const num = Number(value);
                if (isNaN(num) || num < 0) return 'Debe ser un número positivo';
            }
            return null;
        case 'proyecto_id':
            if (state.tipo === 'especial' && !value) return 'Seleccione el proyecto al que pertenece';
            return null;
        default:
            return null;
    }
};

/* ──────────────── component ──────────────── */
const MaterialModal = ({ isOpen, onClose, material, onSaved, categorias }) => {
    const { startLoading, stopLoading } = useLoading();
    const [unidades,   setUnidades]   = useState([]);
    const [proyectos,  setProyectos]  = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [errors,     setErrors]     = useState({});
    const [touched,    setTouched]    = useState({});
    const [isDragging, setIsDragging] = useState(false);
    const [isNuevaUnidad, setIsNuevaUnidad] = useState(false);

    const [formData,      setFormData]      = useState(emptyForm);
    const [imagenFile,    setImagenFile]    = useState(null);
    const [imagenPreview, setImagenPreview] = useState(null);

    const fileInputRef = useRef(null);
    const isEdit = !!material;

    /* ── init on open ── */
    useEffect(() => {
        if (!isOpen) return;
        loadData();
        if (material) {
            setFormData({
                nombre:             material.nombre             || '',
                descripcion:        material.descripcion        || '',
                categoria_id:       material.categoria_id       || '',
                unidad_medida_id:   material.unidad_medida_id   || '',
                nueva_unidad:       '',
                precio_referencial: material.precio_referencial || '',
                stock_minimo:       material.stock_minimo ?? '0',
                marca:              material.marca              || '',
                tipo:               material.tipo               || 'maestro',
                proyecto_id:        material.proyecto_id        || '',
            });
            setImagenPreview(material.imagen_url || null);
        } else {
            setFormData({ ...emptyForm, categoria_id: categorias[0]?.id || '' });
            setImagenPreview(null);
        }
        setImagenFile(null);
        setIsNuevaUnidad(false);
        setErrors({});
        setTouched({});
        setIsDragging(false);
    }, [isOpen, material]);

    /* ── keyboard / scroll lock ── */
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    /* ── load units + active projects ── */
    const loadData = async () => {
        try {
            const [uniRes, proyRes] = await Promise.all([
                materialService.getUnidadesMedida(),
                proyectoService.listarSimples(),
            ]);
            if (uniRes.status === 'success') {
                setUnidades(uniRes.data);
                if (!material && uniRes.data.length > 0) {
                    setFormData(prev => ({ ...prev, unidad_medida_id: uniRes.data[0].id }));
                }
            }
            const lista = Array.isArray(proyRes) ? proyRes : [];
            setProyectos(lista.filter(p => ESTADOS_ACTIVOS.includes(p.estado)));
        } catch (err) {
            console.error('loadData error:', err);
        }
    };

    /* ── image handling ── */
    const processImage = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('El archivo debe ser una imagen'); return; }
        if (file.size > 5 * 1024 * 1024)    { toast.error('La imagen no debe superar 5MB');  return; }
        setImagenFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagenPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleImageChange = (e) => processImage(e.target.files[0]);
    const handleDragOver    = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave   = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop        = (e) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragging(false);
        processImage(e.dataTransfer.files[0]);
    };

    /* ── field change con validación en tiempo real ── */
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            // Validar solo si el campo ya fue tocado
            if (touched[name]) {
                const err = validateField(name, value, { isNuevaUnidad, tipo: next.tipo });
                setErrors(errs => ({ ...errs, [name]: err }));
            }
            return next;
        });
    }, [touched, isNuevaUnidad]);

    /* ── blur → marcar tocado + validar ── */
    const handleBlur = useCallback((e) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        const err = validateField(name, value, { isNuevaUnidad, tipo: formData.tipo });
        setErrors(prev => ({ ...prev, [name]: err }));
    }, [isNuevaUnidad, formData.tipo]);

    /* ── número positivo: bloquear negativos en tiempo real ── */
    const handlePositiveNumberChange = useCallback((e) => {
        const { name, value } = e.target;
        // Si el valor empieza con '-' o es negativo, no lo aceptamos
        if (value !== '' && Number(value) < 0) return;
        handleChange(e);
    }, [handleChange]);

    /* ── validar todos los campos para submit ── */
    const validateAll = () => {
        const fields = [
            'nombre', 'categoria_id', 'marca', 'descripcion',
            isNuevaUnidad ? 'nueva_unidad' : 'unidad_medida_id',
            'precio_referencial', 'stock_minimo', 'proyecto_id',
        ];
        const errs = {};
        fields.forEach(name => {
            const val = formData[name];
            const err = validateField(name, val, { isNuevaUnidad, tipo: formData.tipo });
            if (err) errs[name] = err;
        });
        return errs;
    };

    /* ── submit ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Marcar todo como tocado y validar
        const allFields = ['nombre', 'categoria_id', 'marca', 'descripcion', 'nueva_unidad', 'unidad_medida_id', 'precio_referencial', 'stock_minimo', 'proyecto_id'];
        setTouched(Object.fromEntries(allFields.map(f => [f, true])));
        const errs = validateAll();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setSubmitting(true);
        startLoading();
        try {
            let imageUrl = material?.imagen_url || null;
            if (imagenFile) {
                const resFoto = await materialService.uploadFoto(imagenFile);
                if (resFoto.status === 'success') imageUrl = resFoto.url;
            }

            const dataToSend = { ...formData, imagen_url: imageUrl };
            if (!isNuevaUnidad) delete dataToSend.nueva_unidad;
            else delete dataToSend.unidad_medida_id;
            if (dataToSend.tipo === 'maestro') delete dataToSend.proyecto_id;
            Object.keys(dataToSend).forEach(k => { if (dataToSend[k] === '') delete dataToSend[k]; });

            if (isEdit) {
                await materialService.update(material.id, dataToSend);
                toast.success('Material actualizado exitosamente');
            } else {
                await materialService.create(dataToSend);
                toast.success('Material creado exitosamente');
            }
            onSaved();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al guardar el material');
        } finally {
            setSubmitting(false);
            stopLoading();
        }
    };

    /* ── helpers de clase ── */
    const inputCls = (field, extra = '') =>
        `w-full bg-slate-50 dark:bg-[#0f1523] border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
            errors[field] && touched[field]
                ? 'border-red-400 dark:border-red-500/70 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                : 'border-slate-200 dark:border-white/5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
        } ${extra}`;

    const showErr = (field) => errors[field] && touched[field];

    /* ────────────────────────── RENDER ────────────────────────── */
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#080c15] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-white/10 overflow-hidden"
                    >
                        {/* ── Header ── */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {isEdit ? 'Editar Material' : 'Nuevo Material'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {isEdit ? 'Modifica los datos del material' : 'Completa los datos para agregar al catálogo'}
                                </p>
                            </div>
                            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* ── Body ── */}
                        <div className="overflow-y-auto flex-1">
                            <form id="material-form" onSubmit={handleSubmit} className="p-6 space-y-5">

                                {/* === Bloque 1: Foto + Nombre + Categoría + Marca === */}
                                <div className="flex flex-col sm:flex-row gap-5">

                                    {/* Zona foto / drag-drop */}
                                    <div className="shrink-0 flex flex-col items-center gap-2">
                                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`w-28 h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 relative overflow-hidden group select-none
                                                ${isDragging
                                                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 scale-[1.04] shadow-lg shadow-emerald-500/20'
                                                    : imagenPreview
                                                        ? 'border-slate-200 dark:border-white/15 bg-transparent'
                                                        : 'border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#0f1523] hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5'
                                                }`}
                                        >
                                            {imagenPreview ? (
                                                <>
                                                    <img
                                                        src={imagenPreview}
                                                        alt="preview"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
                                                        <Camera className="text-white" size={20} />
                                                        <span className="text-white text-[9px] font-semibold tracking-wide uppercase">Cambiar</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1.5 text-center px-2 pointer-events-none">
                                                    {isDragging
                                                        ? <Upload size={26} className="text-emerald-500" />
                                                        : <Package size={26} className="text-slate-300 dark:text-slate-600" />
                                                    }
                                                    <span className="text-[9px] text-slate-400 leading-tight">
                                                        {isDragging ? 'Soltar aquí' : 'Clic o arrastra'}
                                                    </span>
                                                    <span className="text-[9px] text-slate-300 dark:text-slate-600">máx. 5MB</span>
                                                </div>
                                            )}
                                        </div>
                                        {imagenPreview && (
                                            <button type="button" onClick={() => { setImagenFile(null); setImagenPreview(null); }} className="text-[11px] text-red-500 hover:text-red-600 font-medium transition-colors">
                                                Quitar foto
                                            </button>
                                        )}
                                        <p className="text-[9px] text-slate-400 text-center leading-tight">JPG, PNG, WEBP</p>
                                    </div>

                                    {/* Campos básicos */}
                                    <div className="flex-1 space-y-3">
                                        {/* Nombre */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-semibold text-slate-500">
                                                    Nombre del material <span className="text-red-500">*</span>
                                                </label>
                                                <CharCount value={formData.nombre} max={MAX_NOMBRE} />
                                            </div>
                                            <input
                                                type="text" name="nombre"
                                                value={formData.nombre}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                maxLength={MAX_NOMBRE}
                                                placeholder="Ej. Cemento Portland IP-30"
                                                className={inputCls('nombre')}
                                            />
                                            {showErr('nombre') && <FieldError msg={errors.nombre} />}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Categoría */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">
                                                    Categoría <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    name="categoria_id"
                                                    value={formData.categoria_id}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    className={inputCls('categoria_id')}
                                                >
                                                    <option value="">Seleccione...</option>
                                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                                </select>
                                                {showErr('categoria_id') && <FieldError msg={errors.categoria_id} />}
                                            </div>

                                            {/* Marca */}
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-xs font-semibold text-slate-500">Marca / Fabricante</label>
                                                    <CharCount value={formData.marca} max={MAX_MARCA} />
                                                </div>
                                                <input
                                                    type="text" name="marca"
                                                    value={formData.marca}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    maxLength={MAX_MARCA}
                                                    placeholder="Ej. Soboce, Tigre..."
                                                    className={inputCls('marca')}
                                                />
                                                {showErr('marca') && <FieldError msg={errors.marca} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* === Bloque 2: Detalles === */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.025] border border-slate-100 dark:border-white/5">

                                    {/* ---- Columna izquierda ---- */}
                                    <div className="space-y-4">

                                        {/* Unidad de medida */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-semibold text-slate-500">
                                                    Unidad de Medida <span className="text-red-500">*</span>
                                                </label>
                                                <button type="button"
                                                    onClick={() => {
                                                        setIsNuevaUnidad(v => !v);
                                                        setErrors(p => ({ ...p, unidad_medida_id: null, nueva_unidad: null }));
                                                        setTouched(p => ({ ...p, unidad_medida_id: false, nueva_unidad: false }));
                                                    }}
                                                    className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider hover:text-emerald-700 transition-colors"
                                                >
                                                    {isNuevaUnidad ? '← Seleccionar existente' : '+ Nueva Unidad'}
                                                </button>
                                            </div>

                                            {isNuevaUnidad ? (
                                                <div>
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Nueva unidad</span>
                                                        <CharCount value={formData.nueva_unidad} max={MAX_UNIDAD} />
                                                    </div>
                                                    <input
                                                        type="text" name="nueva_unidad"
                                                        value={formData.nueva_unidad}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        maxLength={MAX_UNIDAD}
                                                        placeholder="Ej. Bolsa 50kg"
                                                        className={`w-full bg-white dark:bg-[#0f1523] border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                                                            showErr('nueva_unidad')
                                                                ? 'border-red-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                                                                : 'border-emerald-400/60 dark:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                                                        }`}
                                                    />
                                                    {showErr('nueva_unidad') && <FieldError msg={errors.nueva_unidad} />}
                                                </div>
                                            ) : (
                                                <div>
                                                    <select
                                                        name="unidad_medida_id"
                                                        value={formData.unidad_medida_id}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        className={`w-full bg-white dark:bg-[#0f1523] border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                                                            showErr('unidad_medida_id')
                                                                ? 'border-red-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                                                                : 'border-slate-200 dark:border-white/5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                                                        }`}
                                                    >
                                                        <option value="">Seleccione...</option>
                                                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.simbolo})</option>)}
                                                    </select>
                                                    {showErr('unidad_medida_id') && <FieldError msg={errors.unidad_medida_id} />}
                                                </div>
                                            )}
                                        </div>

                                        {/* Precio referencial — positivo > 0 */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">
                                                Precio Referencial (Bs.)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium select-none pointer-events-none">Bs.</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    name="precio_referencial"
                                                    value={formData.precio_referencial}
                                                    onChange={handlePositiveNumberChange}
                                                    onBlur={handleBlur}
                                                    onKeyDown={blockNegativeKeys}
                                                    placeholder="0.01"
                                                    className={`${inputCls('precio_referencial')} pl-9`}
                                                />
                                            </div>
                                            {showErr('precio_referencial') && <FieldError msg={errors.precio_referencial} />}
                                            <p className="text-[10px] text-slate-400 mt-0.5">Opcional. Si se ingresa debe ser mayor a 0.</p>
                                        </div>

                                        {/* Stock mínimo — no negativo */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">
                                                Stock Mínimo Alerta
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                name="stock_minimo"
                                                value={formData.stock_minimo}
                                                onChange={handlePositiveNumberChange}
                                                onBlur={handleBlur}
                                                onKeyDown={blockNegativeKeys}
                                                className={inputCls('stock_minimo')}
                                            />
                                            {showErr('stock_minimo') && <FieldError msg={errors.stock_minimo} />}
                                        </div>
                                    </div>

                                    {/* ---- Columna derecha ---- */}
                                    <div className="space-y-4">

                                        {/* Ámbito de uso */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-2">Ámbito de Uso</label>
                                            <div className="flex gap-2">
                                                <button type="button"
                                                    onClick={() => {
                                                        setFormData(p => ({ ...p, tipo: 'maestro', proyecto_id: '' }));
                                                        setErrors(p => ({ ...p, proyecto_id: null }));
                                                        setTouched(p => ({ ...p, proyecto_id: false }));
                                                    }}
                                                    className={`flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                                                        formData.tipo === 'maestro'
                                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/50 dark:text-emerald-400'
                                                            : 'bg-white dark:bg-[#0f1523] border-slate-200 dark:border-white/5 text-slate-500 hover:border-emerald-300 dark:hover:border-emerald-500/30'
                                                    }`}
                                                >
                                                    Catálogo Maestro
                                                </button>
                                                <button type="button"
                                                    onClick={() => setFormData(p => ({ ...p, tipo: 'especial' }))}
                                                    className={`flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                                                        formData.tipo === 'especial'
                                                            ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/50 dark:text-amber-400'
                                                            : 'bg-white dark:bg-[#0f1523] border-slate-200 dark:border-white/5 text-slate-500 hover:border-amber-300 dark:hover:border-amber-500/30'
                                                    }`}
                                                >
                                                    Especial (Proyecto)
                                                </button>
                                            </div>
                                        </div>

                                        {/* Proyecto — solo para tipo especial */}
                                        <AnimatePresence>
                                            {formData.tipo === 'especial' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.18 }}
                                                    className="overflow-hidden"
                                                >
                                                    <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                                                        Asignar a Proyecto <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        name="proyecto_id"
                                                        value={formData.proyecto_id}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        className={`w-full bg-white dark:bg-[#0f1523] border rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${
                                                            showErr('proyecto_id')
                                                                ? 'border-red-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
                                                                : 'border-amber-200 dark:border-amber-500/30 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                                                        }`}
                                                    >
                                                        <option value="">Seleccione un proyecto...</option>
                                                        {proyectos.map(p => (
                                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                                        ))}
                                                    </select>
                                                    {proyectos.length === 0 && (
                                                        <p className="text-[11px] text-slate-400 mt-1">No hay proyectos activos disponibles</p>
                                                    )}
                                                    {showErr('proyecto_id') && <FieldError msg={errors.proyecto_id} />}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Descripción */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-semibold text-slate-500">Descripción / Notas</label>
                                                <CharCount value={formData.descripcion} max={MAX_DESC} />
                                            </div>
                                            <textarea
                                                name="descripcion"
                                                value={formData.descripcion}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                maxLength={MAX_DESC}
                                                rows={formData.tipo === 'especial' ? 2 : 3}
                                                placeholder="Especificaciones técnicas, usos..."
                                                className={`${inputCls('descripcion')} resize-none`}
                                            />
                                            {showErr('descripcion') && <FieldError msg={errors.descripcion} />}
                                        </div>
                                    </div>
                                </div>

                            </form>
                        </div>

                        {/* ── Footer ── */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5 transition-colors">
                                Cancelar
                            </button>
                            <button
                                type="submit" form="material-form"
                                disabled={submitting}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                            >
                                <Check size={16} />
                                {submitting ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Crear Material')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MaterialModal;
