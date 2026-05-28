import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useLoading } from '../../../context/LoadingContext';
import { almacenService } from '../../../services/almacenService';
import proyectoService from '../../../services/proyectoService';
import {
    ArrowLeft, Warehouse, Plus, Package, ChevronRight,
    MapPin, User, AlertTriangle
} from '../../../components/icons/Icons';
import Badge from '../../../components/ui/Badge';
import AlmacenFormModal from '../almacenes/AlmacenFormModal';

const ESTADO_BADGE = { activo: 'success', inactivo: 'warning', cerrado: 'danger' };

const AlmacenProyecto = () => {
    const { id }   = useParams();
    const navigate = useNavigate();
    const { startLoading, stopLoading } = useLoading();

    const [proyecto, setProyecto]   = useState(null);
    const [almacenes, setAlmacenes] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        try {
            startLoading();
            const [resProyecto, resAlm] = await Promise.all([
                proyectoService.obtener(id).catch(() => null),
                almacenService.listar({ proyecto_id: id, per_page: 50 }),
            ]);
            setProyecto(resProyecto);
            setAlmacenes(resAlm.data?.data || []);
        } catch {
            toast.error('No se pudo cargar la información del almacén.');
        } finally {
            stopLoading();
        }
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/dashboard/proyectos/${id}`)}
                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center
                                   text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Warehouse className="w-6 h-6 text-sky-400" />
                            Almacenes del Proyecto
                        </h1>
                        {proyecto && (
                            <p className="text-slate-400 text-sm mt-0.5">{proyecto.nombre} · {proyecto.codigo}</p>
                        )}
                    </div>
                </div>
                <button onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                               bg-gradient-to-r from-sky-600 to-blue-700
                               text-white font-medium text-sm shadow-lg
                               hover:from-sky-500 hover:to-blue-600 transition-all">
                    <Plus className="w-4 h-4" /> Nuevo Almacén
                </button>
            </div>

            {/* List */}
            {almacenes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                        <Warehouse className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400 font-medium">Sin almacenes para este proyecto</p>
                    <p className="text-slate-600 text-sm mt-1">Crea un almacén de obra para gestionar el inventario.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {almacenes.map((alm, idx) => (
                        <motion.div key={alm.id}
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                            onClick={() => navigate(`/dashboard/almacenes/${alm.id}`)}
                            className="group relative cursor-pointer rounded-2xl border border-white/10 bg-white/5
                                       hover:bg-white/8 hover:border-sky-500/30 transition-all duration-300 hover:-translate-y-1
                                       shadow-xl shadow-black/30 p-5">
                            <div className="h-1 w-full absolute top-0 left-0 right-0 rounded-t-2xl bg-gradient-to-r from-sky-500 to-blue-600" />
                            <div className="flex items-start justify-between mb-3 mt-1">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow">
                                    <Warehouse className="w-5 h-5 text-white" />
                                </div>
                                <Badge variant={ESTADO_BADGE[alm.estado] || 'default'} size="sm">{alm.estado}</Badge>
                            </div>
                            <h3 className="text-white font-semibold text-sm mb-0.5">{alm.nombre}</h3>
                            <p className="text-slate-500 text-xs mb-3">{alm.codigo}</p>
                            {alm.ubicacion && (
                                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                                    <MapPin className="w-3.5 h-3.5" /> {alm.ubicacion}
                                </div>
                            )}
                            {alm.responsable && (
                                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                    <User className="w-3.5 h-3.5" /> {alm.responsable.nombre}
                                </div>
                            )}
                            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {modalOpen && (
                <AlmacenFormModal
                    almacen={{ tipo: 'obra', proyecto_id: id }}
                    onClose={() => setModalOpen(false)}
                    onGuardado={() => { setModalOpen(false); loadData(); }}
                />
            )}
        </div>
    );
};

export default AlmacenProyecto;
