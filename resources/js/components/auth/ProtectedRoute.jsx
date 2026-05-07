import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requiredPermission }) => {
    const { isAuthenticated, hasPermission, necesitaPrimerLogin } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        // Redirigir al login guardando la ruta a la que intentaba ir
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Interceptar para el primer login, pero permitir el acceso a /primer-login
    if (necesitaPrimerLogin && location.pathname !== '/primer-login') {
        return <Navigate to="/primer-login" replace />;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        // Redirigir a una página de no autorizado o al dashboard
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;
