import api from './api';

const modificatorioService = {
    listarPorProyecto: async (proyectoId) => {
        const response = await api.get(`/proyectos/${proyectoId}/modificatorios`);
        return response.data.data;
    },

    getById: async (id) => {
        const response = await api.get(`/modificatorios/${id}`);
        return response.data.data;
    },

    crearMonto: async (proyectoId, datos) => {
        const response = await api.post(`/proyectos/${proyectoId}/modificatorios/monto`, datos);
        return response.data.data;
    },

    crearPlazo: async (proyectoId, datos) => {
        const response = await api.post(`/proyectos/${proyectoId}/modificatorios/plazo`, datos);
        return response.data.data;
    },

    actualizarItems: async (id, items) => {
        const response = await api.put(`/modificatorios/${id}/items`, { items });
        return response.data.data;
    },

    actualizarJustificativo: async (id, justificativo_legal) => {
        const response = await api.put(`/modificatorios/${id}/justificativo`, { justificativo_legal });
        return response.data.data;
    },

    generarJustificativo: async (id) => {
        const response = await api.post(`/modificatorios/${id}/justificativo/generar`);
        return response.data.data.texto;
    },

    enviarAprobacion: async (id) => {
        const response = await api.post(`/modificatorios/${id}/enviar-aprobacion`);
        return response.data.data;
    },

    aprobar: async (id) => {
        const response = await api.post(`/modificatorios/${id}/aprobar`);
        return response.data.data;
    },

    rechazar: async (id, razon) => {
        const response = await api.post(`/modificatorios/${id}/rechazar`, { razon });
        return response.data.data;
    },

    aplicar: async (id) => {
        const response = await api.post(`/modificatorios/${id}/aplicar`);
        return response.data.data;
    },
};

export default modificatorioService;
