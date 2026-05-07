import React from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { Home } from '../../components/icons/Icons';

const Dashboard = () => {
    return (
        <div className="animate-fade-in">
            <PageHeader 
                title="Inicio" 
                subtitle="Panel de control principal"
                icon={<Home size={24} className="text-emerald-600 dark:text-emerald-400" />}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <Card className="animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Proyectos Activos</h3>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <span className="font-bold">--</span>
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">0</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Módulo en construcción</div>
                </Card>
                
                <Card className="animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Alertas de Almacén</h3>
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <span className="font-bold">--</span>
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">0</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Módulo en construcción</div>
                </Card>

                <Card className="animate-slide-in-right" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Personal en Campo</h3>
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <span className="font-bold">--</span>
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">0</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Módulo en construcción</div>
                </Card>
            </div>

            <Card className="min-h-[400px] flex items-center justify-center animate-slide-in-left">
                <EmptyState 
                    icon={<Home size={32} />}
                    title="Dashboard Operativo"
                    description="El panel de control integral de la compañía será construido en la siguiente fase del desarrollo."
                />
            </Card>
        </div>
    );
};

export default Dashboard;
