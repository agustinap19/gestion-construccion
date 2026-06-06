import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const BreadcrumbContext = createContext({
    overrides: {},
    setOverride: () => {},
    clearOverride: () => {},
});

export const BreadcrumbProvider = ({ children }) => {
    const [overrides, setOverrides] = useState({});

    const setOverride = useCallback((path, name) => {
        setOverrides(prev => prev[path] === name ? prev : { ...prev, [path]: name });
    }, []);

    const clearOverride = useCallback((path) => {
        setOverrides(prev => {
            if (!(path in prev)) return prev;
            const next = { ...prev };
            delete next[path];
            return next;
        });
    }, []);

    return (
        <BreadcrumbContext.Provider value={{ overrides, setOverride, clearOverride }}>
            {children}
        </BreadcrumbContext.Provider>
    );
};

export const useBreadcrumb = () => useContext(BreadcrumbContext);

export const useBreadcrumbTitle = (path, name) => {
    const { setOverride, clearOverride } = useBreadcrumb();

    useEffect(() => {
        if (path && name) setOverride(path, name);
        return () => { if (path) clearOverride(path); };
    }, [path, name, setOverride, clearOverride]);
};
