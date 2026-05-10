import api from './api';

const beneficiarioService = {
    getAll: async (params = {}) => {
        const response = await api.get('/beneficiarios', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/beneficiarios/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/beneficiarios', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/beneficiarios/${id}`, data);
        return response.data;
    },

    delete: async (id, razon) => {
        const response = await api.delete(`/beneficiarios/${id}`, { data: { razon } });
        return response.data;
    },

    cambiarEstado: async (id, estado_seleccion, razon = null, fechas = {}) => {
        const response = await api.patch(`/beneficiarios/${id}/estado`, {
            estado_seleccion,
            razon,
            ...fechas
        });
        return response.data;
    },

    asignarTipoVivienda: async (id, tipo_vivienda_id) => {
        const response = await api.patch(`/beneficiarios/${id}/tipo-vivienda`, { tipo_vivienda_id });
        return response.data;
    },

    obtenerEstadisticasProyecto: async (proyectoId) => {
        const response = await api.get(`/beneficiarios/proyecto/${proyectoId}/estadisticas`);
        return response.data;
    },

    obtenerMapaProyecto: async (proyectoId) => {
        const response = await api.get(`/beneficiarios/proyecto/${proyectoId}/mapa`);
        return response.data;
    },

    obtenerTransicionesPermitidas: async (id) => {
        const response = await api.get(`/beneficiarios/${id}/transiciones-permitidas`);
        return response.data;
    }
};

export default beneficiarioService;
