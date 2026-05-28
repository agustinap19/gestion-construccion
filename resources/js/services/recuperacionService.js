import api from './api';

const recuperacionService = {
    solicitarRecuperacion: async (email) => {
        const response = await api.post('/recuperacion/solicitar', { email });
        return response.data;
    },

    validarToken: async (token) => {
        const response = await api.get(`/recuperacion/validar-token/${token}`);
        return response.data;
    },

    cambiarPassword: async (token, nuevaPassword, nuevaPasswordConfirmation) => {
        const response = await api.post('/recuperacion/restablecer', {
            token,
            nueva_password: nuevaPassword,
            nueva_password_confirmation: nuevaPasswordConfirmation
        });
        return response.data;
    }
};

export default recuperacionService;
