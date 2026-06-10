import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Truck, ChevronLeft, Edit, Building2, User, Phone, Mail,
    MapPin, AlertCircle, CheckCircle, Lock, ExternalLink, Package
} from '../../../components/icons/Icons';
import { proveedorService } from '../../../services/proveedorService';
import ProveedorFormModal from './ProveedorFormModal';

const ESTADO_CFG = {
    activo:    { label: 'Activo',    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    inactivo:  { label: 'Inactivo',  cls: 'bg-slate-500/15  text-slate-300  border-slate-500/30'  },
    bloqueado: { label: 'Bloqueado', cls: 'bg-red-500/15    text-red-300    border-red-500/30'    },
};

function InfoField({ label, value, mono }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-white/40 text-xs mb-0.5">{label}</p>
            <p className={`text-white/80 text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
        </div>
    );
}

function Stars({ value }) {
    const n = parseFloat(value) || 0;
    return (
        <span className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(i => (
                <span key={i} className={`text-base ${i <= Math.round(n) ? 'text-amber-400' : 'text-white/15'}`}>★</span>
            ))}
            <span className="text-white/60 text-sm ml-1">{n.toFixed(1)}</span>
        </span>
    );
}

export default function DetalleProveedor() {
    const { id }     = useParams();
    const navigate   = useNavigate();

    const [proveedor, setProveedor] = useState(null);
    const [loading, setLoading]     = useState(true);
    const [editando, setEditando]   = useState(false);

    const cargar = async () => {
        setLoading(true);
        try {
            const res = await proveedorService.obtener(id);
            setProveedor(res.data);
        } catch {
            toast.error('No se encontró el proveedor.');
            navigate('/dashboard/proveedores');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, [id]);

    const handleEstado = async (nuevoEstado) => {
        try {
            await proveedorService.cambiarEstado(id, nuevoEstado);
            toast.success('Estado actualizado.');
            cargar();
        } catch {
            toast.error('Error al cambiar estado.');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
        </div>
    );

    if (!proveedor) return null;

    const estadoCfg = ESTADO_CFG[proveedor.estado] ?? ESTADO_CFG.inactivo;
    const TipoIcon  = proveedor.tipo === 'empresa' ? Building2 : User;

    return (
        <div className="min-h-screen p-6 space-y-6 max-w-5xl mx-auto">

            {/* Breadcrumb */}
            <button onClick={() => navigate('/dashboard/proveedores')}
                className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
                <ChevronLeft className="w-4 h-4" /> Proveedores
            </button>

            {/* Header card */}
            <div className="rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/30 to-purple-500/20 border border-white/10 flex items-center justify-center">
                            <TipoIcon className="w-7 h-7 text-violet-300" />
                        </div>
                        <div>
                            <h1 className="text-white text-xl font-bold">{proveedor.razon_social}</h1>
                            {proveedor.nombre_comercial && (
                                <p className="text-white/50 text-sm">{proveedor.nombre_comercial}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-white/30 text-xs font-mono">{proveedor.codigo}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${estadoCfg.cls}`}>
                                    {estadoCfg.label}
                                </span>
                                <span className="text-white/30 text-xs">
                                    {proveedor.tipo === 'empresa' ? 'Empresa' : 'Persona Natural'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {proveedor.estado === 'activo' ? (
                            <button onClick={() => handleEstado('inactivo')}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs hover:bg-amber-500/20 transition-all">
                                <AlertCircle className="w-3.5 h-3.5" /> Desactivar
                            </button>
                        ) : (
                            <button onClick={() => handleEstado('activo')}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs hover:bg-emerald-500/20 transition-all">
                                <CheckCircle className="w-3.5 h-3.5" /> Activar
                            </button>
                        )}
                        <button onClick={() => setEditando(true)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-sm hover:bg-violet-500/25 transition-all">
                            <Edit className="w-4 h-4" /> Editar
                        </button>
                    </div>
                </div>

                {proveedor.calificacion && (
                    <div className="mt-4 pt-4 border-t border-white/8">
                        <p className="text-white/40 text-xs mb-1">Calificación</p>
                        <Stars value={proveedor.calificacion} />
                    </div>
                )}
            </div>

            {/* Grid de detalles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Información fiscal */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-5 space-y-4">
                    <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider">Información Fiscal</h2>
                    <div className="space-y-3">
                        <InfoField label="NIT / CI" value={proveedor.nit} mono />
                        <InfoField label="Categoría" value={proveedor.categoria?.nombre} />
                        <InfoField label="Zona Geográfica"
                            value={proveedor.zona ? `${proveedor.zona.nombre} — ${proveedor.zona.departamento}` : null} />
                    </div>
                </div>

                {/* Contacto */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-5 space-y-4">
                    <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider">Contacto</h2>
                    <div className="space-y-3">
                        {proveedor.contacto_nombre && (
                            <div className="flex items-center gap-2 text-white/70 text-sm">
                                <User className="w-4 h-4 text-white/30 shrink-0" />
                                {proveedor.contacto_nombre}
                            </div>
                        )}
                        {proveedor.telefono_principal && (
                            <div className="flex items-center gap-2 text-white/70 text-sm">
                                <Phone className="w-4 h-4 text-white/30 shrink-0" />
                                {proveedor.telefono_principal}
                                {proveedor.contacto_telefono && proveedor.contacto_telefono !== proveedor.telefono_principal && (
                                    <span className="text-white/40"> / {proveedor.contacto_telefono}</span>
                                )}
                            </div>
                        )}
                        {proveedor.email_oficial && (
                            <div className="flex items-center gap-2 text-white/70 text-sm">
                                <Mail className="w-4 h-4 text-white/30 shrink-0" />
                                <a href={`mailto:${proveedor.email_oficial}`} className="hover:text-violet-300 transition-colors">
                                    {proveedor.email_oficial}
                                </a>
                            </div>
                        )}
                        {proveedor.contacto_email && proveedor.contacto_email !== proveedor.email_oficial && (
                            <div className="flex items-center gap-2 text-white/70 text-sm">
                                <Mail className="w-4 h-4 text-white/30 shrink-0" />
                                <a href={`mailto:${proveedor.contacto_email}`} className="hover:text-violet-300 transition-colors">
                                    {proveedor.contacto_email}
                                </a>
                            </div>
                        )}
                        {proveedor.direccion && (
                            <div className="flex items-start gap-2 text-white/70 text-sm">
                                <MapPin className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                                {proveedor.direccion}
                            </div>
                        )}
                        {proveedor.sitio_web && (
                            <div className="flex items-center gap-2 text-white/70 text-sm">
                                <ExternalLink className="w-4 h-4 text-white/30 shrink-0" />
                                <a href={proveedor.sitio_web} target="_blank" rel="noopener noreferrer"
                                    className="hover:text-violet-300 transition-colors truncate">
                                    {proveedor.sitio_web}
                                </a>
                            </div>
                        )}
                        {!proveedor.contacto_nombre && !proveedor.telefono_principal && !proveedor.email_oficial && (
                            <p className="text-white/25 text-sm">Sin datos de contacto</p>
                        )}
                    </div>
                </div>

                {/* Productos/Servicios */}
                {proveedor.productos_servicios && (
                    <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-5">
                        <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Productos / Servicios</h2>
                        <p className="text-white/60 text-sm whitespace-pre-line leading-relaxed">{proveedor.productos_servicios}</p>
                    </div>
                )}

                {/* Observaciones */}
                {proveedor.observaciones && (
                    <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-5">
                        <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Observaciones</h2>
                        <p className="text-white/60 text-sm whitespace-pre-line leading-relaxed">{proveedor.observaciones}</p>
                    </div>
                )}

                {/* Historial de compras */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-5">
                    <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Historial de Compras</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl bg-white/[0.04] p-3 text-center">
                            <p className="text-white text-2xl font-bold">{proveedor.total_compras ?? 0}</p>
                            <p className="text-white/40 text-xs mt-0.5">Entradas registradas</p>
                        </div>
                        <div className="rounded-xl bg-white/[0.04] p-3 text-center">
                            <p className="text-emerald-400 text-xl font-bold font-mono">
                                Bs. {(proveedor.monto_total_compras ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-white/40 text-xs mt-0.5">Monto total comprado</p>
                        </div>
                    </div>
                    {proveedor.ultima_compra && (
                        <p className="text-white/40 text-xs mt-3">
                            Última compra: {new Date(proveedor.ultima_compra).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    )}
                </div>

                {/* Registrado por */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-5">
                    <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Registro</h2>
                    <div className="space-y-2">
                        {proveedor.registrado_por && (
                            <InfoField label="Registrado por"
                                value={`${proveedor.registrado_por.nombre} ${proveedor.registrado_por.apellido_paterno}`} />
                        )}
                        <InfoField label="Fecha de registro"
                            value={proveedor.created_at ? new Date(proveedor.created_at).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />
                        <InfoField label="Última actualización"
                            value={proveedor.updated_at ? new Date(proveedor.updated_at).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />
                    </div>
                </div>
            </div>

            {/* Modal edición */}
            <AnimatePresence>
                {editando && (
                    <ProveedorFormModal
                        proveedor={proveedor}
                        onClose={() => setEditando(false)}
                        onGuardado={() => { setEditando(false); cargar(); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
