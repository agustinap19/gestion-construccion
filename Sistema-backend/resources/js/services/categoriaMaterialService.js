import api from './api';

export const categoriaMaterialService = {
    getAll: async () => {
        const response = await api.get('/categorias-material');
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/categorias-material', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/categorias-material/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/categorias-material/${id}`);
        return response.data;
    }
};
