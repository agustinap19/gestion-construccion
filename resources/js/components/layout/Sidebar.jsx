import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotificaciones } from '../../context/NotificacionContext';
import { 
    Home, Bell, Briefcase, Package, Warehouse, Truck, Users, 
    Shield, FileText, ChevronLeft, ChevronRight, LogOut, Settings, User, Sun, Moon
} from '../icons/Icons';
import Avatar from '../ui/Avatar';
import Dropdown from '../ui/Dropdown';
import Tooltip from '../ui/Tooltip';
import { useLayout } from '../../context/LayoutContext';
import { useTheme } from '../../context/ThemeContext';

const Sidebar = ({ isOpenMobile, setIsOpenMobile }) => {
    const { usuario, logout } = useAuth();
    const { contador } = useNotificaciones();
    const { sidebarCollapsed: collapsed, toggleSidebar } = useLayout();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    
    const [isHovered, setIsHovered] = useState(false);
    const isActuallyCollapsed = collapsed && !isHovered;
    const isFloating = collapsed && isHovered;

    // Ocultar sidebar en móvil si se cambia de ruta
    useEffect(() => {
        setIsOpenMobile(false);
    }, [navigate, setIsOpenMobile]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isManagerOrAdmin = usuario?.rol?.nombre === 'gerente' || usuario?.rol?.nombre === 'administrador';

    const menuGroups = [
        {
            title: 'Principal',
            items: [
                { id: 'home', label: 'Inicio', icon: <Home size={20} />, path: '/dashboard' },
                { id: 'notificaciones', label: 'Notificaciones', icon: <Bell size={20} />, path: '/dashboard/notificaciones', badge: contador > 0 ? contador : null },
            ]
        },
        {
            title: 'Gestión Operativa',
            items: [
                { id: 'proyectos', label: 'Proyectos', icon: <Briefcase size={20} />, path: '/dashboard/proyectos', disabled: true },
                { id: 'materiales', label: 'Materiales', icon: <Package size={20} />, path: '/dashboard/materiales', disabled: true },
                { id: 'almacenes', label: 'Almacenes', icon: <Warehouse size={20} />, path: '/dashboard/almacenes', disabled: true },
                { id: 'proveedores', label: 'Proveedores', icon: <Truck size={20} />, path: '/dashboard/proveedores', disabled: true },
            ]
        },
        // Mostrar Administración solo para Gerente o roles específicos
        ...(isManagerOrAdmin ? [{
            title: 'Administración',
            items: [
                { id: 'usuarios', label: 'Usuarios', icon: <Users size={20} />, path: '/dashboard/usuarios', disabled: true },
                { id: 'roles', label: 'Roles y Permisos', icon: <Shield size={20} />, path: '/dashboard/roles' },
            ]
        }] : []),
        {
            title: 'Reportes',
            items: [
                { id: 'reportes', label: 'Generar Reportes', icon: <FileText size={20} />, path: '/dashboard/reportes' },
            ]
        }
    ];

    const filteredGroups = menuGroups;

    const userMenuOptions = [
        { label: 'Mi Perfil', icon: <User size={16} />, onClick: () => navigate('/dashboard/mi-perfil') },
        { label: 'Configuración', icon: <Settings size={16} />, onClick: () => navigate('/dashboard/configuracion') },
        { divider: true },
        { label: theme === 'dark' ? 'Modo claro' : 'Modo oscuro', icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />, onClick: toggleTheme },
        { divider: true },
        { label: 'Cerrar Sesión', icon: <LogOut size={16} />, onClick: handleLogout, danger: true },
    ];

    const sidebarClass = `
        fixed top-0 left-0 h-screen z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/50 flex flex-col transition-all duration-300 overflow-x-hidden
        ${isActuallyCollapsed ? 'w-[80px]' : 'w-[280px]'}
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isFloating ? 'shadow-[10px_0_50px_rgba(0,0,0,0.5)] border-r-0' : ''}
    `;

    return (
        <>
            {/* Overlay móvil */}
            {isOpenMobile && (
                <div 
                    className="fixed inset-0 bg-[#050505]/80 z-30 lg:hidden"
                    onClick={() => setIsOpenMobile(false)}
                />
            )}

            <aside 
                className={sidebarClass}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Header (Logo & Toggle) */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800/50 shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden min-w-[40px]">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">CK</span>
                        </div>
                        {!isActuallyCollapsed && (
                            <span className="text-slate-900 dark:text-white font-bold tracking-tight whitespace-nowrap animate-fade-in">
                                CA & KANAGF
                            </span>
                        )}
                    </div>
                    
                    {/* Botón colapsar - oculto en móvil */}
                    <button 
                        onClick={toggleSidebar}
                        className="hidden lg:flex w-6 h-6 items-center justify-center rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors absolute -right-3 top-5 border border-slate-200 dark:border-slate-700 z-50 shadow-sm"
                    >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                {/* Navegación */}
                <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    {filteredGroups.map((group, idx) => (
                        <div key={idx} className="mb-6 px-3">
                            {!isActuallyCollapsed && (
                                <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap overflow-hidden">
                                    {group.title}
                                </h3>
                            )}
                            <ul className="space-y-1 relative">
                                {group.items.map(item => {
                                    const isDis = item.disabled;
                                    
                                    const linkContent = (
                                        <NavLink
                                            to={isDis ? '#' : item.path}
                                            onClick={(e) => isDis && e.preventDefault()}
                                            className={({ isActive }) => `
                                                group flex items-center rounded-xl transition-all duration-200 relative overflow-hidden
                                                ${isActuallyCollapsed ? 'justify-center p-3' : 'px-3 py-2.5'}
                                                ${isDis ? 'opacity-50 cursor-not-allowed' : ''}
                                                ${!isDis && isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}
                                            `}
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    {/* Indicador Activo Animado */}
                                                    {isActive && !isDis && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                    )}
                                                    
                                                    <span className={`${!isActuallyCollapsed && 'mr-3 pl-1'} transition-transform duration-300 group-hover:translate-x-1 shrink-0`}>
                                                        {item.icon}
                                                    </span>
                                                    
                                                    {!isActuallyCollapsed && (
                                                        <span className="flex-1 text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                                            {item.label}
                                                        </span>
                                                    )}

                                                    {!isActuallyCollapsed && item.badge && (
                                                        <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-0.5 px-2 rounded-full text-xs font-bold shrink-0">
                                                            {item.badge}
                                                        </span>
                                                    )}

                                                    {!isActuallyCollapsed && isDis && (
                                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-0.5 px-2 rounded-md text-[10px] font-bold shrink-0 uppercase tracking-wider">
                                                            Pronto
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    );

                                    if (isActuallyCollapsed || isDis) {
                                        const tooltipText = isDis ? 'Próximamente' : item.label;
                                        return (
                                            <li key={item.id}>
                                                <Tooltip content={tooltipText} position="right">
                                                    {linkContent}
                                                </Tooltip>
                                            </li>
                                        );
                                    }

                                    return <li key={item.id}>{linkContent}</li>;
                                })}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Footer (User) */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800/50 shrink-0 w-full">
                    <Dropdown 
                        trigger={
                            <button className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${isActuallyCollapsed ? 'justify-center' : ''}`}>
                                <Avatar 
                                    name={`${usuario?.nombre || ''} ${usuario?.apellido_paterno || ''}`}
                                    size="sm"
                                    online={true}
                                />
                                {!isActuallyCollapsed && (
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                            {usuario?.nombre} {usuario?.apellido_paterno}
                                        </p>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate capitalize">
                                            {usuario?.rol?.nombre_visible || usuario?.rol?.nombre}
                                        </p>
                                    </div>
                                )}
                            </button>
                        }
                        items={userMenuOptions}
                        align="top"
                        className="w-full block"
                    />
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
