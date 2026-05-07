import React from 'react';
import { Settings, Sun, Moon, Bell } from '../../components/icons/Icons';
import Card from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';

const Configuracion = () => {
    const { theme, setTheme } = useTheme();
    const [notificacionesEnSistema, setNotificacionesEnSistema] = React.useState(true);

    return (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Settings size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración</h1>
                    <p className="text-slate-500 dark:text-slate-400">Personaliza la apariencia y el comportamiento del sistema</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Apariencia" subtitle="Gestiona el tema y visualización">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">Tema del Sistema</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setTheme('light')}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'}`}
                                >
                                    <Sun size={24} className={theme === 'light' ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400'} />
                                    <span className={`mt-2 text-sm font-medium ${theme === 'light' ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`}>Claro</span>
                                </button>
                                <button 
                                    onClick={() => setTheme('dark')}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'}`}
                                >
                                    <Moon size={24} className={theme === 'dark' ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-400'} />
                                    <span className={`mt-2 text-sm font-medium ${theme === 'dark' ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`}>Oscuro</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">Tamaño de Fuente (Próximamente)</label>
                            <div className="flex gap-3">
                                {['Pequeño', 'Normal', 'Grande'].map(size => (
                                    <button key={size} disabled className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed">
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card title="Notificaciones" subtitle="Preferencias de alertas">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <Bell size={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Notificaciones en sistema</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Mostrar panel y contadores</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setNotificacionesEnSistema(!notificacionesEnSistema)}
                                className={`w-11 h-6 rounded-full transition-colors relative ${notificacionesEnSistema ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notificacionesEnSistema ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>
                        
                        <div className="flex items-center justify-between opacity-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <Bell size={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Sonidos</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Reproducir sonido al recibir</p>
                                </div>
                            </div>
                            <button disabled className="w-11 h-6 rounded-full bg-slate-300 dark:bg-slate-700 relative cursor-not-allowed">
                                <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white" />
                            </button>
                        </div>
                    </div>
                </Card>

                <Card title="Atajos de Teclado" subtitle="Acciones rápidas" className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { keys: ['Ctrl', 'K'], desc: 'Búsqueda global' },
                            { keys: ['Ctrl', 'B'], desc: 'Colapsar barra lateral' },
                            { keys: ['Ctrl', 'Shift', 'L'], desc: 'Cambiar tema' },
                            { keys: ['Ctrl', ','], desc: 'Abrir configuración' },
                            { keys: ['Esc'], desc: 'Cerrar modales/menús' },
                        ].map((atajo, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                                <span className="text-sm text-slate-600 dark:text-slate-300">{atajo.desc}</span>
                                <div className="flex gap-1">
                                    {atajo.keys.map(k => (
                                        <kbd key={k} className="px-2 py-1 text-xs font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm text-slate-600 dark:text-slate-300">
                                            {k}
                                        </kbd>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Configuracion;
