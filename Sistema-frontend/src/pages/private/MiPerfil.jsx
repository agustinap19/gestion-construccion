import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Shield, Clock } from '../../components/icons/Icons';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';

const MiPerfil = () => {
    const { usuario } = useAuth();
    const [activeTab, setActiveTab] = React.useState('info');

    const tabs = [
        { key: 'info', label: 'Información Personal', icon: <User size={16} /> },
        { key: 'seguridad', label: 'Seguridad', icon: <Shield size={16} /> },
        { key: 'sesiones', label: 'Sesiones Activas', icon: <Clock size={16} /> },
    ];

    return (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <User size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mi Perfil</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gestiona tu información personal y preferencias de cuenta</p>
                </div>
            </div>

            <Card className="!p-0">
                <div className="px-6 pt-6">
                    <div className="flex items-center gap-6 mb-6">
                        <Avatar 
                            name={`${usuario?.nombre || ''} ${usuario?.apellido_paterno || ''}`}
                            size="xl"
                        />
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {usuario?.nombre} {usuario?.apellido_paterno} {usuario?.apellido_materno}
                            </h2>
                            <p className="text-emerald-600 dark:text-emerald-400 font-medium capitalize mt-1">
                                {usuario?.rol?.nombre_visible || usuario?.rol?.nombre || 'Usuario'}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {usuario?.email}
                            </p>
                        </div>
                    </div>

                    <Tabs 
                        tabs={tabs} 
                        activeTab={activeTab} 
                        onChange={setActiveTab} 
                        className="mb-0"
                    />
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/20">
                    {activeTab === 'info' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre Completo</label>
                                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white">
                                        {usuario?.nombre} {usuario?.apellido_paterno} {usuario?.apellido_materno}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Correo Electrónico</label>
                                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white">
                                        {usuario?.email}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Rol en el Sistema</label>
                                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white capitalize">
                                        {usuario?.rol?.nombre_visible || usuario?.rol?.nombre}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'seguridad' && (
                        <div className="text-center py-12 animate-fade-in">
                            <Shield size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Sección en construcción</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Pronto podrás cambiar tu contraseña y gestionar la verificación biométrica desde aquí.</p>
                        </div>
                    )}

                    {activeTab === 'sesiones' && (
                        <div className="text-center py-12 animate-fade-in">
                            <Clock size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Sección en construcción</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Pronto podrás ver y gestionar tus sesiones activas en otros dispositivos.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default MiPerfil;
