import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Wrench, Plus, Home, ClipboardList, ChevronRight, Activity, DollarSign, Calendar } from '../../components/icons/Icons';
import { useBreadcrumbTitle } from '../../context/BreadcrumbContext';
import { useAuth } from '../../context/AuthContext';
import { activoService } from '../../services/activoService';
import { asignacionActivoService } from '../../services/asignacionActivoService';
import proyectoService from '../../services/proyectoService';
import NuevaAsignacionModal from '../../components/activos/NuevaAsignacionModal';
import AsignacionDrawer from '../../components/activos/AsignacionDrawer';
import { formatFecha } from '../../utils/format';
import { Button, Badge } from '../../components/ui';

// Nuevos componentes del Dashboard
import KpiCard from '../../components/ui/KpiCard';
import MapaVRPWidget from '../../components/activos/MapaVRPWidget';
import VistaGanttAsignaciones from '../../components/activos/VistaGanttAsignaciones';

const ESTADO_ACTIVO_CFG = {
    disponible:    { label: 'Disponible',    variant: 'light', color: 'success' },
    asignado:      { label: 'Asignado',      variant: 'light', color: 'primary' },
    mantenimiento: { label: 'Mantenimiento', variant: 'light', color: 'warning' },
    baja:          { label: 'De baja',       variant: 'light', color: 'error' },
};

const ESTADO_ASIG_CFG = {
    planificada: { label: 'Planificada', variant: 'light', color: 'info' },
    activa:      { label: 'Activa',      variant: 'light', color: 'primary' },
    completada:  { label: 'Completada',  variant: 'light', color: 'success' },
    cancelada:   { label: 'Cancelada',   variant: 'light', color: 'error' },
};

export default function AsignacionesPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    
    const [activo, setActivo] = useState(null);
    const [asignaciones, setAsignaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalNueva, setModalNueva] = useState(false);
    const [drawerAsignacion, setDrawerAsignacion] = useState(null);

    // Modo del widget VRP: 'proyectos' (Simplex) o 'viviendas' (distribuir un proyecto social)
    const [modoVRP, setModoVRP] = useState('proyectos');
    const [proyectoFijoVRP, setProyectoFijoVRP] = useState(null);

    // Deep-link: ?modo=viviendas&proyecto_id=X
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const modo = params.get('modo');
        const proyectoId = params.get('proyecto_id');
        if (modo === 'viviendas' && proyectoId) {
            // proyectoService.obtener() devuelve { proyecto, auditoria, estadisticas, ... },
            // no el proyecto directo.
            proyectoService.obtener(proyectoId)
                .then(res => { setProyectoFijoVRP(res.proyecto); setModoVRP('viviendas'); })
                .catch(() => {});
        }
    }, []);

    const abrirDistribucionViviendas = (asignacion) => {
        proyectoService.obtener(asignacion.proyecto_id)
            .then(res => { setProyectoFijoVRP(res.proyecto); setModoVRP('viviendas'); })
            .catch(() => toast.error('Error al cargar el proyecto.'));
    };

    useBreadcrumbTitle(`/dashboard/activos/${id}`, activo?.nombre);
    useBreadcrumbTitle(`/dashboard/activos/${id}/asignaciones`, 'Asignaciones');

    const cargar = useCallback(async () => {
        try {
            setLoading(true);
            const dataActivo = await activoService.obtener(id);
            setActivo(dataActivo?.data || dataActivo);
            
            const reqAsig = await asignacionActivoService.listarPorActivo(id, { per_page: 100 });
            setAsignaciones(reqAsig.data?.data || reqAsig.data || []);
        } catch (error) {
            toast.error('Error al cargar datos del activo');
            navigate('/dashboard/activos');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const handleCreado = () => {
        setModalNueva(false);
        cargar();
    };

    const asignacionesSocialesPendientes = asignaciones.filter(
        a => a.proyecto?.categoria === 'social' && ['planificada', 'activa'].includes(a.estado)
    );
    // Un proyecto puede aparecer varias veces (una asignación por vivienda) — un solo
    // link por proyecto, con la cuenta de cuántas viviendas tiene pendientes.
    const proyectosSocialesUnicos = [...new Map(
        asignacionesSocialesPendientes.filter(a => a.proyecto).map(a => [a.proyecto_id, a.proyecto])
    ).values()];

    if (loading && !activo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
            </div>
        );
    }

    const estadoActivoCfg = ESTADO_ACTIVO_CFG[activo?.estado] || ESTADO_ACTIVO_CFG.disponible;

    return (
        <div className="min-h-screen p-6 space-y-8 bg-[#0a0a0a]">
            {/* Header del Dashboard */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 border border-violet-500/20 flex items-center justify-center shadow-lg shadow-violet-900/20">
                        <Wrench className="w-7 h-7 text-violet-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-white text-2xl font-bold tracking-tight">{activo?.nombre}</h1>
                            <Badge variant={estadoActivoCfg.variant} color={estadoActivoCfg.color}>{estadoActivoCfg.label}</Badge>
                        </div>
                        <p className="text-white/50 text-sm mt-1">{activo?.codigo} · {[activo?.marca, activo?.modelo].filter(Boolean).join(' ') || 'Sin marca/modelo'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasPermission('activos.asignar') && (
                        <Button onClick={() => setModalNueva(true)} startIcon={<Plus className="w-4 h-4" />}>
                            Nueva asignación
                        </Button>
                    )}
                </div>
            </div>

            {/* KPIs Holográficos Dinámicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <KpiCard 
                    title="Horas Operativas" 
                    value={`${Number(activo?.horas_uso_acumuladas || 0).toLocaleString('es-BO')} h`} 
                    subtitle={`${((Number(activo?.horas_uso_acumuladas || 0) / (Number(activo?.horas_mantenimiento_cada || 1))) * 100).toFixed(1)}% del ciclo actual`}
                    icon={<Activity />} 
                    color="emerald" 
                />
                <KpiCard 
                    title="Costo de Operación" 
                    value={`Bs. ${(Number(activo?.costo_dia_uso || 0) * (Number(activo?.horas_uso_acumuladas || 0) / 8)).toLocaleString('es-BO', { maximumFractionDigits: 0 })}`} 
                    subtitle={`Bs. ${Number(activo?.costo_dia_uso || 0)}/día`}
                    icon={<DollarSign />} 
                    color="violet" 
                />
                <KpiCard 
                    title="Próximo Mantenimiento" 
                    value={
                        (Number(activo?.horas_mantenimiento_cada || 0) - Number(activo?.horas_uso_acumuladas || 0)) > 0 
                        ? `En ${(Number(activo?.horas_mantenimiento_cada || 0) - Number(activo?.horas_uso_acumuladas || 0)).toLocaleString('es-BO')} h`
                        : 'Mantenimiento Urgente'
                    }
                    subtitle={`Ciclo de ${activo?.horas_mantenimiento_cada || 0} h`}
                    icon={<Wrench />} 
                    color={(Number(activo?.horas_mantenimiento_cada || 0) - Number(activo?.horas_uso_acumuladas || 0)) <= 50 ? 'red' : 'amber'} 
                />
                <KpiCard 
                    title="Asignaciones Activas" 
                    value={asignaciones.filter(a => a.estado === 'activa').length} 
                    subtitle={`De un total de ${asignaciones.length} registradas`}
                    icon={<Calendar />} 
                    color="blue" 
                />
            </div>

            {/* Fila Principal: Mapa VRP y Asignaciones Pendientes */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Mapa VRP Widget (Ocupa 2 columnas en XL) */}
                <div className="xl:col-span-2 flex flex-col gap-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Home className="w-5 h-5 text-violet-400" />
                        Mapa de Operaciones y Rutas VRP
                    </h2>
                    <MapaVRPWidget
                        activo={activo}
                        asignaciones={asignaciones}
                        modoInicial={modoVRP}
                        proyectoFijoInicial={proyectoFijoVRP}
                    />
                </div>

                {/* Tareas / Asignaciones (Cards) */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-violet-400" />
                        Cola de Asignaciones
                    </h2>
                    
                    <div className="bg-[#0d0f1a] border border-white/10 rounded-3xl p-4 h-[500px] overflow-y-auto scrollbar-thin space-y-4 shadow-xl">
                        {asignaciones.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/30 gap-3">
                                <ClipboardList className="w-12 h-12" />
                                <p className="text-sm">Sin asignaciones programadas</p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {asignaciones.map((a, i) => {
                                    const cfg = ESTADO_ASIG_CFG[a.estado] || ESTADO_ASIG_CFG.planificada;
                                    return (
                                        <motion.div 
                                            key={a.id} 
                                            initial={{ opacity: 0, x: 20 }} 
                                            animate={{ opacity: 1, x: 0 }} 
                                            transition={{ delay: i * 0.1 }}
                                            onClick={() => setDrawerAsignacion(a)}
                                            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 hover:bg-white/[0.04] cursor-pointer transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant={cfg.variant} color={cfg.color}>{cfg.label}</Badge>
                                                <span className="text-xs font-mono text-white/30">{formatFecha(a.fecha_inicio)}</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">{a.proyecto?.nombre}</h4>
                                            <p className="text-xs text-white/50 mt-1 line-clamp-1">{a.proyecto?.codigo} · {a.proyecto?.categoria === 'social' ? 'Social' : 'Privado'}</p>
                                            
                                            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                                                <span className="text-xs text-white/40">Gestionar Actas</span>
                                                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-violet-400" />
                                            </div>

                                            {a.proyecto?.categoria === 'social' && ['activa', 'planificada'].includes(a.estado) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); abrirDistribucionViviendas(a); }}
                                                    className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-medium hover:bg-blue-500/20 transition-colors"
                                                >
                                                    <Home className="w-3 h-3" />
                                                    Distribuir entre viviendas
                                                </button>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

            {/* Vista Gantt Inferior */}
            {asignaciones.length > 0 && (
                <div className="pt-4">
                    <VistaGanttAsignaciones asignaciones={asignaciones} onTaskClick={(task) => {
                        const asig = asignaciones.find(a => `Task_${a.id}` === task.id);
                        if (asig) setDrawerAsignacion(asig);
                    }} />
                </div>
            )}

            {/* Préstamo Social Alerta — un proyecto puede tener varias viviendas pendientes,
                y puede haber más de un proyecto social pendiente a la vez */}
            {proyectosSocialesUnicos.length > 0 && (
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-lg shadow-emerald-900/20 space-y-2">
                    <p className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                        <Home className="w-4 h-4" /> Préstamos sociales pendientes
                    </p>
                    {proyectosSocialesUnicos.map(proyecto => {
                        const pendientesProyecto = asignacionesSocialesPendientes.filter(a => a.proyecto_id === proyecto.id).length;
                        return (
                            <button key={proyecto.id}
                                onClick={() => navigate(`/dashboard/activos/${id}/prestamos-sociales`)}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/20 transition-colors text-left">
                                <span className="text-sm text-white/80">{proyecto.nombre}</span>
                                <span className="flex items-center gap-1.5 text-xs text-emerald-300">
                                    {pendientesProyecto} pendiente{pendientesProyecto !== 1 ? 's' : ''}
                                    <ChevronRight className="w-4 h-4" />
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
            )}

            {/* Modales y Drawers */}
            <AnimatePresence>
                {modalNueva && activo && (
                    <NuevaAsignacionModal activo={activo} onClose={() => setModalNueva(false)} onCreado={handleCreado} />
                )}
                {drawerAsignacion && (
                    <AsignacionDrawer asignacion={drawerAsignacion} onClose={() => setDrawerAsignacion(null)}
                        onUpdated={() => { setDrawerAsignacion(null); cargar(); }} />
                )}
            </AnimatePresence>
        </div>
    );
}
