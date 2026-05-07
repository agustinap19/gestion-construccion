import api from './api';

const recuperacionService = {
    /**
     * Solicitar correo de recuperación
     */
    solicitarRecuperacion: async (email) => {
        const response = await api.post('/recuperacion/solicitar', { email });
        return response.data;
    },

    /**
     * Validar si un token es válido y no ha expirado
     */
    validarToken: async (token) => {
        const response = await api.get(`/recuperacion/validar-token/${token}`);
        return response.data;
    },

    /**
     * Verificar rostro biométrico durante recuperación
     */
    verificarRostro: async (token, descriptor) => {
        const response = await api.post('/recuperacion/verificar-rostro', { token, descriptor });
        return response.data;
    },

    /**
     * Establecer nueva contraseña
     */
    cambiarPassword: async (token, nuevaPassword, nuevaPasswordConfirmation) => {
        const response = await api.post('/recuperacion/cambiar-password', { 
            token, 
            nueva_password: nuevaPassword,
            nueva_password_confirmation: nuevaPasswordConfirmation
        });
        return response.data;
    }
};

export default recuperacionService;
