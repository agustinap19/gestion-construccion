import React, { createContext, useContext, useState, useEffect } from 'react';

const LayoutContext = createContext();

export const LayoutProvider = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', sidebarCollapsed);
        if (sidebarCollapsed) {
            document.body.setAttribute('data-sidebar', 'collapsed');
        } else {
            document.body.setAttribute('data-sidebar', 'expanded');
        }
    }, [sidebarCollapsed]);

    const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

    return (
        <LayoutContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed, toggleSidebar }}>
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayout = () => useContext(LayoutContext);
