import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { almacenService } from '../../../services/almacenService';
import proyectoService from '../../../services/proyectoService';
import { X, Warehouse, Plus, Check, MapPin } from '../../../components/icons/Icons';

/* ── Fix default marker icons de Leaflet en Vite ────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
    iconUrl:       new URL('leaflet/dist/images/marker-icon.png',    import.meta.url).href,
    shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png',  import.meta.url).href,
});

const ESTADOS_ACTIVOS = ['formulacion', 'licitacion', 'adjudicado', 'en_ejecucion', 'pausado'];

const glassInput = (hasError) =>
    `w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/30
     focus:outline-none transition-all
     ${hasError ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-violet-400/60 focus:bg-white/10'}`;

const labelCls = 'block text-white/50 text-xs mb-1.5 font-medium';

/* ── Componente interno: captura click en el mapa ───────────────────── */
function ClickHandler({ onCoords }) {
    useMapEvents({
        click(e) {
            onCoords(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

/* ── Estilos del mapa ────────────────────────────────────────────────── */
const mapStyles = `
  .almacen-form-map .leaflet-container {
    background: #0f172a;
    border-radius: 12px;
  }
  .almacen-form-map .leaflet-tile-pane {
    filter: brightness(0.85) saturate(0.8);
  }
`;

export default function AlmacenFormModal({ almacen, onClose, onGuardado }) {
    const esNuevo = !almacen;
    const [form, setForm] = useState({
        nombre:             almacen?.nombre             || '',
        tipo:               almacen?.tipo               || 'obra',
        proyecto_id:        almacen?.proyecto_id        || '',
        ubicacion:          almacen?.ubicacion          || '',
        latitud:            almacen?.latitud  != null   ? String(almacen.latitud)  : '',
        longitud:           almacen?.longitud != null   ? String(almacen.longitud) : '',
        descripcion:        almacen?.descripcion        || '',
        capacidad_estimada: almacen?.capacidad_estimada || '',
        observaciones:      almacen?.observaciones      || '',
    });
    const [proyectos, setProyectos]   = useState([]);
    const [saving, setSaving]         = useState(false);
    const [errors, setErrors]         = useState({});
    const [geoloading, setGeoloading] = useState(false);
    const [showMap, setShowMap]       = useState(
        almacen?.latitud != null && almacen?.longitud != null
    );

    useEffect(() => {
        proyectoService.listarSimples().then(data => {
            const lista = Array.isArray(data) ? data : [];
            setProyectos(lista.filter(p => ESTADOS_ACTIVOS.includes(p.estado)));
        }).catch(() => {});
    }, []);

    const handleChange = (field, value) => {
        setForm(p => ({ ...p, [field]: value }));
        setErrors(p => { const n = { ...p }; delete n[field]; return n; });
    };

    const handleMapClick = useCallback((lat, lng) => {
        handleChange('latitud',  lat.toFixed(6));
        handleChange('longitud', lng.toFixed(6));
    }, []);

    const handleGeolocate = () => {
        if (!navigator.geolocation) { toast.error('Tu navegador no soporta geolocalización.'); return; }
        setGeoloading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                handleChange('latitud',  pos.coords.latitude.toFixed(6));
                handleChange('longitud', pos.coords.longitude.toFixed(6));
                setShowMap(true);
                setGeoloading(false);
                toast.success('Ubicación capturada.');
            },
            () => { toast.error('No se pudo obtener la ubicación.'); setGeoloading(false); }
        );
    };

    const markerPos = (() => {
        const lat = parseFloat(form.latitud);
        const lng = parseFloat(form.longitud);
        return !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
    })();

    /* Centro del mapa: marker actual → Bolivia por defecto */
    const mapCenter = markerPos ?? [-16.5, -64.5];
    const mapZoom   = markerPos ? 15 : 6;

    const validate = () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
        if (!form.tipo) e.tipo = 'Selecciona un tipo.';
        if (form.tipo !== 'central' && !form.proyecto_id) e.proyecto_id = 'Selecciona el proyecto asociado.';
        if (form.capacidad_estimada && (isNaN(form.capacidad_estimada) || Number(form.capacidad_estimada) < 0))
            e.capacidad_estimada = 'Debe ser un número positivo.';
        if (form.latitud  && (isNaN(form.latitud)  || Math.abs(form.latitud)  > 90))  e.latitud  = 'Latitud inválida (-90 a 90).';
        if (form.longitud && (isNaN(form.longitud) || Math.abs(form.longitud) > 180)) e.longitud = 'Longitud inválida (-180 a 180).';
        return e;
    };

    const handleSubmit = async e => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        try {
            setSaving(true);
            const payload = {
                ...form,
                proyecto_id:        form.tipo === 'central' ? null : (form.proyecto_id || null),
                capacidad_estimada: form.capacidad_estimada ? Number(form.capacidad_estimada) : null,
                latitud:            form.latitud  !== '' ? Number(form.latitud)  : null,
                longitud:           form.longitud !== '' ? Number(form.longitud) : null,
            };
            if (esNuevo) {
                await almacenService.crear(payload);
                toast.success('Almacén creado correctamente.');
            } else {
                await almacenService.actualizar(almacen.id, payload);
                toast.success('Almacén actualizado.');
            }
            onGuardado();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al guardar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <style>{mapStyles}</style>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
                onClick={e => e.target === e.currentTarget && onClose()}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 20 }}
                    className="relative z-10 w-full max-w-lg my-4 rounded-3xl overflow-hidden shadow-2xl shadow-black/50
                        backdrop-blur-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/30 to-emerald-500/20 border border-white/10 flex items-center justify-center">
                                <Warehouse className="w-5 h-5 text-violet-300" />
                            </div>
                            <div>
                                <h2 className="text-white font-semibold text-base">{esNuevo ? 'Nuevo Almacén' : 'Editar Almacén'}</h2>
                                {!esNuevo && <p className="text-white/40 text-xs font-mono">{almacen.codigo}</p>}
                            </div>
                        </div>
                        <button onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">

                        {/* Nombre */}
                        <div>
                            <label className={labelCls}>Nombre *</label>
                            <input value={form.nombre} onChange={e => handleChange('nombre', e.target.value)}
                                placeholder="Ej: Almacén Central Principal"
                                className={glassInput(!!errors.nombre)} />
                            {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
                        </div>

                        {/* Tipo + Capacidad */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Tipo *</label>
                                <select value={form.tipo} onChange={e => handleChange('tipo', e.target.value)}
                                    disabled={almacen?.tipo === 'central'}
                                    className={`${glassInput(false)} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}>
                                    <option value="obra">De obra</option>
                                    <option value="temporal">Temporal</option>
                                    {esNuevo && <option value="central">Central</option>}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Capacidad estimada (m³)</label>
                                <input type="number" min="0" step="any" value={form.capacidad_estimada}
                                    onChange={e => handleChange('capacidad_estimada', e.target.value)}
                                    onKeyDown={e => ['-', 'e', '+'].includes(e.key) && e.preventDefault()}
                                    placeholder="0"
                                    className={glassInput(!!errors.capacidad_estimada)} />
                            </div>
                        </div>

                        {/* Proyecto */}
                        {form.tipo !== 'central' && (
                            <div>
                                <label className={labelCls}>Proyecto asociado *</label>
                                <select value={form.proyecto_id} onChange={e => handleChange('proyecto_id', e.target.value)}
                                    className={`${glassInput(!!errors.proyecto_id)} cursor-pointer`}>
                                    <option value="">— Seleccionar proyecto —</option>
                                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>)}
                                </select>
                                {errors.proyecto_id && <p className="text-red-400 text-xs mt-1">{errors.proyecto_id}</p>}
                            </div>
                        )}

                        {/* Ubicación (referencia textual) */}
                        <div>
                            <label className={labelCls}>Referencia de ubicación</label>
                            <input value={form.ubicacion} onChange={e => handleChange('ubicacion', e.target.value)}
                                placeholder="Ej: Zona Industrial Norte, Av. Principal km 5"
                                className={glassInput(false)} />
                        </div>

                        {/* Coordenadas GPS */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-white/50 text-xs font-medium flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-violet-400" />
                                    Coordenadas GPS
                                </label>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={handleGeolocate} disabled={geoloading}
                                        className="text-[10px] px-2.5 py-1 rounded-lg border border-violet-500/30
                                                   bg-violet-500/10 text-violet-300 hover:bg-violet-500/20
                                                   transition-all disabled:opacity-50">
                                        {geoloading ? 'Obteniendo…' : 'Mi ubicación'}
                                    </button>
                                    <button type="button"
                                        onClick={() => setShowMap(v => !v)}
                                        className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10
                                                   bg-white/5 text-slate-400 hover:bg-white/10 transition-all">
                                        {showMap ? 'Ocultar mapa' : 'Abrir mapa'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <input
                                        value={form.latitud}
                                        onChange={e => {
                                            handleChange('latitud', e.target.value);
                                            if (!showMap) setShowMap(true);
                                        }}
                                        placeholder="Latitud  ej: -16.500000"
                                        className={glassInput(!!errors.latitud)}
                                    />
                                    {errors.latitud && <p className="text-red-400 text-xs mt-1">{errors.latitud}</p>}
                                </div>
                                <div>
                                    <input
                                        value={form.longitud}
                                        onChange={e => {
                                            handleChange('longitud', e.target.value);
                                            if (!showMap) setShowMap(true);
                                        }}
                                        placeholder="Longitud  ej: -64.500000"
                                        className={glassInput(!!errors.longitud)}
                                    />
                                    {errors.longitud && <p className="text-red-400 text-xs mt-1">{errors.longitud}</p>}
                                </div>
                            </div>

                            <p className="text-[10px] text-slate-600 mt-1.5">
                                Escribe las coordenadas, usa "Mi ubicación" o haz clic en el mapa.
                            </p>
                        </div>

                        {/* Mini mapa interactivo */}
                        {showMap && (
                            <div className="almacen-form-map rounded-xl overflow-hidden border border-white/10"
                                style={{ height: 220 }}>
                                <MapContainer
                                    key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    style={{ height: '100%', width: '100%' }}
                                    zoomControl={true}
                                    attributionControl={false}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution=""
                                    />
                                    <ClickHandler onCoords={handleMapClick} />
                                    {markerPos && <Marker position={markerPos} />}
                                </MapContainer>
                            </div>
                        )}

                        {/* Descripción */}
                        <div>
                            <label className={labelCls}>Descripción</label>
                            <textarea rows={2} value={form.descripcion} onChange={e => handleChange('descripcion', e.target.value)}
                                placeholder="Descripción breve del almacén"
                                className={`${glassInput(false)} resize-none`} />
                        </div>

                        {/* Observaciones */}
                        <div>
                            <label className={labelCls}>Observaciones</label>
                            <textarea rows={2} value={form.observaciones} onChange={e => handleChange('observaciones', e.target.value)}
                                placeholder="Notas internas adicionales"
                                className={`${glassInput(false)} resize-none`} />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={onClose}
                                className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/10 hover:text-white transition-all">
                                Cancelar
                            </button>
                            <button type="submit" disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl
                                bg-gradient-to-r from-violet-600 to-emerald-600 text-white font-medium text-sm
                                shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-emerald-500 disabled:opacity-50 transition-all">
                                {saving ? 'Guardando…' : esNuevo
                                    ? <><Plus className="w-4 h-4" /> Crear almacén</>
                                    : <><Check className="w-4 h-4" /> Guardar cambios</>}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </>
    );
}
