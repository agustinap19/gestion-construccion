import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import NotificacionesPanel from './NotificacionesPanel';
import { NotificacionProvider } from '../../context/NotificacionContext';
import { BreadcrumbProvider } from '../../context/BreadcrumbContext';
import { useLayout } from '../../context/LayoutContext';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import GlobalSearchModal from './GlobalSearchModal';
import GlobalLoadingBar from './GlobalLoadingBar';

const DynamicBackground = () => (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
        {/* Blob 1 — emerald, top-left */}
        <div
            className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full animate-blob-1 opacity-60 dark:opacity-100"
            style={{
                background: 'radial-gradient(circle at 40% 40%, oklch(62% 0.2 145 / 0.07), transparent 70%)',
                filter: 'blur(70px)',
            }}
        />
        {/* Blob 2 — tech purple, bottom-right */}
        <div
            className="absolute -bottom-[25%] -right-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full animate-blob-2 opacity-50 dark:opacity-100"
            style={{
                background: 'radial-gradient(circle at 60% 60%, oklch(55% 0.2 290 / 0.06), transparent 70%)',
                filter: 'blur(80px)',
            }}
        />
        {/* Blob 3 — accent sutil, center */}
        <div
            className="absolute top-[30%] left-[40%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] rounded-full animate-blob-3 opacity-40 dark:opacity-80"
            style={{
                background: 'radial-gradient(circle at 50% 50%, oklch(60% 0.15 200 / 0.05), transparent 70%)',
                filter: 'blur(90px)',
            }}
        />
        {/* Grid overlay — más visible en dark */}
        <div
            className="absolute inset-0 opacity-[0.015] dark:opacity-[0.035]"
            style={{
                backgroundImage: `
                    linear-gradient(rgba(100,116,139,0.6) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(100,116,139,0.6) 1px, transparent 1px)
                `,
                backgroundSize: '64px 64px',
            }}
        />
    </div>
);

const AppLayoutContent = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotificacionesOpen, setIsNotificacionesOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { sidebarCollapsed } = useLayout();

    useKeyboardShortcuts({
        onSearchShortcut: () => setIsSearchOpen(true),
        onEscape: () => {
            setIsSearchOpen(false);
            setIsNotificacionesOpen(false);
        }
    });

    return (
        <div className="h-screen bg-slate-50 dark:bg-[#080c15] text-slate-900 dark:text-slate-100 flex overflow-hidden relative">
            <GlobalLoadingBar />
            <DynamicBackground />

            {/* Sidebar Left */}
            <Sidebar
                isOpenMobile={isMobileMenuOpen}
                setIsOpenMobile={setIsMobileMenuOpen}
            />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 ${sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[268px]'}`}>
                <TopBar
                    onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                    onOpenNotificaciones={() => setIsNotificacionesOpen(true)}
                    onOpenSearch={() => setIsSearchOpen(true)}
                />

                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto overflow-y-auto scrollbar-thin">
                    <Outlet />
                </main>
            </div>

            {/* Right Panel */}
            <NotificacionesPanel
                open={isNotificacionesOpen}
                onClose={() => setIsNotificacionesOpen(false)}
            />

            <GlobalSearchModal
                open={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
            />
        </div>
    );
};

const AppLayout = () => {
    return (
        <NotificacionProvider>
            <BreadcrumbProvider>
                <AppLayoutContent />
            </BreadcrumbProvider>
        </NotificacionProvider>
    );
};

export default AppLayout;
