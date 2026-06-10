import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BotonExportar from '../../../components/ui/BotonExportar';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import beneficiarioService from '../../../services/beneficiarioService';
import tipoViviendaService from '../../../services/tipoViviendaService';
import proyectoService from '../../../services/proyectoService';
import cierreRegistrosService from '../../../services/cierreRegistrosService';
import SyncTipologiaModal from '../beneficiarios/SyncTipologiaModal';
import {
    ArrowLeft, Plus, Download, Search, Users, MapPin, Phone,
    Edit, Trash2, X, Check, AlertTriangle, ChevronDown, ChevronUp,
    FileText, Table2, Upload, Eye, User, Calendar, Home, Lock, Unlock, Key
} from '../../../components/icons/Icons';

/* ─── Design tokens ─────────────────────────────────────────────── */
const BENEF_EST = {
    candidato:          { label: 'Candidato',        color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    aceptado:           { label: 'Aceptado',         color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
    en_construccion:    { label: 'En Construcción',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    vivienda_entregada: { label: 'Entregada',        color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    retirado:           { label: 'Retirado',         color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
    rechazado:          { label: 'Rechazado',        color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};
const VIV_EST = {
    planificada:       { label: 'Sin iniciar',      color: '#94a3b8' },
    terreno_preparado: { label: 'Terreno',          color: '#a78bfa' },
    cimentacion:       { label: 'Cimentación',      color: '#60a5fa' },
    obra_gruesa:       { label: 'Obra Gruesa',      color: '#fbbf24' },
    obra_fina:         { label: 'Obra Fina',        color: '#f97316' },
    acabados:          { label: 'Acabados',         color: '#22d3ee' },
    entregada:         { label: 'Entregada',        color: '#34d399' },
    con_observaciones: { label: 'Con Observ.',      color: '#f87171' },
};

/* ─── GMS ↔ decimal ─────────────────────────────────────────────── */
function parseCoordenada(str) {
    if (!str) return null;
    const s = str.trim();
    // Decimal
    if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    // GMS: 16° 30' 45.2" S  or  16°30'45.2"S
    const gms = s.match(/^(\d+)[°\s]+(\d+)['\s]+([0-9.]+)["''\s]*([NSEWnsew]?)$/);
    if (gms) {
        let val = parseFloat(gms[1]) + parseFloat(gms[2]) / 60 + parseFloat(gms[3]) / 3600;
        if (/[SW]/i.test(gms[4])) val = -val;
        return Math.round(val * 1e7) / 1e7;
    }
    return null;
}
function decimalAGms(val) {
    if (val == null) return '';
    const abs = Math.abs(val);
    const d = Math.floor(abs);
    const mFull = (abs - d) * 60;
    const m = Math.floor(mFull);
    const s = ((mFull - m) * 60).toFixed(2);
    return `${d}° ${m}' ${s}"`;
}

/* ─── Mapa Leaflet ──────────────────────────────────────────────── */
function MapaCoords({ lat, lng, nombre }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!lat || !lng || !ref.current) return;
        let map;
        import('leaflet').then(L => {
            import('leaflet/dist/leaflet.css');
            // Fix icons
            delete L.default.Icon.Default.prototype._getIconUrl;
            L.default.Icon.Default.mergeOptions({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
            map = L.default.map(ref.current).setView([lat, lng], 15);
            L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
            }).addTo(map);
            L.default.marker([lat, lng]).addTo(map).bindPopup(nombre || 'Parcela').openPopup();
        });
        return () => { if (map) map.remove(); };
    }, [lat, lng, nombre]);

    if (!lat || !lng) return (
        <div className="w-full h-48 rounded-xl flex flex-col items-center justify-center gap-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <MapPin size={28} className="text-slate-600" />
            <p className="text-slate-500 text-sm">Sin coordenadas registradas</p>
            <a href={`https://www.openstreetmap.org/`} target="_blank" rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1">Abrir mapa</a>
        </div>
    );
    return (
        <div className="w-full relative">
            <div ref={ref} style={{ height: 220, borderRadius: 12, overflow: 'hidden', zIndex: 0 }} />
            <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`}
                target="_blank" rel="noreferrer"
                className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                style={{ background: 'rgba(15,23,42,0.85)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
                Ver en OSM ↗
            </a>
        </div>
    );
}

/* ─── Primitivos ────────────────────────────────────────────────── */
const EstadoPill = ({ estado, meta }) => {
    const m = meta[estado] || { label: estado, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ color: m.color, background: m.bg || `${m.color}20`, border: `1px solid ${m.color}40` }}>
            {m.label}
        </span>
    );
};

const VivAvance = ({ porcentaje }) => (
    <div className="w-full">
        <div className="flex justify-between text-xs text-slate-500 mb-0.5">
            <span>Avance vivienda</span><span>{Number(porcentaje || 0).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, porcentaje || 0)}%`, background: 'linear-gradient(90deg,#34d399,#059669)' }} />
        </div>
    </div>
);

const GlassOverlay = ({ onClick }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        onClick={onClick} />
);

/* ─── Card de beneficiario ──────────────────────────────────────── */
function BeneficiarioCard({ b, onClick }) {
    const foto = b.foto_titular_url;
    const viv  = b.vivienda;
    return (
        <button onClick={onClick}
            className="text-left rounded-2xl p-4 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer w-full"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-start gap-3 mb-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden"
                    style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    {foto
                        ? <img src={foto} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <User size={22} className="text-blue-400" />
                          </div>
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-tight truncate">
                        {b.nombre} {b.apellido_paterno}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">{b.ci}{b.ci_complemento ? '-' + b.ci_complemento : ''}</p>
                    {b.comunidad && <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5"><MapPin size={10} />{b.comunidad}</p>}
                </div>
                <EstadoPill estado={b.estado_seleccion} meta={BENEF_EST} />
            </div>
            {/* Tipología */}
            {b.tipo_vivienda && (
                <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
                        {b.tipo_vivienda?.nombre}
                    </span>
                </div>
            )}
            {/* Vivienda */}
            {viv && (
                <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-mono">{viv.codigo}</span>
                        <EstadoPill estado={viv.estado} meta={VIV_EST} />
                    </div>
                    <VivAvance porcentaje={viv.porcentaje_avance} />
                </div>
            )}
        </button>
    );
}

/* ─── Modal detalle ─────────────────────────────────────────────── */
function ModalDetalle({ b, onClose, onEditar, onDarDeBaja, canEdit, onVerHistorialSync }) {
    const [tab, setTab] = useState('datos');
    const [transiciones, setTransiciones] = useState([]);
    useEffect(() => {
        beneficiarioService.obtenerTransicionesPermitidas(b.id).then(setTransiciones).catch(() => {});
    }, [b.id]);

    const tabs = [
        { id: 'datos',     label: 'Datos' },
        { id: 'vivienda',  label: 'Vivienda' },
        { id: 'mapa',      label: 'Mapa' },
        { id: 'documentos', label: 'Documentos' },
    ];

    return (
        <>
            <GlassOverlay onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
                    style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 32px 64px rgba(0,0,0,0.6)' }}>
                    {/* Header */}
                    <div className="flex items-center gap-4 p-6 border-b border-white/[0.08]">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0"
                            style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                            {b.foto_titular_url
                                ? <img src={b.foto_titular_url} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center"><User size={28} className="text-blue-400" /></div>
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-white truncate">
                                {b.nombre} {b.apellido_paterno} {b.apellido_materno || ''}
                            </h2>
                            {b.apellido_conyuge && <p className="text-slate-400 text-xs">Cónyuge: {b.apellido_conyuge}</p>}
                            <p className="text-slate-400 text-sm font-mono">{b.codigo_beneficiario}</p>
                            <div className="mt-1"><EstadoPill estado={b.estado_seleccion} meta={BENEF_EST} /></div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    {/* Tabs */}
                    <div className="flex px-6 pt-3 gap-1 border-b border-white/[0.06]">
                        {tabs.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`px-4 py-2 text-sm rounded-t-lg transition-colors font-medium ${tab === t.id ? 'text-white border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {tab === 'datos' && (
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    ['CI', `${b.ci}${b.ci_complemento ? '-' + b.ci_complemento : ''}`],
                                    ['Teléfono', b.telefono_principal || '—'],
                                    ['Tel. Alternativo', b.telefono_alternativo || '—'],
                                    ['Comunidad', b.comunidad || '—'],
                                    ['Estado Civil', b.estado_civil || '—'],
                                    ['Género', b.genero || '—'],
                                    ['Nacimiento', b.fecha_nacimiento || '—'],
                                    ['Tipología', b.tipo_vivienda?.nombre || '—'],
                                    ['Dirección actual', b.direccion_actual || '—'],
                                ].map(([k, v]) => (
                                    <div key={k} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        <p className="text-slate-500 text-xs mb-0.5">{k}</p>
                                        <p className="text-white text-sm">{v}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {tab === 'vivienda' && (
                            b.vivienda ? (
                                <div className="space-y-3">
                                    <div className="rounded-2xl p-5" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-mono text-emerald-400 text-lg font-bold">{b.vivienda.codigo}</span>
                                            <EstadoPill estado={b.vivienda.estado} meta={VIV_EST} />
                                        </div>
                                        <VivAvance porcentaje={b.vivienda.porcentaje_avance} />
                                        {b.vivienda.observaciones && (
                                            <p className="text-slate-400 text-sm mt-3">{b.vivienda.observaciones}</p>
                                        )}
                                    </div>
                                    <BotonExportar
                                        url={`/exportar/viviendas/${b.vivienda.id}/acta`}
                                        formatos={[{ tipo: 'pdf', label: 'Descargar Acta de Entrega' }]}
                                        label="Acta de Entrega PDF"
                                        className="w-full justify-center"
                                    />
                                    <p className="text-slate-500 text-xs text-center">El avance de la vivienda se conserva aunque cambie el titular.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-10 gap-3">
                                    <Home size={40} className="text-slate-600" />
                                    <p className="text-slate-400">Sin vivienda asignada</p>
                                </div>
                            )
                        )}
                        {tab === 'mapa' && (
                            <MapaCoords lat={b.latitud_terreno} lng={b.longitud_terreno}
                                nombre={`${b.nombre} ${b.apellido_paterno} — Parcela`} />
                        )}
                        {tab === 'documentos' && (
                            <div className="space-y-3">
                                {b.documento_propiedad_terreno_url ? (
                                    <a href={b.documento_propiedad_terreno_url} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-3 p-4 rounded-xl hover:bg-white/[0.05] transition-colors"
                                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <FileText size={24} className="text-blue-400" />
                                        <div>
                                            <p className="text-white text-sm font-medium">Documento de propiedad</p>
                                            <p className="text-slate-400 text-xs">Ver documento</p>
                                        </div>
                                    </a>
                                ) : <p className="text-slate-500 text-sm">No hay documento de propiedad registrado.</p>}
                            </div>
                        )}
                    </div>
                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t border-white/[0.08]">
                        <div className="flex items-center gap-2">
                            {canEdit && (
                                <button onClick={() => onDarDeBaja(b)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all">
                                    <Trash2 size={15} /> Dar de baja
                                </button>
                            )}
                            {onVerHistorialSync && (
                                <button onClick={() => onVerHistorialSync(b)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
                                    <FileText size={13} /> Historial tipo
                                </button>
                            )}
                        </div>
                        {canEdit && (
                            <button onClick={() => onEditar(b)}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                                style={{ background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.4)' }}>
                                <Edit size={15} /> Editar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

/* ─── Modal dar de baja ─────────────────────────────────────────── */
function ModalBaja({ beneficiario, onClose, onConfirmar, loading }) {
    const [razon, setRazon] = useState('');
    return (
        <>
            <GlassOverlay onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-md rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(248,113,113,0.3)' }}>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.15)' }}>
                                <AlertTriangle size={20} className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Dar de baja</h3>
                                <p className="text-slate-400 text-xs">{beneficiario.nombre} {beneficiario.apellido_paterno}</p>
                            </div>
                        </div>
                        <p className="text-slate-300 text-sm mb-4">
                            La vivienda asociada quedará libre para reasignación, conservando su avance de construcción.
                        </p>
                        <div className="mb-4">
                            <label className="block text-slate-400 text-xs mb-1.5">Razón obligatoria</label>
                            <textarea value={razon} onChange={e => setRazon(e.target.value)} rows={3}
                                className="w-full rounded-xl px-3 py-2 text-sm text-white resize-none"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                placeholder="Describe el motivo de la baja..." />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm text-slate-300 hover:text-white transition-colors"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                Cancelar
                            </button>
                            <button onClick={() => onConfirmar(razon)} disabled={!razon.trim() || loading}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                                style={{ background: 'rgba(248,113,113,0.25)', border: '1px solid rgba(248,113,113,0.4)' }}>
                                {loading ? 'Procesando…' : 'Confirmar baja'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ─── Formulario beneficiario ───────────────────────────────────── */
// onlyLetters: solo letras+espacios, capitalize: primera letra mayúscula, onlyNumbers: solo dígitos
const CAMPOS_FORM = [
    { key: 'nombre',           label: 'Nombre(s)',         required: true,  col: 2, maxLength: 30, onlyLetters: true, capitalize: true },
    { key: 'apellido_paterno', label: 'Apellido paterno',  required: true,  col: 1, maxLength: 30, onlyLetters: true, capitalize: true },
    { key: 'apellido_materno', label: 'Apellido materno',  required: false, col: 1, maxLength: 30, onlyLetters: true, capitalize: true },
    { key: 'apellido_conyuge', label: 'Apellido cónyuge',  required: false, col: 2, maxLength: 30, onlyLetters: true, capitalize: true },
    { key: 'ci',               label: 'C.I.',               required: true,  col: 1, maxLength: 15, onlyNumbers: true },
    { key: 'ci_complemento',   label: 'Complemento CI',    required: false, col: 1, maxLength: 2 },
    { key: 'fecha_nacimiento', label: 'Fecha nacimiento',  required: false, col: 1, type: 'date' },
    { key: 'estado_civil',     label: 'Estado civil',      required: false, col: 1, type: 'select',
      options: [['','Sin especificar'],['soltero','Soltero/a'],['casado','Casado/a'],['divorciado','Divorciado/a'],['viudo','Viudo/a'],['union_libre','Unión libre'],['otro','Otro']] },
    { key: 'telefono_principal', label: 'Teléfono',        required: false, col: 1, maxLength: 8, onlyNumbers: true },
    { key: 'comunidad',        label: 'Comunidad',         required: false, col: 1 },
];

function FormularioBeneficiario({ proyectoId, beneficiario, tipologias, onClose, onGuardado, onTipoCambiado }) {
    const isEdit = !!beneficiario;
    const tipoOriginal = isEdit ? (beneficiario.tipo_vivienda_id ?? '') : '';
    const [form, setForm] = useState(isEdit ? { ...beneficiario, tipo_vivienda_id: beneficiario.tipo_vivienda_id ?? '' } : {
        nombre: '', apellido_paterno: '', apellido_materno: '', apellido_conyuge: '',
        ci: '', ci_complemento: '', fecha_nacimiento: '', estado_civil: '',
        telefono_principal: '',
        comunidad: '',
        latitud_terreno: '', longitud_terreno: '',
        tipo_vivienda_id: '', proyecto_id: proyectoId,
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [fotoPreview, setFotoPreview] = useState(beneficiario?.foto_titular_url || null);
    const [docPreview, setDocPreview] = useState(beneficiario?.documento_propiedad_terreno_url || null);
    const [subiendoFoto, setSubiendoFoto] = useState(false);
    const [subiendoDoc, setSubiendoDoc] = useState(false);
    const [modoGms, setModoGms] = useState(false);
    const [gmsLat, setGmsLat] = useState('');
    const [gmsLng, setGmsLng] = useState('');

    const validarCampo = (k, v) => {
        if (k === 'nombre' && !v.trim()) return 'Requerido';
        if (k === 'apellido_paterno' && !v.trim()) return 'Requerido';
        if (k === 'ci' && !v.trim()) return 'Requerido';
        if (k === 'fecha_nacimiento' && v) {
            const birth = new Date(v + 'T00:00:00');
            const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 18);
            if (birth > cutoff) return 'Debe ser mayor de 18 años';
        }
        return null;
    };

    const set = (k, v) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrors(e => {
            const n = { ...e };
            const err = validarCampo(k, v);
            if (err) n[k] = err; else delete n[k];
            return n;
        });
    };

    const aplicarGms = () => {
        const lat = parseCoordenada(gmsLat);
        const lng = parseCoordenada(gmsLng);
        if (lat === null || lng === null) { setErrors(e => ({ ...e, coordenadas: 'Formato inválido. Use decimal (−16.5) o GMS (16° 30\' 0" S)' })); return; }
        setForm(f => ({ ...f, latitud_terreno: lat, longitud_terreno: lng }));
        setErrors(e => { const n = {...e}; delete n.coordenadas; return n; });
    };

    const subirFoto = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error('La imagen no puede superar los 2 MB'); return; }
        setSubiendoFoto(true);
        try {
            const url = await beneficiarioService.subirFoto(file);
            setFotoPreview(url);
            set('foto_titular_url', url);
        } catch { toast.error('Error al subir la foto'); }
        finally { setSubiendoFoto(false); }
    };

    const subirDoc = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('El documento no puede superar los 5 MB'); return; }
        setSubiendoDoc(true);
        try {
            const url = await beneficiarioService.subirDocumento(file);
            setDocPreview(url);
            set('documento_propiedad_terreno_url', url);
        } catch { toast.error('Error al subir el documento'); }
        finally { setSubiendoDoc(false); }
    };

    const guardar = async () => {
        const newErrors = {};
        if (!form.nombre.trim()) newErrors.nombre = 'Requerido';
        if (!form.apellido_paterno.trim()) newErrors.apellido_paterno = 'Requerido';
        if (!form.ci.trim()) newErrors.ci = 'Requerido';

        if (form.fecha_nacimiento) {
            const birth = new Date(form.fecha_nacimiento + 'T00:00:00');
            const cutoff = new Date();
            cutoff.setFullYear(cutoff.getFullYear() - 18);
            if (birth > cutoff) newErrors.fecha_nacimiento = 'Debe ser mayor de 18 años';
        }

        if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

        setLoading(true);
        try {
            const payload = { ...form };
            // Campos removidos de la UI — no enviar al backend
            delete payload.genero;
            delete payload.telefono_alternativo;
            delete payload.email;
            delete payload.direccion_actual;
            if (payload.latitud_terreno === '') delete payload.latitud_terreno;
            if (payload.longitud_terreno === '') delete payload.longitud_terreno;

            const nuevoTipoId = payload.tipo_vivienda_id || null;
            const tipoCambio  = isEdit && String(nuevoTipoId) !== String(tipoOriginal);

            // Excluir tipo_vivienda_id del PUT — se maneja por PATCH dedicado
            delete payload.tipo_vivienda_id;

            if (isEdit) {
                await beneficiarioService.update(beneficiario.id, payload);

                if (tipoCambio && nuevoTipoId) {
                    // Llamar al endpoint dedicado que maneja el auto-sync o retorna requiere_preview
                    const res = await beneficiarioService.asignarTipoVivienda(beneficiario.id, parseInt(nuevoTipoId));
                    if (res.requiere_preview) {
                        toast.success('Beneficiario actualizado. Revisá los ítems del nuevo tipo.');
                        onGuardado();
                        onTipoCambiado?.({ ...beneficiario, ...payload, tipo_vivienda_id: parseInt(nuevoTipoId) }, parseInt(nuevoTipoId));
                        return;
                    } else if (res.sync?.estado) {
                        toast.success(`Beneficiario actualizado — tipología sincronizada (${res.sync.estado})`);
                    } else {
                        toast.success('Beneficiario actualizado');
                    }
                } else {
                    toast.success('Beneficiario actualizado');
                }
            } else {
                if (nuevoTipoId) payload.tipo_vivienda_id = parseInt(nuevoTipoId);
                await beneficiarioService.create(payload);
                toast.success('Beneficiario registrado y vivienda asignada automáticamente');
            }
            onGuardado();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Error al guardar';
            toast.error(msg);
            if (err?.response?.data?.errors) setErrors(err.response.data.errors);
        } finally { setLoading(false); }
    };

    return (
        <>
            <GlassOverlay onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-2xl rounded-3xl flex flex-col max-h-[92vh]"
                    style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 32px 64px rgba(0,0,0,0.6)' }}>
                    <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
                        <h2 className="text-lg font-bold text-white">{isEdit ? 'Editar beneficiario' : 'Registrar beneficiario'}</h2>
                        <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"><X size={18} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* Foto */}
                        <div>
                            <p className="text-slate-400 text-xs mb-2">Foto del titular <span className="text-slate-600">(JPEG/PNG, máx. 2 MB)</span></p>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                                    style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                                    {fotoPreview
                                        ? <img src={fotoPreview} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center"><User size={24} className="text-blue-400" /></div>
                                    }
                                </div>
                                <label className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-sm transition-all ${subiendoFoto ? 'opacity-50' : 'hover:bg-white/[0.06]'}`}
                                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                                    <Upload size={14} />{subiendoFoto ? 'Subiendo…' : 'Subir foto'}
                                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={subirFoto} disabled={subiendoFoto} />
                                </label>
                            </div>
                        </div>

                        {/* Campos */}
                        <div className="grid grid-cols-2 gap-3">
                            {CAMPOS_FORM.map(c => {
                                const borderColor = errors[c.key] ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)';
                                const fieldStyle = { background: 'rgba(255,255,255,0.05)', border: `1px solid ${borderColor}` };
                                const baseClass = 'w-full rounded-xl px-3 py-2 text-sm text-white outline-none';

                                const handleChange = (raw) => {
                                    let v = raw;
                                    if (c.onlyNumbers) v = v.replace(/\D/g, '');
                                    if (c.onlyLetters) v = v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
                                    if (c.capitalize && v.length > 0) v = v.charAt(0).toUpperCase() + v.slice(1);
                                    if (c.maxLength) v = v.slice(0, c.maxLength);
                                    set(c.key, v);
                                };

                                return (
                                <div key={c.key} className={c.col === 2 ? 'col-span-2' : ''}>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-slate-400 text-xs">{c.label}{c.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                                        {c.maxLength && c.type !== 'number' && c.type !== 'date' && c.type !== 'select' && (
                                            <span className="text-[10px] text-slate-600">{(form[c.key] || '').length}/{c.maxLength}</span>
                                        )}
                                    </div>
                                    {c.type === 'select' ? (
                                        <select value={form[c.key] || ''} onChange={e => set(c.key, e.target.value)}
                                            className={baseClass}
                                            style={{ ...fieldStyle, background: '#0f172a' }}>
                                            {c.options.map(([v, l]) => <option key={v} value={v} style={{ background: '#1e293b' }}>{l}</option>)}
                                        </select>
                                    ) : c.type === 'textarea' ? (
                                        <textarea value={form[c.key] || ''} onChange={e => handleChange(e.target.value)} rows={2}
                                            maxLength={c.maxLength}
                                            className={`${baseClass} resize-none`}
                                            style={fieldStyle} />
                                    ) : c.type === 'number' ? (
                                        <input type="number" value={form[c.key] || ''} onChange={e => set(c.key, e.target.value)}
                                            min={c.min} max={c.max}
                                            className={baseClass} style={fieldStyle} />
                                    ) : (
                                        <input type={c.type || 'text'} value={form[c.key] || ''} onChange={e => handleChange(e.target.value)}
                                            maxLength={c.maxLength}
                                            inputMode={c.onlyNumbers ? 'numeric' : undefined}
                                            className={baseClass} style={fieldStyle} />
                                    )}
                                    {errors[c.key] && <p className="text-red-400 text-xs mt-0.5">{errors[c.key]}</p>}
                                </div>
                                );
                            })}

                            {/* Tipología */}
                            <div className="col-span-2">
                                <label className="block text-slate-400 text-xs mb-1">Tipología asignada</label>
                                <select value={form.tipo_vivienda_id || ''} onChange={e => set('tipo_vivienda_id', e.target.value)}
                                    className="w-full rounded-xl px-3 py-2 text-sm text-white"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <option value="" style={{ background: '#1e293b' }}>Sin tipología</option>
                                    {tipologias.map(t => (
                                        <option key={t.id} value={t.id} style={{ background: '#1e293b' }}>
                                            {t.nombre}{t.metros_cuadrados ? ` (${t.metros_cuadrados} m²)` : ''}
                                            {!t.plantilla_constructiva_id ? ' ⚠ sin plantilla' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Coordenadas */}
                            <div className="col-span-2">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-3">
                                        <label className="text-slate-400 text-xs">Coordenadas del terreno</label>
                                        <button type="button" 
                                            onClick={() => {
                                                if (!navigator.geolocation) {
                                                    toast.error('Tu navegador no soporta geolocalización');
                                                    return;
                                                }
                                                const id = toast.loading('Capturando GPS...');
                                                navigator.geolocation.getCurrentPosition(
                                                    pos => {
                                                        set('latitud_terreno', pos.coords.latitude.toFixed(6));
                                                        set('longitud_terreno', pos.coords.longitude.toFixed(6));
                                                        toast.success('Coordenadas capturadas', {id});
                                                    },
                                                    err => toast.error('Error al capturar GPS. Verifica los permisos.', {id}),
                                                    { enableHighAccuracy: true, timeout: 10000 }
                                                );
                                            }}
                                            className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 transition flex items-center gap-1 border border-blue-500/30">
                                            <MapPin size={12} /> Capturar GPS
                                        </button>
                                    </div>
                                    <button type="button" onClick={() => setModoGms(!modoGms)}
                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                        {modoGms ? 'Usar decimal' : 'Usar GMS sexagesimal'}
                                    </button>
                                </div>
                                {modoGms ? (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-slate-500 text-xs mb-1">Latitud (ej: 16° 30' 0" S)</p>
                                                <input value={gmsLat} onChange={e => setGmsLat(e.target.value)} placeholder="-16.5 o 16° 30' 0&quot; S"
                                                    className="w-full rounded-xl px-3 py-2 text-sm text-white"
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs mb-1">Longitud (ej: -64° 10' 0" W)</p>
                                                <input value={gmsLng} onChange={e => setGmsLng(e.target.value)} placeholder="-64.5 o 64° 10' 0&quot; W"
                                                    className="w-full rounded-xl px-3 py-2 text-sm text-white"
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                            </div>
                                        </div>
                                        <button type="button" onClick={aplicarGms}
                                            className="px-4 py-1.5 rounded-lg text-sm text-white transition-all"
                                            style={{ background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.4)' }}>
                                            Convertir y aplicar
                                        </button>
                                        {errors.coordenadas && <p className="text-red-400 text-xs">{errors.coordenadas}</p>}
                                        {form.latitud_terreno && form.longitud_terreno && (
                                            <p className="text-emerald-400 text-xs">✓ Decimal: {form.latitud_terreno}, {form.longitud_terreno}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-slate-500 text-xs mb-1">Latitud decimal</p>
                                            <input type="number" step="0.0000001" value={form.latitud_terreno || ''} onChange={e => set('latitud_terreno', e.target.value)}
                                                placeholder="-16.500000"
                                                className="w-full rounded-xl px-3 py-2 text-sm text-white"
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs mb-1">Longitud decimal</p>
                                            <input type="number" step="0.0000001" value={form.longitud_terreno || ''} onChange={e => set('longitud_terreno', e.target.value)}
                                                placeholder="-64.500000"
                                                className="w-full rounded-xl px-3 py-2 text-sm text-white"
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                        </div>
                                    </div>
                                )}
                                {form.latitud_terreno && form.longitud_terreno && (
                                    <>
                                        <p className="text-slate-500 text-xs mt-1 mb-2">
                                            GMS: {decimalAGms(form.latitud_terreno)} {Number(form.latitud_terreno) >= 0 ? 'N' : 'S'}, {decimalAGms(form.longitud_terreno)} {Number(form.longitud_terreno) >= 0 ? 'E' : 'W'}
                                        </p>
                                        <div className="mt-2" style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                                            <MapaCoords lat={parseFloat(form.latitud_terreno)} lng={parseFloat(form.longitud_terreno)} nombre="Ubicación registrada" />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Documento propiedad */}
                            <div className="col-span-2">
                                <label className="block text-slate-400 text-xs mb-1.5">Documento de propiedad del terreno <span className="text-slate-600">(PDF/imagen, máx. 5 MB, opcional)</span></label>
                                <div className="flex items-center gap-3">
                                    {docPreview && (
                                        <a href={docPreview} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                            style={{ border: '1px solid rgba(96,165,250,0.3)' }}>
                                            <FileText size={14} /> Ver documento
                                        </a>
                                    )}
                                    <label className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-sm transition-all ${subiendoDoc ? 'opacity-50' : 'hover:bg-white/[0.06]'}`}
                                        style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                                        <Upload size={14} />{subiendoDoc ? 'Subiendo…' : docPreview ? 'Reemplazar' : 'Subir documento'}
                                        <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={subirDoc} disabled={subiendoDoc} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 p-6 border-t border-white/[0.08]">
                        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            Cancelar
                        </button>
                        <button onClick={guardar} disabled={loading}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                            style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)' }}>
                            {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar beneficiario'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ─── Componente principal ──────────────────────────────────────── */
export default function BeneficiariosProyecto() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const canEdit = hasPermission('beneficiarios.crear') || hasPermission('beneficiarios.editar');

    const [proyecto, setProyecto] = useState(null);
    const [cupo, setCupo] = useState(null);
    const [beneficiarios, setBeneficiarios] = useState([]);
    const [tipologias, setTipologias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroComunidad, setFiltroComunidad] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroTipologia, setFiltroTipologia] = useState('');

    const [modalDetalle, setModalDetalle]   = useState(null);
    const [modalForm, setModalForm]         = useState(null); // null | 'crear' | beneficiario
    const [modalBaja, setModalBaja]         = useState(null);
    const [bajaLoading, setBajaLoading]     = useState(false);
    const [modalSync, setModalSync]         = useState(null); // { beneficiario, nuevoTipoId } | { beneficiario, soloHistorial }


    // Cierre de registros
    const [estadoCierre, setEstadoCierre] = useState(null);
    const [modalCerrar, setModalCerrar]   = useState(false);
    const [modalOtp, setModalOtp]         = useState(false);
    const [otpCodigo, setOtpCodigo]       = useState('');
    const [cierreLoading, setCierreLoading] = useState(false);
    const cargarDatos = useCallback(async () => {
        setCargando(true);
        try {
            const [proy, cupoData, tiposData, cierreData] = await Promise.all([
                proyectoService.obtener(id),
                beneficiarioService.obtenerCupoProyecto(id).catch(() => null),
                tipoViviendaService.getAll(true),
                cierreRegistrosService.estado(id).catch(() => null),
            ]);
            setProyecto(proy);
            setCupo(cupoData);
            setTipologias(tiposData);
            setEstadoCierre(cierreData);
        } catch { toast.error('Error al cargar proyecto'); }
        finally { setCargando(false); }
    }, [id]);

    const handleCerrarRegistros = async () => {
        setCierreLoading(true);
        try {
            await cierreRegistrosService.cerrar(id);
            toast.success('Registros de beneficiarios cerrados');
            setModalCerrar(false);
            cargarDatos();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al cerrar registros');
        } finally { setCierreLoading(false); }
    };

    const handleSolicitarReapertura = async () => {
        setCierreLoading(true);
        try {
            await cierreRegistrosService.solicitarReapertura(id);
            toast.success('Código de reapertura enviado a su correo');
            setModalOtp(true);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al solicitar reapertura');
        } finally { setCierreLoading(false); }
    };

    const handleVerificarOtp = async () => {
        if (otpCodigo.length !== 8) return toast.error('El código debe tener 8 caracteres');
        setCierreLoading(true);
        try {
            await cierreRegistrosService.verificarReapertura(id, otpCodigo);
            toast.success('Registros reabiertos correctamente');
            setModalOtp(false);
            setOtpCodigo('');
            cargarDatos();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Código incorrecto');
        } finally { setCierreLoading(false); }
    };

    const cargarBeneficiarios = useCallback(async () => {
        try {
            const filtros = {};
            if (busqueda) filtros.busqueda = busqueda;
            if (filtroComunidad) filtros.comunidad = filtroComunidad;
            if (filtroEstado) filtros.estado_seleccion = filtroEstado;
            if (filtroTipologia) filtros.tipo_vivienda_id = filtroTipologia;

            const res = await beneficiarioService.listarPorProyecto(id, filtros, 1, 100);
            setBeneficiarios(res.data || []);
        } catch { toast.error('Error al cargar beneficiarios'); }
    }, [id, busqueda, filtroComunidad, filtroEstado, filtroTipologia]);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);
    useEffect(() => { if (!cargando) cargarBeneficiarios(); }, [cargarBeneficiarios, cargando]);

    const darDeBaja = async (razon) => {
        if (!modalBaja) return;
        setBajaLoading(true);
        try {
            await beneficiarioService.cambiarEstado(modalBaja.id, 'retirado', razon);
            toast.success('Beneficiario dado de baja. Vivienda liberada.');
            setModalBaja(null);
            setModalDetalle(null);
            cargarBeneficiarios();
            cargarDatos();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al dar de baja');
        } finally { setBajaLoading(false); }
    };

    const registrosCerrados = estadoCierre?.cerrado === true;
    const canEditEfectivo   = canEdit && !registrosCerrados;
    const limiteAlcanzado   = registrosCerrados || (cupo && cupo.cupos_disponibles <= 0);

    if (cargando) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b,#0f172a)' }}>
            <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)' }}>
            {/* ─── Header sticky ─── */}
            <div className="sticky top-0 z-20 px-4 sm:px-6 py-4"
                style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                        <button onClick={() => navigate(`/dashboard/proyectos/${id}`)} className="hover:text-white transition-colors flex items-center gap-1.5">
                            <ArrowLeft size={14} />{proyecto?.codigo || 'Proyecto'}
                        </button>
                        <span>/</span>
                        <span className="text-white font-medium">Beneficiarios</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Indicador grande */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)' }}>
                                <Users size={22} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs">Beneficiarios registrados</p>
                                <p className="text-white text-2xl font-bold leading-none">
                                    {cupo?.beneficiarios_registrados ?? beneficiarios.length}
                                    <span className="text-slate-500 text-base font-normal"> / {cupo?.cupo_total ?? proyecto?.cantidad_beneficiarios ?? '?'}</span>
                                </p>
                            </div>
                        </div>
                        {/* Acciones */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Exportar lista */}
                            <BotonExportar
                                url={`/exportar/proyectos/${id}/beneficiarios`}
                                filtros={{
                                    ...(filtroEstado    && { estado_seleccion: filtroEstado }),
                                    ...(filtroComunidad && { comunidad: filtroComunidad }),
                                    ...(filtroTipologia && { tipo_vivienda_id: filtroTipologia }),
                                }}
                                formatos={[
                                    { tipo: 'pdf',   label: 'Lista PDF'   },
                                    { tipo: 'excel', label: 'Lista Excel' },
                                ]}
                            />
                            {/* ZIP masivo de actas */}
                            <BotonExportar
                                url={`/exportar/proyectos/${id}/actas-zip`}
                                formatos={[{ tipo: 'zip', label: 'ZIP de actas' }]}
                                label="Actas ZIP"
                            />
                            {/* Cierre / reapertura de registros */}
                            {canEdit && estadoCierre && (
                                registrosCerrados ? (
                                    <button onClick={handleSolicitarReapertura} disabled={cierreLoading}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 transition-all disabled:opacity-50"
                                        style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }}>
                                        <Unlock size={13} /> Reabrir registros
                                    </button>
                                ) : (
                                    <button onClick={() => setModalCerrar(true)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-300 transition-all"
                                        style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
                                        <Lock size={13} /> Terminar registros
                                    </button>
                                )
                            )}
                            {/* Nuevo */}
                            {canEditEfectivo && (
                                <div className="relative group">
                                    <button onClick={() => !limiteAlcanzado && setModalForm('crear')}
                                        disabled={limiteAlcanzado}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ background: limiteAlcanzado ? 'rgba(148,163,184,0.15)' : 'rgba(52,211,153,0.2)', border: `1px solid ${limiteAlcanzado ? 'rgba(148,163,184,0.3)' : 'rgba(52,211,153,0.4)'}` }}>
                                        <Plus size={15} /> Registrar beneficiario
                                    </button>
                                    {limiteAlcanzado && (
                                        <div className="absolute top-full right-0 mt-1 z-30 px-3 py-2 rounded-lg text-xs text-slate-300 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            Límite alcanzado: todas las viviendas están asignadas
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* ─── Banner cierre ─── */}
                {registrosCerrados && (
                    <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl"
                        style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)' }}>
                        <Lock size={18} className="text-amber-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-amber-300 text-sm font-semibold">Registros de beneficiarios cerrados</p>
                            <p className="text-amber-500/70 text-xs">
                                Cerrado el {estadoCierre?.fecha_cierre ? new Date(estadoCierre.fecha_cierre).toLocaleDateString('es-BO') : '—'}
                                {estadoCierre?.cerrado_por && ` por ${estadoCierre.cerrado_por.name}`}.
                                Para agregar o modificar beneficiarios es necesario reabrir con código OTP.
                            </p>
                        </div>
                    </div>
                )}
                {/* ─── Filtros ─── */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    {/* Búsqueda */}
                    <div className="relative flex-1 min-w-48">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o CI…"
                            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-white placeholder-slate-500"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                    {/* Comunidad */}
                    <input value={filtroComunidad} onChange={e => setFiltroComunidad(e.target.value)} placeholder="Comunidad…"
                        className="px-3 py-2 rounded-xl text-sm text-white placeholder-slate-500 w-36"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    {/* Estado */}
                    <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                        className="px-3 py-2 rounded-xl text-sm text-white"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <option value="" style={{ background: '#1e293b' }}>Todos los estados</option>
                        {Object.entries(BENEF_EST).map(([k, v]) => <option key={k} value={k} style={{ background: '#1e293b' }}>{v.label}</option>)}
                    </select>
                    {/* Tipología */}
                    {tipologias.length > 0 && (
                        <select value={filtroTipologia} onChange={e => setFiltroTipologia(e.target.value)}
                            className="px-3 py-2 rounded-xl text-sm text-white"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <option value="" style={{ background: '#1e293b' }}>Todas las tipologías</option>
                            {tipologias.map(t => (
                                <option key={t.id} value={t.id} style={{ background: '#1e293b' }}>
                                    {t.nombre}{t.metros_cuadrados ? ` (${t.metros_cuadrados} m²)` : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* ─── Grid de cards ─── */}
                {beneficiarios.length === 0 ? (
                    <div className="flex flex-col items-center py-20 gap-4">
                        <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                            <Users size={36} className="text-emerald-400" />
                        </div>
                        <p className="text-slate-400 text-lg">No hay beneficiarios registrados</p>
                        {canEditEfectivo && !limiteAlcanzado && (
                            <button onClick={() => setModalForm('crear')}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white mt-2"
                                style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)' }}>
                                <Plus size={15} /> Registrar primer beneficiario
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {beneficiarios.map(b => (
                            <BeneficiarioCard key={b.id} b={b} onClick={() => setModalDetalle(b)} />
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Modales ─── */}
            {modalDetalle && (
                <ModalDetalle b={modalDetalle} canEdit={canEditEfectivo}
                    onClose={() => setModalDetalle(null)}
                    onEditar={b => { setModalForm(b); setModalDetalle(null); }}
                    onDarDeBaja={b => { setModalBaja(b); setModalDetalle(null); }}
                    onVerHistorialSync={b => { setModalDetalle(null); setModalSync({ beneficiario: b, nuevoTipoId: null }); }} />
            )}
            {modalForm && (
                <FormularioBeneficiario
                    proyectoId={id}
                    beneficiario={modalForm === 'crear' ? null : modalForm}
                    tipologias={tipologias}
                    onClose={() => setModalForm(null)}
                    onGuardado={() => { setModalForm(null); cargarBeneficiarios(); cargarDatos(); }}
                    onTipoCambiado={(benef, nuevoTipoId) => {
                        setModalForm(null);
                        cargarBeneficiarios();
                        cargarDatos();
                        setModalSync({ beneficiario: benef, nuevoTipoId });
                    }} />
            )}
            {modalSync && (
                <SyncTipologiaModal
                    beneficiario={modalSync.beneficiario}
                    nuevoTipoId={modalSync.nuevoTipoId ?? null}
                    onClose={() => setModalSync(null)}
                    onSincronizado={() => { setModalSync(null); cargarBeneficiarios(); cargarDatos(); }} />
            )}
            {modalBaja && (
                <ModalBaja beneficiario={modalBaja} loading={bajaLoading}
                    onClose={() => setModalBaja(null)}
                    onConfirmar={darDeBaja} />
            )}

            {/* ─── Modal confirmar cierre ─── */}
            {modalCerrar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
                    <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#0d1117', border: '1px solid rgba(248,113,113,0.25)' }}>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
                                    <Lock size={18} className="text-red-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Terminar registros de beneficiarios</h2>
                                    <p className="text-xs text-slate-500">Esta acción cierra el padrón de beneficiarios</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl mb-5" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                                <p className="text-sm text-amber-300">
                                    <strong>Atención:</strong> Una vez cerrados los registros, no se podrán agregar ni modificar beneficiarios.
                                    Para reabrir se necesitará un código OTP enviado a su correo.
                                </p>
                                <p className="text-xs text-slate-500 mt-2">
                                    Beneficiarios actuales: <strong className="text-white">{estadoCierre?.total_inscritos ?? 0}</strong> / {estadoCierre?.cupo_total ?? '?'}
                                </p>
                            </div>
                            <div className="flex items-center justify-end gap-3">
                                <button onClick={() => setModalCerrar(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                                <button onClick={handleCerrarRegistros} disabled={cierreLoading}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                                    style={{ background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.4)' }}>
                                    <Lock size={13} /> {cierreLoading ? 'Cerrando...' : 'Sí, terminar registros'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Modal OTP reapertura ─── */}
            {modalOtp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
                    <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: '#0d1117', border: '1px solid rgba(251,191,36,0.25)' }}>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                                    <Key size={18} className="text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Código de reapertura</h2>
                                    <p className="text-xs text-slate-500">Revise su correo electrónico</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 mb-4">Ingrese el código de 8 caracteres enviado a su correo para confirmar la reapertura de registros.</p>
                            <input
                                value={otpCodigo}
                                onChange={e => setOtpCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                                placeholder="Ej: AB3K9XPQ"
                                className="w-full text-center text-2xl font-bold tracking-[0.3em] px-4 py-4 rounded-xl text-white mb-5"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(251,191,36,0.3)', letterSpacing: '0.3em' }}
                                maxLength={8}
                            />
                            <div className="flex items-center justify-end gap-3">
                                <button onClick={() => { setModalOtp(false); setOtpCodigo(''); }} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                                <button onClick={handleVerificarOtp} disabled={cierreLoading || otpCodigo.length !== 8}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-50"
                                    style={{ background: '#fbbf24' }}>
                                    <Unlock size={13} /> {cierreLoading ? 'Verificando...' : 'Confirmar reapertura'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
