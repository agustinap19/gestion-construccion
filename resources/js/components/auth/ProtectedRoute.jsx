import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requiredPermission }) => {
    const { isAuthenticated, hasPermission } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/dashboard" replace />;
    }

    // El CambioPasswordObligatorioModal se renderiza globalmente en App.jsx
    // y bloquea la interfaz cuando debe_cambiar_password === true.
    return children;
};

export default ProtectedRoute;
