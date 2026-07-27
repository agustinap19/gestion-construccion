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

    estadisticas: async () => {
        const res = await api.get('/activos/estadisticas');
        return res.data;
    },

    uploadFoto: async (file) => {
        const formData = new FormData();
        formData.append('foto', file);

        const res = await api.post('/activos/upload-foto', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },
};

export default activoService;
