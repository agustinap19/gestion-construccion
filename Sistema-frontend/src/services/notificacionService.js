import api from './api';

const notificacionService = {
    obtenerTodas: async (page = 1, perPage = 20) => {
        const response = await api.get(`/notificaciones?page=${page}&per_page=${perPage}`);
        return response.data;
    },

    obtenerNoLeidas: async (limit = 10) => {
        const response = await api.get(`/notificaciones/no-leidas?limit=${limit}`);
        return response.data;
    },

    obtenerContador: async () => {
        const response = await api.get(`/notificaciones/contador`);
        return response.data.contador;
    },

    marcarLeida: async (id) => {
        const response = await api.patch(`/notificaciones/${id}/leer`);
        return response.data;
    },

    marcarTodasLeidas: async () => {
        const response = await api.patch(`/notificaciones/marcar-todas-leidas`);
        return response.data;
    }
};

export default notificacionService;
