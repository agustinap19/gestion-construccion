import api from './api';

const authService = {
    login: async (email, password, fingerprint) => {
        const response = await api.post('/login', { email, password, fingerprint });
        
        if (response.data.status === 'success') {
            const data = response.data.data;
            if (data.tipo_respuesta === 'login_exitoso') {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.usuario));
                localStorage.setItem('permisos', JSON.stringify(data.permisos));
            }
            
            return data;
        }
        
        return response.data;
    },

    verificarOtp: async (tokenTemporal, codigo) => {
        const response = await api.post('/2fa/verificar-otp', { token_temporal: tokenTemporal, codigo });
        return response.data.data;
    },

    verificarRostro2FA: async (tokenTemporal, descriptor) => {
        const response = await api.post('/2fa/verificar-rostro', { token_temporal: tokenTemporal, descriptor });
        
        if (response.data.status === 'success') {
            const data = response.data.data;
            if (data.tipo_respuesta === 'login_exitoso') {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.usuario));
                localStorage.setItem('permisos', JSON.stringify(data.permisos));
            }
            return data;
        }
        return response.data;
    },

    logout: async () => {
        try {
            await api.post('/logout');
        } catch (error) {
            console.error('Error al cerrar sesión en el servidor', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('permisos');
        }
    },

    getMe: async () => {
        const response = await api.get('/me');
        return response.data;
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    getUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    getPermisos: () => {
        const permisos = localStorage.getItem('permisos');
        return permisos ? JSON.parse(permisos) : [];
    },

    hasPermission: (codigo) => {
        const permisos = authService.getPermisos();
        return permisos.includes(codigo);
    }
};

export default authService;
