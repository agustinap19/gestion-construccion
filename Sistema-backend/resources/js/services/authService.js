import api from './api';

// Callback global para mostrar el modal de cambio obligatorio de contraseña
let onPasswordChangeRequired = null;

export const setPasswordChangeRequiredCallback = (cb) => {
    onPasswordChangeRequired = cb;
};

// Interceptor 423 – se configura una sola vez al importar el módulo
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 423 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
            if (onPasswordChangeRequired) onPasswordChangeRequired();
        }
        return Promise.reject(error);
    }
);

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

    verificarOtp: async (tokenTemporal, codigo, confiarDispositivo, fingerprint) => {
        const response = await api.post('/2fa/verificar-otp', {
            token_temporal: tokenTemporal,
            codigo,
            confiar_dispositivo: confiarDispositivo,
            fingerprint,
        });

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

    continuarSinCodigo: async (tokenTemporal, confiarDispositivo, fingerprint) => {
        const response = await api.post('/2fa/continuar-sin-codigo', {
            token_temporal: tokenTemporal,
            confiar_dispositivo: confiarDispositivo,
            fingerprint,
        });

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

    cambiarPasswordPrimerLogin: async (passwordActual, nuevaPassword) => {
        const response = await api.post('/primer-login/cambiar-password', {
            password_actual: passwordActual,
            nueva_password: nuevaPassword,
            nueva_password_confirmation: nuevaPassword,
        });
        return response.data;
    },

    solicitarRecuperacion: async (email) => {
        const response = await api.post('/recuperacion/solicitar', { email });
        return response.data;
    },

    validarTokenRecuperacion: async (token) => {
        const response = await api.get(`/recuperacion/validar-token/${token}`);
        return response.data;
    },

    restablecerPassword: async (token, nuevaPassword) => {
        const response = await api.post('/recuperacion/restablecer', {
            token,
            nueva_password: nuevaPassword,
            nueva_password_confirmation: nuevaPassword,
        });
        return response.data;
    },

    logout: async () => {
        try {
            await api.post('/logout');
        } catch (_) {
            // silencioso
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

    isAuthenticated: () => !!localStorage.getItem('token'),
    getUser: () => {
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
    },
    getPermisos: () => {
        const p = localStorage.getItem('permisos');
        return p ? JSON.parse(p) : [];
    },
    hasPermission: (codigo) => authService.getPermisos().includes(codigo),
};

export default authService;
