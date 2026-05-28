import api from './api';

export const presupuestoMaterialService = {
    listarPorProyecto: async (proyectoId) => {
        const res = await api.get(`/proyectos/${proyectoId}/presupuesto-materiales`);
        return res.data;
    },

    guardar: async (proyectoId, data) => {
        const res = await api.post(`/proyectos/${proyectoId}/presupuesto-materiales`, data);
        return res.data;
    },

    eliminar: async (proyectoId, id) => {
        const res = await api.delete(`/proyectos/${proyectoId}/presupuesto-materiales/${id}`);
        return res.data;
    },

    sugerirDistribucion: async (presupuestoId, tipo) => {
        const res = await api.get(`/presupuesto-materiales/${presupuestoId}/sugerir-distribucion`, {
            params: { tipo },
        });
        return res.data;
    },

    importar: async (proyectoId, filas) => {
        const res = await api.post(`/proyectos/${proyectoId}/presupuesto-materiales/importar`, { filas });
        return res.data;
    },

    exportarPdf: (proyectoId) =>
        `/api/exportar/proyectos/${proyectoId}/presupuesto-materiales`,

    reconsolidar: async (proyectoId) => {
        const res = await api.post(`/proyectos/${proyectoId}/presupuesto-items/recalcular`);
        return res.data;
    },
};
