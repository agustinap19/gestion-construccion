import api from './api';

const visitaDomiciliariaService = {
    getAll: async (params = {}) => {
        const response = await api.get('/visitas-domiciliarias', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/visitas-domiciliarias/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/visitas-domiciliarias', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/visitas-domiciliarias/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/visitas-domiciliarias/${id}`);
        return response.data;
    },

    obtenerEstadisticasProyecto: async (proyectoId) => {
        const response = await api.get(`/visitas-domiciliarias/proyecto/${proyectoId}/estadisticas`);
        return response.data;
    }
};

export default visitaDomiciliariaService;
