import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, HardHat, Package, Truck, AlertTriangle, TrendingUp } from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import KpiCard from '../../components/dashboard/KpiCard';
import AvanceChart from '../../components/dashboard/AvanceChart';
import ProyectosPieChart from '../../components/dashboard/ProyectosPieChart';
import ActivosPieChart from '../../components/dashboard/ActivosPieChart';
import DashboardMap from '../../components/dashboard/DashboardMap';
import EventosTimeline from '../../components/dashboard/EventosTimeline';
import api from '../../services/api';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await api.get('/dashboard/general');
                setStats(data.data);
            } catch (error) {
                console.error('Error cargando estadísticas del dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    const { kpis, tendencia_financiera, charts } = stats || {};

    return (
        <div className="animate-fade-in space-y-6">
            <PageHeader 
                title="Dashboard Gerencial" 
                subtitle="Visión general e indicadores clave de rendimiento"
                icon={<TrendingUp size={24} className="text-emerald-600 dark:text-emerald-400" />}
            />
            
            {/* 1. KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                    title="Proyectos Activos" 
                    value={kpis?.proyectos?.activos || 0}
                    subtitle={`De un total de ${kpis?.proyectos?.total || 0} proyectos`}
                    icon={<Home size={20} />}
                    delay={0.1}
                    colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                />
                
                <KpiCard 
                    title="Personal en Campo" 
                    value={kpis?.personal?.activo || 0}
                    subtitle={`${kpis?.personal?.vacaciones || 0} de vacaciones`}
                    icon={<HardHat size={20} />}
                    delay={0.2}
                    colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                />

                <KpiCard 
                    title="Activos en Uso" 
                    value={kpis?.activos?.en_uso || 0}
                    subtitle={`${kpis?.activos?.mantenimiento || 0} en mantenimiento`}
                    icon={<Truck size={20} />}
                    delay={0.3}
                    colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                />

                <KpiCard 
                    title="Presupuesto Total" 
                    value={kpis?.proyectos?.presupuesto_total || 0}
                    subtitle="Valorizado en Bolivianos (Bs)"
                    icon={<TrendingUp size={20} />}
                    delay={0.4}
                    colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400"
                />
            </div>

            {/* 2. Tendencia Financiera (Ocupa 2/3) y Eventos (Ocupa 1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <AvanceChart data={tendencia_financiera || []} />
                </div>
                <div className="lg:col-span-1">
                    <EventosTimeline />
                </div>
            </div>

            {/* 3. Gráficos de Torta Estadísticos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProyectosPieChart data={charts?.proyectos_pie || []} />
                <ActivosPieChart data={charts?.activos_pie || []} />
            </div>

            {/* 4. Mapa */}
            <div className="w-full">
                <DashboardMap data={stats?.map_markers || []} />
            </div>
            
        </div>
    );
};

export default Dashboard;
