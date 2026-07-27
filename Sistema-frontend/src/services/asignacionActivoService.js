import api from './api';

export const asignacionActivoService = {
    listar: async (params = {}) => {
        const res = await api.get('/asignaciones-activo', { params });
        return res.data;
    },

    listarPorActivo: async (activoId, params = {}) => {
        const res = await api.get(`/activos/${activoId}/asignaciones`, { params });
        return res.data;
    },

    crear: async (activoId, data) => {
        const res = await api.post(`/activos/${activoId}/asignaciones`, data);
        return res.data;
    },

    actualizar: async (id, data) => {
        const res = await api.put(`/asignaciones-activo/${id}`, data);
        return res.data;
    },

    cambiarEstado: async (id, estado, extra = {}) => {
        const res = await api.patch(`/asignaciones-activo/${id}/estado`, { estado, ...extra });
        return res.data;
    },

    eliminar: async (id) => {
        const res = await api.delete(`/asignaciones-activo/${id}`);
        return res.data;
    },

    verificarDisponibilidad: async (activoId, desde, hasta) => {
        const res = await api.get(`/activos/${activoId}/disponibilidad`, { params: { desde, hasta } });
        return res.data;
    },
};

export default asignacionActivoService;
