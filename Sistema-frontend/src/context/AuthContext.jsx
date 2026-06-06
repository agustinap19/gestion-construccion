import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService, { setPasswordChangeRequiredCallback } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [permisos, setPermisos] = useState([]);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mostrarModalCambioPassword, setMostrarModalCambioPassword] = useState(false);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const storedPermisos = localStorage.getItem('permisos');

        if (storedToken && storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setToken(storedToken);
            setUser(parsedUser);
            if (storedPermisos) setPermisos(JSON.parse(storedPermisos));
        }

        setLoading(false);
    }, []);

    // Registrar callback para interceptor 423
    useEffect(() => {
        setPasswordChangeRequiredCallback(() => setMostrarModalCambioPassword(true));
        return () => setPasswordChangeRequiredCallback(null);
    }, []);

    const login = async (email, password, fingerprint) => {
        const data = await authService.login(email, password, fingerprint);

        if (data.tipo_respuesta === 'login_exitoso') {
            setToken(data.token);
            setUser(data.usuario);
            setPermisos(data.permisos ?? []);
            if (data.usuario?.debe_cambiar_password) {
                setMostrarModalCambioPassword(true);
            }
        }

        return data;
    };

    const loginDirecto = (data) => {
        setToken(data.token);
        setUser(data.usuario);
        setPermisos(data.permisos ?? []);
    };

    const logout = async () => {
        await authService.logout();
        setToken(null);
        setUser(null);
        setPermisos([]);
        setMostrarModalCambioPassword(false);
    };

    const marcarPasswordCambiada = useCallback((nuevoToken, nuevoUsuario, nuevosPermisos) => {
        if (nuevoToken) {
            localStorage.setItem('token', nuevoToken);
            localStorage.setItem('user', JSON.stringify(nuevoUsuario));
            localStorage.setItem('permisos', JSON.stringify(nuevosPermisos));
            setToken(nuevoToken);
            setUser(nuevoUsuario);
            setPermisos(nuevosPermisos ?? []);
        } else {
            // Actualizar solo el flag en el user local sin nuevo token
            const updated = { ...user, debe_cambiar_password: false };
            setUser(updated);
            localStorage.setItem('user', JSON.stringify(updated));
        }
        setMostrarModalCambioPassword(false);
    }, [user]);

    const hasPermission = (codigo) => !!(user?.es_admin_central) || permisos.includes(codigo);

    const value = {
        user,
        usuario: user,
        permisos,
        token,
        isAuthenticated: !!token,
        necesitaCambioPassword: user?.debe_cambiar_password ?? false,
        mostrarModalCambioPassword,
        login,
        loginDirecto,
        logout,
        hasPermission,
        marcarPasswordCambiada,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
