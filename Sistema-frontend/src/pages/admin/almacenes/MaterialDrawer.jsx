import React, { useState } from 'react';
import { X, Package, FileText, Activity, AlertCircle } from '../../../components/icons/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '../../../components/ui/Badge';
import AuditoriaTimeline from '../../../components/ui/AuditoriaTimeline';

const MaterialDrawer = ({ isOpen, onClose, material }) => {
    const [activeTab, setActiveTab] = useState('info');

    if (!isOpen || !material) return null;

    const tabs = [
        { id: 'info', label: 'Información', icon: FileText },
        { id: 'consumo', label: 'Historial', icon: Activity },
        { id: 'auditoria', label: 'Auditoría', icon: AlertCircle },
    ];

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-md h-full bg-white dark:bg-[#080c15] shadow-2xl flex flex-col border-l border-slate-200 dark:border-white/10"
            >
                {/* Header */}
                <div className="relative h-48 bg-slate-100 dark:bg-slate-800 shrink-0">
                    {material.imagen_url ? (
                        <img src={material.imagen_url} alt={material.nombre} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <Package size={48} className="mb-2 opacity-50" />
                            <span className="text-sm font-medium">Sin imagen</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                    
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex gap-2 mb-2">
                            <Badge variant={material.activo ? 'success' : 'danger'}>
                                {material.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                            {material.tipo === 'especial' && (
                                <Badge variant="warning">Especial de Proyecto</Badge>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-white leading-tight drop-shadow-md">
                            {material.nombre}
                        </h2>
                        <p className="text-slate-300 text-sm font-medium drop-shadow mt-1 flex items-center gap-2">
                            <span>{material.codigo}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-400" />
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: material.categoria?.color || '#ccc' }} />
                                {material.categoria?.nombre}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Tabs nav */}
                <div className="flex items-center px-4 border-b border-slate-200 dark:border-white/5 overflow-x-auto shrink-0">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === tab.id 
                                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                                }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                    <AnimatePresence mode="wait">
                        {activeTab === 'info' && (
                            <motion.div 
                                key="info"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                {/* Info Cards */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-100 dark:border-white/5">
                                        <p className="text-xs text-slate-500 mb-1">Precio Referencial</p>
                                        <p className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                                            Bs. {Number(material.precio_referencial || 0).toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Por {material.unidad_medida?.simbolo}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-100 dark:border-white/5">
                                        <p className="text-xs text-slate-500 mb-1">Stock Mínimo</p>
                                        <p className="font-bold text-lg text-slate-900 dark:text-white">
                                            {Number(material.stock_minimo || 0)} <span className="text-sm font-medium text-slate-400">{material.unidad_medida?.simbolo}</span>
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Alerta de escasez</p>
                                    </div>
                                </div>

                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                                        <span className="text-slate-500">Marca / Fabricante</span>
                                        <span className="font-medium text-slate-900 dark:text-white">{material.marca || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                                        <span className="text-slate-500">Unidad de Medida Base</span>
                                        <span className="font-medium text-slate-900 dark:text-white">{material.unidad_medida?.nombre} ({material.unidad_medida?.simbolo})</span>
                                    </div>
                                    {material.tipo === 'especial' && (
                                        <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                                            <span className="text-slate-500">Proyecto Asignado</span>
                                            <span className="font-medium text-slate-900 dark:text-white text-right max-w-[60%]">{material.proyecto?.nombre || '-'}</span>
                                        </div>
                                    )}
                                </div>

                                {material.descripcion && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Descripción</p>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 whitespace-pre-wrap">
                                            {material.descripcion}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'consumo' && (
                            <motion.div 
                                key="consumo"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center justify-center py-12 text-center"
                            >
                                <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-400 mb-4">
                                    <Activity size={32} />
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Historial de Consumo</h3>
                                <p className="text-sm text-slate-500 max-w-xs">
                                    Esta sección mostrará las estadísticas de uso y variaciones de precio en las próximas fases del proyecto (Módulo de Compras).
                                </p>
                            </motion.div>
                        )}

                        {activeTab === 'auditoria' && (
                            <motion.div 
                                key="auditoria"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <AuditoriaTimeline entidadTipo="material" entidadId={material.id} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default MaterialDrawer;
