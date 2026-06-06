import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import notificacionService from '../services/notificacionService';
import { useAuth } from './AuthContext';

const NotificacionContext = createContext(null);

export const NotificacionProvider = ({ children }) => {
    const { usuario } = useAuth();
    const [noLeidas, setNoLeidas] = useState([]);
    const [contador, setContador] = useState(0);
    const [cargando, setCargando] = useState(true);

    const cargarNoLeidas = useCallback(async () => {
        if (!usuario) return;
        try {
            const data = await notificacionService.obtenerNoLeidas(15);
            setNoLeidas(data);
            const count = await notificacionService.obtenerContador();
            setContador(count);
        } catch (error) {
            console.error('Error cargando notificaciones:', error);
        } finally {
            setCargando(false);
        }
    }, [usuario]);

    const marcarLeida = async (id) => {
        try {
            await notificacionService.marcarLeida(id);
            setNoLeidas(prev => prev.filter(n => n.id !== id));
            setContador(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error al marcar notificación como leída:', error);
        }
    };

    const marcarTodasLeidas = async () => {
        try {
            await notificacionService.marcarTodasLeidas();
            setNoLeidas([]);
            setContador(0);
        } catch (error) {
            console.error('Error al marcar todas como leídas:', error);
        }
    };

    const agregarNotificacionLocal = (notificacion) => {
        setNoLeidas(prev => [notificacion, ...prev]);
        setContador(prev => prev + 1);
    };

    // Polling cada 30 segundos
    useEffect(() => {
        if (usuario) {
            cargarNoLeidas();
            const interval = setInterval(() => {
                cargarNoLeidas();
            }, 30000); // 30 segundos
            
            return () => clearInterval(interval);
        } else {
            setNoLeidas([]);
            setContador(0);
        }
    }, [usuario, cargarNoLeidas]);

    const value = {
        noLeidas,
        contador,
        cargando,
        cargarNoLeidas,
        marcarLeida,
        marcarTodasLeidas,
        agregarNotificacionLocal
    };

    return (
        <NotificacionContext.Provider value={value}>
            {children}
        </NotificacionContext.Provider>
    );
};

export const useNotificaciones = () => {
    const context = useContext(NotificacionContext);
    if (!context) {
        throw new Error('useNotificaciones debe ser usado dentro de un NotificacionProvider');
    }
    return context;
};
