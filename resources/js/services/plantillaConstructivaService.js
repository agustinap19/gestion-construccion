import api from './api';

export const plantillaConstructivaService = {
    getAll: async (params = {}) => {
        const response = await api.get('/plantillas-constructivas', { params });
        return response.data;
    },
    get: async (id) => {
        const response = await api.get(`/plantillas-constructivas/${id}`);
        return response.data;
    },
    crear: async (data) => {
        const response = await api.post('/plantillas-constructivas', data);
        return response.data;
    },
    actualizar: async (id, data) => {
        const response = await api.put(`/plantillas-constructivas/${id}`, data);
        return response.data;
    },
    cambiarEstado: async (id, estado) => {
        const response = await api.patch(`/plantillas-constructivas/${id}/estado`, { estado });
        return response.data;
    },
    duplicar: async (id) => {
        const response = await api.post(`/plantillas-constructivas/${id}/duplicar`);
        return response.data;
    },
    eliminar: async (id) => {
        const response = await api.delete(`/plantillas-constructivas/${id}`);
        return response.data;
    },
};
