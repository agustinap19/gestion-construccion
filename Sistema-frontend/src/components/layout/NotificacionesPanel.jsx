import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificaciones } from '../../context/NotificacionContext';
import { X, Check, Info, AlertTriangle, AlertCircle, Shield, Bell } from '../icons/Icons';
import Button from '../ui/Button';

const NotificacionesPanel = ({ open, onClose }) => {
    const { noLeidas, contador, marcarLeida, marcarTodasLeidas } = useNotificaciones();
    const panelRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (open && panelRef.current && !panelRef.current.contains(event.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape' && open) onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose]);

    if (!open && noLeidas.length === 0) {
        // Optimización: no renderizar si está cerrado, a menos que queramos mantener estado de animación
    }

    const formatRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Hace unos segundos';
        if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
        if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
        return `Hace ${Math.floor(diffInSeconds / 86400)} d`;
    };

    const getIconForType = (tipo, iconName) => {
        switch (tipo) {
            case 'success': return <Check size={18} className="text-emerald-400" />;
            case 'warning': return <AlertTriangle size={18} className="text-amber-400" />;
            case 'error': return <AlertCircle size={18} className="text-red-400" />;
            case 'security': return <Shield size={18} className="text-purple-400" />;
            default: return <Info size={18} className="text-blue-400" />;
        }
    };

    const getBgColorForType = (tipo) => {
        switch (tipo) {
            case 'success': return 'bg-emerald-500/10 border-emerald-500/20';
            case 'warning': return 'bg-amber-500/10 border-amber-500/20';
            case 'error': return 'bg-red-500/10 border-red-500/20';
            case 'security': return 'bg-purple-500/10 border-purple-500/20';
            default: return 'bg-blue-500/10 border-blue-500/20';
        }
    };

    const handleNotificationClick = (notificacion) => {
        marcarLeida(notificacion.id);
        if (notificacion.url_accion) {
            navigate(notificacion.url_accion);
            onClose();
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-[#050505]/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                aria-hidden="true"
            />
            
            {/* Panel */}
            <div 
                ref={panelRef}
                className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-950 border-l border-slate-800/50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-white">Notificaciones</h2>
                        {contador > 0 && (
                            <span className="bg-emerald-500 text-[#050505] text-xs font-bold px-2 py-0.5 rounded-full">
                                {contador}
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors focus:outline-none"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Actions */}
                {noLeidas.length > 0 && (
                    <div className="px-6 py-3 border-b border-slate-800/50 flex justify-end shrink-0">
                        <button 
                            onClick={marcarTodasLeidas}
                            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            Marcar todas como leídas
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
                    {noLeidas.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 ring-1 ring-slate-800/50">
                                <Bell size={24} className="text-slate-500" />
                            </div>
                            <h3 className="text-white font-medium mb-1">Todo al día</h3>
                            <p className="text-sm text-slate-400">No tienes notificaciones pendientes de leer.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {noLeidas.map((notificacion) => (
                                <div 
                                    key={notificacion.id}
                                    onClick={() => handleNotificationClick(notificacion)}
                                    className={`relative p-4 rounded-xl cursor-pointer transition-all hover:bg-slate-900 group border border-transparent hover:border-slate-800/50 ${notificacion.url_accion ? 'hover:-translate-y-0.5' : ''}`}
                                >
                                    <div className="flex gap-4">
                                        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${getBgColorForType(notificacion.tipo)}`}>
                                            {getIconForType(notificacion.tipo, notificacion.icono)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="text-sm font-semibold text-white truncate pr-2">
                                                    {notificacion.titulo}
                                                </h4>
                                                <span className="shrink-0 text-[10px] text-slate-500 font-medium whitespace-nowrap mt-0.5">
                                                    {formatRelativeTime(notificacion.created_at)}
                                                </span>
                                            </div>
                                            {notificacion.mensaje && (
                                                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                                    {notificacion.mensaje}
                                                </p>
                                            )}
                                        </div>
                                        
                                        {/* Indicador de no leída */}
                                        <div className="absolute top-1/2 -translate-y-1/2 left-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800/80 bg-slate-950 shrink-0">
                    <Button 
                        variant="secondary" 
                        fullWidth 
                        onClick={() => {
                            navigate('/dashboard/notificaciones');
                            onClose();
                        }}
                    >
                        Ver todo el historial
                    </Button>
                </div>
            </div>
        </>
    );
};

export default NotificacionesPanel;
