import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotificaciones } from '../../context/NotificacionContext';
import {
    Home, Bell, Briefcase, Package, Warehouse, Truck, Users,
    Shield, FileText, LogOut, Settings, User, Sun, Moon,
    Pin, PinOff, BookOpen
} from '../icons/Icons';
import Avatar from '../ui/Avatar';
import Dropdown from '../ui/Dropdown';
import Tooltip from '../ui/Tooltip';
import { useLayout } from '../../context/LayoutContext';
import { useTheme } from '../../context/ThemeContext';

const Sidebar = ({ isOpenMobile, setIsOpenMobile }) => {
    const { usuario, logout, hasPermission } = useAuth();
    const { contador } = useNotificaciones();
    const { sidebarCollapsed: collapsed, toggleSidebar } = useLayout();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [isHovered, setIsHovered] = useState(false);
    const isActuallyCollapsed = collapsed && !isHovered;

    useEffect(() => {
        setIsOpenMobile(false);
    }, [navigate, setIsOpenMobile]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isManagerOrAdmin = ['gerente', 'administrador', 'super_admin'].includes(usuario?.rol?.nombre) || hasPermission('roles.ver');

    const menuGroups = [
        {
            title: 'Principal',
            items: [
                { id: 'home', label: 'Inicio', icon: Home, path: '/dashboard', exact: true },
                { id: 'notificaciones', label: 'Notificaciones', icon: Bell, path: '/dashboard/notificaciones', badge: contador > 0 ? contador : null },
            ]
        },
        {
            title: 'Operativo',
            items: [
                { id: 'proyectos', label: 'Proyectos', icon: Briefcase, path: '/dashboard/proyectos' },
                ...(hasPermission('materiales.ver') ? [{ id: 'materiales', label: 'Materiales', icon: Package, path: '/dashboard/materiales' }] : []),
                ...(hasPermission('almacenes.ver') ? [{ id: 'almacenes', label: 'Almacenes', icon: Warehouse, path: '/dashboard/almacenes' }] : []),
                ...(hasPermission('biblioteca_constructiva.ver') ? [{ id: 'biblioteca', label: 'Biblioteca', icon: BookOpen, path: '/dashboard/biblioteca-constructiva' }] : []),
                { id: 'proveedores', label: 'Proveedores', icon: Truck, path: '/dashboard/proveedores', disabled: true },
            ]
        },
        ...(isManagerOrAdmin ? [{
            title: 'Administración',
            items: [
                { id: 'usuarios', label: 'Usuarios', icon: Users, path: '/dashboard/usuarios' },
                { id: 'roles', label: 'Roles y Permisos', icon: Shield, path: '/dashboard/roles' },
                { id: 'personal', label: 'Personal', icon: Briefcase, path: '/dashboard/personal' },
            ]
        }] : []),
        {
            title: 'Reportes',
            items: [
                { id: 'reportes', label: 'Reportes', icon: FileText, path: '/dashboard/reportes' },
            ]
        }
    ];

    const userMenuOptions = [
        { label: 'Mi Perfil', icon: <User size={15} />, onClick: () => navigate('/dashboard/mi-perfil') },
        { label: 'Configuración', icon: <Settings size={15} />, onClick: () => navigate('/dashboard/configuracion') },
        { divider: true },
        { label: theme === 'dark' ? 'Modo claro' : 'Modo oscuro', icon: theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />, onClick: toggleTheme },
        { divider: true },
        { label: 'Cerrar Sesión', icon: <LogOut size={15} />, onClick: handleLogout, danger: true },
    ];

    const sidebarWidth = isActuallyCollapsed ? '72px' : '268px';

    return (
        <>
            {/* Overlay móvil */}
            {isOpenMobile && (
                <div
                    className="fixed inset-0 z-30 lg:hidden"
                    style={{ background: 'oklch(0% 0 0 / 0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setIsOpenMobile(false)}
                />
            )}

            <aside
                style={{ width: sidebarWidth }}
                className={[
                    'fixed top-0 left-0 h-screen z-40 flex flex-col transition-all duration-300',
                    // Glass base
                    'bg-white/[0.82] dark:bg-[#080c15]/[0.90]',
                    'backdrop-blur-[28px] saturate-150',
                    'border-r border-slate-200/80 dark:border-white/[0.055]',
                    'shadow-[1px_0_0_0_oklch(88%_0.005_260/0.6)] dark:shadow-[1px_0_0_0_oklch(100%_0_0/0.04)]',
                    isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                    collapsed && isHovered ? 'shadow-[0_0_60px_oklch(0%_0_0/0.25)]' : '',
                ].join(' ')}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Logo / Header */}
                <div className="h-[62px] flex items-center justify-between px-4 shrink-0 relative">
                    {/* Línea gradiente inferior */}
                    <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/[0.07] to-transparent" />

                    <div className="flex items-center gap-3 overflow-hidden min-w-[40px]">
                        {/* Logo icon */}
                        <div className="relative shrink-0">
                            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center relative overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, oklch(62% 0.2 145), oklch(52% 0.22 165))' }}>
                                <span className="text-white font-black text-xs tracking-tight relative z-10">CK</span>
                                {/* Glass shine */}
                                <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-[10px]" />
                            </div>
                            {/* Glow */}
                            <div className="absolute inset-0 rounded-[10px] blur-[8px] opacity-40"
                                style={{ background: 'oklch(62% 0.2 145)' }} />
                        </div>

                        {!isActuallyCollapsed && (
                            <div className="animate-fade-in min-w-0">
                                <p className="text-[13px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">CA & KANAGF</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5 tracking-wide uppercase">S.R.L.</p>
                            </div>
                        )}
                    </div>

                    {/* Botón anclar/desanclar — solo desktop, solo visible cuando la barra está expandida */}
                    {!isActuallyCollapsed && (
                        <button
                            onClick={toggleSidebar}
                            title={collapsed ? 'Anclar menú' : 'Desanclar menú'}
                            className={[
                                'hidden lg:flex shrink-0',
                                'w-7 h-7 items-center justify-center rounded-lg',
                                'text-slate-400 dark:text-slate-500',
                                'hover:bg-slate-100 dark:hover:bg-white/[0.07]',
                                'hover:text-emerald-600 dark:hover:text-emerald-400',
                                'transition-all duration-200',
                            ].join(' ')}
                        >
                            {collapsed ? <Pin size={14} /> : <PinOff size={14} />}
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
                    {menuGroups.map((group, gIdx) => (
                        <div key={gIdx} className="mb-1 px-3">
                            {!isActuallyCollapsed && (
                                <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-600 whitespace-nowrap">
                                    {group.title}
                                </p>
                            )}
                            {isActuallyCollapsed && gIdx > 0 && (
                                <div className="mx-2 mb-1 h-px bg-slate-100 dark:bg-white/[0.04]" />
                            )}
                            <ul className="space-y-0.5">
                                {group.items.map(item => {
                                    const Icon = item.icon;
                                    const isDis = item.disabled;

                                    const linkEl = (
                                        <NavLink
                                            to={isDis ? '#' : item.path}
                                            end={item.exact}
                                            onClick={(e) => isDis && e.preventDefault()}
                                            className={({ isActive }) => [
                                                'group relative flex items-center rounded-[10px] transition-all duration-200 overflow-hidden select-none',
                                                isActuallyCollapsed ? 'justify-center p-[10px]' : 'px-3 py-[9px]',
                                                isDis ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                                                !isDis && isActive
                                                    ? 'bg-emerald-500/[0.12] dark:bg-emerald-500/[0.10] text-emerald-700 dark:text-emerald-300'
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-slate-200',
                                            ].join(' ')}
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    {/* Indicador activo */}
                                                    {isActive && !isDis && (
                                                        <span
                                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
                                                            style={{
                                                                background: 'linear-gradient(180deg, oklch(65% 0.2 145), oklch(55% 0.22 165))',
                                                                boxShadow: '0 0 8px oklch(62% 0.2 145 / 0.5)',
                                                            }}
                                                        />
                                                    )}

                                                    {/* Shine on active */}
                                                    {isActive && !isDis && !isActuallyCollapsed && (
                                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.06] to-transparent pointer-events-none" />
                                                    )}

                                                    {/* Icono */}
                                                    <span className={[
                                                        'shrink-0 transition-transform duration-200',
                                                        !isActuallyCollapsed ? 'mr-3 pl-1' : '',
                                                        'group-hover:scale-110',
                                                        isActive ? 'text-emerald-600 dark:text-emerald-400' : '',
                                                    ].join(' ')}>
                                                        <Icon size={17} />
                                                    </span>

                                                    {/* Label */}
                                                    {!isActuallyCollapsed && (
                                                        <span className="flex-1 text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                                                            {item.label}
                                                        </span>
                                                    )}

                                                    {/* Badge notificaciones */}
                                                    {!isActuallyCollapsed && item.badge && (
                                                        <span className="ml-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 dark:bg-emerald-400 text-white dark:text-[#080c15] text-[10px] font-bold flex items-center justify-center"
                                                            style={{ boxShadow: '0 0 8px oklch(62% 0.2 145 / 0.5)' }}>
                                                            {item.badge}
                                                        </span>
                                                    )}

                                                    {/* Pronto badge */}
                                                    {!isActuallyCollapsed && isDis && (
                                                        <span className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500">
                                                            Pronto
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    );

                                    if (isActuallyCollapsed) {
                                        return (
                                            <li key={item.id}>
                                                <Tooltip content={isDis ? 'Próximamente' : item.label} position="right">
                                                    {linkEl}
                                                </Tooltip>
                                            </li>
                                        );
                                    }

                                    return <li key={item.id}>{linkEl}</li>;
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* Footer — usuario */}
                <div className="px-3 pb-4 shrink-0 relative">
                    {/* Línea gradiente superior */}
                    <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-white/[0.07] to-transparent" />
                    <div className="pt-3">
                        <Dropdown
                            trigger={
                                <button className={[
                                    'w-full flex items-center rounded-[10px] p-2.5 transition-all duration-200 focus:outline-none',
                                    'hover:bg-slate-100/80 dark:hover:bg-white/[0.05]',
                                    'text-left cursor-pointer',
                                    isActuallyCollapsed ? 'justify-center' : 'gap-3',
                                ].join(' ')}>
                                    <Avatar
                                        name={`${usuario?.nombre || ''} ${usuario?.apellido_paterno || ''}`}
                                        size="sm"
                                        online={true}
                                    />
                                    {!isActuallyCollapsed && (
                                        <div className="flex-1 min-w-0 animate-fade-in">
                                            <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate leading-tight">
                                                {usuario?.nombre} {usuario?.apellido_paterno}
                                            </p>
                                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate capitalize mt-0.5">
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
                    {!isActuallyCollapsed && (
                        <p className="mt-2 text-center text-[10px] text-slate-400/50 dark:text-slate-600/60 select-none tracking-wide">
                            Gestion-Constructora v1.0
                        </p>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
