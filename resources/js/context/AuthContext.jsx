import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [permisos, setPermisos] = useState([]);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Inicializar estado desde localStorage
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const storedPermisos = localStorage.getItem('permisos');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            if (storedPermisos) {
                setPermisos(JSON.parse(storedPermisos));
            }
        }
        
        setLoading(false);
    }, []);

    const login = async (email, password, fingerprint) => {
        const data = await authService.login(email, password, fingerprint);
        
        if (data.tipo_respuesta === 'login_exitoso') {
            setToken(data.token);
            setUser(data.usuario);
            setPermisos(data.permisos);
        }
        
        return data;
    };

    const loginDirecto = (data) => {
        setToken(data.token);
        setUser(data.usuario);
        setPermisos(data.permisos);
    };

    const logout = async () => {
        await authService.logout();
        setToken(null);
        setUser(null);
        setPermisos([]);
    };

    const hasPermission = (codigo) => {
        return permisos.includes(codigo);
    };

    const marcarPrimerLoginCompleto = () => {
        if (user) {
            const updatedUser = { ...user, debe_cambiar_password: false, rostro_registrado: true };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    const necesitaPrimerLogin = user ? (user.debe_cambiar_password || !user.rostro_registrado) : false;

    const value = {
        user,
        permisos,
        token,
        isAuthenticated: !!token,
        necesitaPrimerLogin,
        login,
        loginDirecto,
        logout,
        hasPermission,
        marcarPrimerLoginCompleto,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
