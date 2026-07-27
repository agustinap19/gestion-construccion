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
import ParticlesBackground from './ParticlesBackground';

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
        <div className="h-screen text-slate-900 dark:text-slate-100 flex overflow-hidden relative z-0">
            <GlobalLoadingBar />
            <ParticlesBackground />

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
