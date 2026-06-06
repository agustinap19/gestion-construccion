import api from './api';

const cierreRegistrosService = {
    estado: async (proyectoId) => {
        const response = await api.get(`/proyectos/${proyectoId}/cierre-registros/estado`);
        return response.data.data;
    },

    cerrar: async (proyectoId) => {
        const response = await api.post(`/proyectos/${proyectoId}/cierre-registros/cerrar`);
        return response.data;
    },

    solicitarReapertura: async (proyectoId) => {
        const response = await api.post(`/proyectos/${proyectoId}/cierre-registros/solicitar-reapertura`);
        return response.data;
    },

    verificarReapertura: async (proyectoId, codigo) => {
        const response = await api.post(`/proyectos/${proyectoId}/cierre-registros/verificar-reapertura`, { codigo });
        return response.data;
    },
};

export default cierreRegistrosService;
