import api from './api';

const viviendaService = {
    listarPorProyecto: async (proyectoId, filtros = {}, page = 1, perPage = 20) => {
        const response = await api.get(`/proyectos/${proyectoId}/viviendas`, {
            params: { ...filtros, page, per_page: perPage }
        });
        return response.data;
    },

    obtener: async (id) => {
        const response = await api.get(`/viviendas/${id}`);
        return response.data.data;
    },

    crear: async (proyectoId, datos) => {
        const response = await api.post(`/proyectos/${proyectoId}/viviendas`, datos);
        return response.data;
    },

    crearMultiples: async (proyectoId, cantidad, tipoViviendaId = null) => {
        const response = await api.post(`/proyectos/${proyectoId}/viviendas/multiples`, {
            cantidad,
            tipo_vivienda_id: tipoViviendaId,
        });
        return response.data;
    },

    actualizar: async (id, datos) => {
        const response = await api.put(`/viviendas/${id}`, datos);
        return response.data;
    },

    cambiarEstado: async (id, estado, razon = '') => {
        const response = await api.patch(`/viviendas/${id}/estado`, { estado, razon });
        return response.data;
    },

    asignarBeneficiario: async (id, beneficiarioId) => {
        const response = await api.patch(`/viviendas/${id}/beneficiario`, { beneficiario_id: beneficiarioId });
        return response.data;
    },

    desasignarBeneficiario: async (id) => {
        const response = await api.delete(`/viviendas/${id}/beneficiario`);
        return response.data;
    },

    eliminar: async (id, razon) => {
        const response = await api.delete(`/viviendas/${id}`, { data: { razon } });
        return response.data;
    },
};

export default viviendaService;
