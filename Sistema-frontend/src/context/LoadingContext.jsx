import React, { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
    const [loadingCount, setLoadingCount] = useState(0);

    const startLoading = useCallback(() => {
        setLoadingCount(prev => prev + 1);
    }, []);

    const stopLoading = useCallback(() => {
        setLoadingCount(prev => Math.max(0, prev - 1));
    }, []);

    return (
        <LoadingContext.Provider value={{ isLoading: loadingCount > 0, startLoading, stopLoading }}>
            {children}
        </LoadingContext.Provider>
    );
};

export const useLoading = () => useContext(LoadingContext);
