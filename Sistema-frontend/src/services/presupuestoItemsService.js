import api from './api';

export const presupuestoItemsService = {
    getItems: async (proyectoId, params = {}) => {
        const response = await api.get(`/proyectos/${proyectoId}/presupuesto-items`, { params });
        return response.data;
    },
    getConsolidado: async (proyectoId) => {
        const response = await api.get(`/proyectos/${proyectoId}/presupuesto-items/consolidado`);
        return response.data;
    },
    generarDesde: async (proyectoId, data) => {
        const response = await api.post(`/proyectos/${proyectoId}/presupuesto-items/generar`, data);
        return response.data;
    },
    generarSocial: async (proyectoId, data) => {
        const response = await api.post(`/proyectos/${proyectoId}/presupuesto-items/generar-social`, data);
        return response.data;
    },
    generarPrivado: async (proyectoId, data) => {
        const response = await api.post(`/proyectos/${proyectoId}/presupuesto-items/generar-privado`, data);
        return response.data;
    },
    recalcular: async (proyectoId) => {
        const response = await api.post(`/proyectos/${proyectoId}/presupuesto-items/recalcular`);
        return response.data;
    },
    bloquear: async (proyectoId) => {
        const response = await api.post(`/proyectos/${proyectoId}/presupuesto-items/bloquear`);
        return response.data;
    },
    aplicarOverride: async (presupuestoItemId, data) => {
        const response = await api.post(`/presupuesto-items/${presupuestoItemId}/override`, data);
        return response.data;
    },
};
