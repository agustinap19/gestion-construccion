import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotificaciones } from '../../context/NotificacionContext';
import { useTheme } from '../../context/ThemeContext';
import { Menu, Search, Bell, ChevronRight, LogOut, Settings, User, Sun, Moon } from '../icons/Icons';
import { useBreadcrumb } from '../../context/BreadcrumbContext';
import Avatar from '../ui/Avatar';
import Dropdown from '../ui/Dropdown';
import Tooltip from '../ui/Tooltip';

const TopBar = ({ onOpenMobileMenu, onOpenNotificaciones, onOpenSearch }) => {
    const { usuario, logout } = useAuth();
    const { contador } = useNotificaciones();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const { overrides } = useBreadcrumb();

    const generateBreadcrumbs = () => {
        const paths = location.pathname.split('/').filter(p => p);
        if (paths.length === 0) return [];

        const pathNames = {
            'dashboard': 'Inicio',
            'notificaciones': 'Notificaciones',
            'reportes': 'Reportes',
            'usuarios': 'Usuarios',
            'roles': 'Roles',
            'proyectos': 'Proyectos',
            'materiales': 'Materiales',
            'almacenes': 'Almacenes',
            'proveedores': 'Proveedores',
            'personal': 'Personal',
            'beneficiarios': 'Beneficiarios',
            'clientes': 'Clientes',
            'entidades-estatales': 'Entidades Estatales',
            'editar': 'Editar',
            'crear': 'Crear',
            'nuevo': 'Nuevo',
            'mi-perfil': 'Mi Perfil',
            'configuracion': 'Configuración',
        };

        // Fallback label when a numeric segment has no context override
        const parentLabels = {
            'roles': 'Detalle del Rol',
            'usuarios': 'Detalle del Usuario',
            'proyectos': 'Detalle del Proyecto',
            'personal': 'Detalle',
            'beneficiarios': 'Detalle',
            'clientes': 'Detalle',
            'entidades-estatales': 'Detalle',
        };

        const breadcrumbs = [];
        let currentPath = '';

        paths.forEach((path, index) => {
            currentPath += `/${path}`;
            const isLast = index === paths.length - 1;

            let name;
            if (overrides[currentPath]) {
                name = overrides[currentPath];
            } else if (pathNames[path]) {
                name = pathNames[path];
            } else if (!isNaN(path)) {
                // Numeric ID — never expose the raw number, use a semantic label
                const parentSeg = paths[index - 1];
                name = parentLabels[parentSeg] || 'Detalle';
            } else {
                name = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
            }

            breadcrumbs.push({ name, path: currentPath, isLast });
        });

        return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const userMenuOptions = [
        { label: 'Mi Perfil', icon: <User size={16} />, onClick: () => navigate('/dashboard/mi-perfil') },
        { label: 'Configuración', icon: <Settings size={16} />, onClick: () => navigate('/dashboard/configuracion') },
        { divider: true },
        { label: theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro', icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />, onClick: toggleTheme },
        { label: 'Cerrar Sesión', icon: <LogOut size={16} />, onClick: handleLogout, danger: true },
    ];

    return (
        <header className="sticky top-0 z-30 h-14 bg-white/85 dark:bg-[#080c15]/85 backdrop-blur-2xl border-b border-slate-200/70 dark:border-white/[0.05] w-full flex items-center justify-between px-4 sm:px-6 transition-all shadow-sm dark:shadow-[0_1px_0_oklch(100%_0_0/0.04)]">

            {/* Izquierda: Menú móvil & Breadcrumbs */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onOpenMobileMenu}
                    className="lg:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                    <Menu size={24} />
                </button>

                <nav className="hidden sm:flex" aria-label="Breadcrumb">
                    <ol className="flex items-center space-x-2">
                        {breadcrumbs.map((crumb, idx) => (
                            <li key={crumb.path} className="flex items-center">
                                {idx > 0 && <ChevronRight size={14} className="text-slate-400 dark:text-slate-600 mx-2 shrink-0" />}
                                {crumb.isLast ? (
                                    <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                                        {crumb.name}
                                    </span>
                                ) : (
                                    <button 
                                        onClick={() => navigate(crumb.path)}
                                        className="text-sm font-medium text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    >
                                        {crumb.name}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>
            </div>

            {/* Derecha: Búsqueda, Notificaciones, Avatar */}
            <div className="flex items-center gap-3 sm:gap-5">
                
                {/* Search */}
                <div className="hidden md:block relative w-64" onClick={onOpenSearch}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-slate-400 dark:text-slate-500" />
                    </div>
                    <button
                        className="flex items-center justify-between w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700/50 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 text-sm text-slate-500 transition-colors"
                    >
                        <span>Buscar...</span>
                        <span className="flex gap-1 items-center font-mono text-[10px] uppercase font-bold text-slate-500">
                            <span className="bg-slate-200 dark:bg-slate-800 px-1 rounded">Ctrl</span>
                            <span className="bg-slate-200 dark:bg-slate-800 px-1 rounded">K</span>
                        </span>
                    </button>
                </div>

                {/* Botón búsqueda móvil */}
                <button 
                    onClick={onOpenSearch}
                    className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <Search size={20} />
                </button>

                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

                {/* Theme Toggle */}
                <Tooltip content="Cambiar tema (Ctrl+Shift+L)" position="bottom">
                    <button
                        onClick={toggleTheme}
                        className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <div className={`transition-transform duration-500 ${theme === 'dark' ? 'rotate-0' : 'rotate-180'}`}>
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </div>
                    </button>
                </Tooltip>

                {/* Notificaciones Toggle */}
                <button
                    onClick={onOpenNotificaciones}
                    className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <Bell size={20} />
                    {contador > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#050505]">
                            {contador > 99 ? '99+' : contador}
                        </span>
                    )}
                </button>

                {/* User Dropdown */}
                <Dropdown 
                    trigger={
                        <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none">
                            <Avatar 
                                name={`${usuario?.nombre || ''} ${usuario?.apellido_paterno || ''}`}
                                size="sm"
                            />
                            <ChevronRight size={14} className="text-slate-500 hidden sm:block rotate-90" />
                        </button>
                    }
                    items={userMenuOptions}
                    align="right"
                />
            </div>
        </header>
    );
};

export default TopBar;
