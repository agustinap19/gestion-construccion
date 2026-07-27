import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificaciones } from '../../context/NotificacionContext';
import { X, Check, Info, AlertTriangle, AlertCircle, Shield, Bell, CheckCircle, ChevronLeft, ChevronRight } from '../icons/Icons';
import notificacionService from '../../services/notificacionService';
import Button from '../ui/Button';

const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Hace unos segundos';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    return `Hace ${Math.floor(diffInSeconds / 86400)} d`;
};

const getIconForType = (tipo) => {
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

const NotificacionesPanel = ({ open, onClose }) => {
    const { contador, marcarLeida: marcarLeidaContext, marcarTodasLeidas: marcarTodasLeidasContext, cargarNoLeidas } = useNotificaciones();
    const panelRef = useRef(null);
    const navigate = useNavigate();

    const [notificaciones, setNotificaciones] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [filtro, setFiltro] = useState('no_leidas'); // 'todas', 'no_leidas'
    const [paginaLocal, setPaginaLocal] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const cargarHistorial = useCallback(async (page, filterStr) => {
        if (!open) return;
        setCargando(true);
        try {
            const isNoLeidas = filterStr === 'no_leidas' ? false : null;
            const data = await notificacionService.obtenerTodas(page, 15, isNoLeidas);
            setNotificaciones(data.data || []);
            setTotalPaginas(data.last_page || 1);
            setTotalItems(data.total || 0);
        } catch (error) {
            console.error('Error cargando historial de notificaciones:', error);
        } finally {
            setCargando(false);
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            cargarHistorial(paginaLocal, filtro);
        } else {
            // Reset state when closed so it loads fresh next time
            setPaginaLocal(1);
        }
    }, [open, paginaLocal, filtro, cargarHistorial]);

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

    const handleFilterChange = (nuevoFiltro) => {
        setFiltro(nuevoFiltro);
        setPaginaLocal(1);
    };

    const handleMarcarLeida = async (e, id) => {
        e.stopPropagation();
        await marcarLeidaContext(id);
        
        setNotificaciones(prev => prev.map(notif => 
            notif.id === id ? { ...notif, leida: true, leida_en: new Date().toISOString() } : notif
        ));
        cargarNoLeidas(); // actualiza el contador en el TopBar
    };

    const handleMarcarTodasLeidas = async () => {
        await marcarTodasLeidasContext();
        cargarHistorial(1, filtro); 
    };

    const handleNotificationClick = (notificacion) => {
        if (!notificacion.leida) {
            handleMarcarLeida({ stopPropagation: () => {} }, notificacion.id);
        }
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
                className={`fixed inset-y-0 right-0 w-full sm:w-[420px] bg-slate-950 border-l border-slate-800/50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
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

                {/* Filtros y Acciones */}
                <div className="px-4 py-3 border-b border-slate-800/50 bg-slate-900/30 flex items-center justify-between shrink-0">
                    <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-800/80">
                        <button
                            onClick={() => handleFilterChange('todas')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                filtro === 'todas' 
                                ? 'bg-slate-800 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => handleFilterChange('no_leidas')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                filtro === 'no_leidas' 
                                ? 'bg-slate-800 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                            No Leídas
                        </button>
                    </div>
                    
                    {totalItems > 0 && (
                        <button 
                            onClick={handleMarcarTodasLeidas}
                            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                        >
                            <CheckCircle size={14} />
                            <span>Marcar todas</span>
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {cargando ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
                            <p className="text-slate-400 text-sm">Cargando...</p>
                        </div>
                    ) : notificaciones.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 ring-1 ring-slate-800/50">
                                <Bell size={24} className="text-slate-500" />
                            </div>
                            <h3 className="text-white font-medium mb-1">
                                {filtro === 'no_leidas' ? "Todo al día" : "Sin notificaciones"}
                            </h3>
                            <p className="text-sm text-slate-400">
                                {filtro === 'no_leidas' ? "No tienes notificaciones pendientes de leer." : "Aún no has recibido ninguna notificación en el sistema."}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/50">
                            {notificaciones.map((notificacion) => (
                                <div 
                                    key={notificacion.id}
                                    onClick={() => handleNotificationClick(notificacion)}
                                    className={`relative p-4 cursor-pointer transition-colors hover:bg-slate-800/30 flex gap-3 items-start
                                        ${!notificacion.leida ? 'bg-slate-900/40' : ''}
                                    `}
                                >
                                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${getBgColorForType(notificacion.tipo)}`}>
                                        {getIconForType(notificacion.tipo)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h4 className={`text-sm font-semibold truncate pr-2 ${notificacion.leida ? 'text-slate-300' : 'text-white'}`}>
                                                {notificacion.titulo}
                                            </h4>
                                            <span className="shrink-0 text-[10px] text-slate-500 font-medium whitespace-nowrap mt-0.5">
                                                {formatRelativeTime(notificacion.created_at)}
                                            </span>
                                        </div>
                                        {notificacion.mensaje && (
                                            <p className={`text-xs line-clamp-2 leading-relaxed ${notificacion.leida ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {notificacion.mensaje}
                                            </p>
                                        )}
                                    </div>

                                    {!notificacion.leida && (
                                        <div className="shrink-0 flex items-center">
                                            <button
                                                onClick={(e) => handleMarcarLeida(e, notificacion.id)}
                                                className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"
                                                title="Marcar como leída"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                        </div>
                                    )}

                                    {!notificacion.leida && (
                                        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-8 bg-emerald-500 rounded-r-full"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer (Paginación) */}
                {totalPaginas > 1 && (
                    <div className="p-3 border-t border-slate-800/80 bg-slate-950 shrink-0 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                            {totalItems} total
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={paginaLocal === 1}
                                onClick={() => setPaginaLocal(p => Math.max(1, p - 1))}
                                className="!px-2 !py-1 !text-xs"
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <span className="text-xs text-slate-400 font-medium px-2">
                                {paginaLocal} / {totalPaginas}
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={paginaLocal === totalPaginas}
                                onClick={() => setPaginaLocal(p => Math.min(totalPaginas, p + 1))}
                                className="!px-2 !py-1 !text-xs"
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default NotificacionesPanel;
