import api from './api';

export const activoService = {
    listar: async (params = {}) => {
        const res = await api.get('/activos', { params });
        return res.data;
    },

    obtener: async (id) => {
        const res = await api.get(`/activos/${id}`);
        return res.data;
    },

    crear: async (data) => {
        const res = await api.post('/activos', data);
        return res.data;
    },

    actualizar: async (id, data) => {
        const res = await api.put(`/activos/${id}`, data);
        return res.data;
    },

    eliminar: async (id) => {
        const res = await api.delete(`/activos/${id}`);
        return res.data;
    },

    asignaciones: async (id) => {
        const res = await api.get(`/activos/${id}/asignaciones`);
        return res.data;
    },

    mantenimientos: async (id) => {
        const res = await api.get(`/activos/${id}/mantenimientos`);
        return res.data;
    },

    disponibles: async () => {
        const res = await api.get('/activos/disponibles');
        return res.data;
    },
};

export default activoService;
