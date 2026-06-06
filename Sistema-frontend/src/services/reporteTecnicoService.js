import api from './api';

const reporteTecnicoService = {
    listarPorUnidad: async (tipo, id, perPage = 15) => {
        const response = await api.get(`/reportes-tecnicos/unidad/${tipo}/${id}`, {
            params: { per_page: perPage },
        });
        return response.data;
    },

    galeriaProyecto: async (proyectoId, filtros = {}) => {
        const response = await api.get(`/reportes-tecnicos/proyecto/${proyectoId}/galeria`, {
            params: filtros,
        });
        return response.data;
    },

    obtener: async (id) => {
        const response = await api.get(`/reportes-tecnicos/${id}`);
        return response.data;
    },

    crear: async (datos) => {
        const response = await api.post('/reportes-tecnicos', datos);
        return response.data;
    },

    subirFoto: async (archivo, proyectoId, unidadId = 0) => {
        const form = new FormData();
        form.append('archivo', archivo);
        form.append('proyecto_id', proyectoId);
        if (unidadId) form.append('unidad_id', unidadId);
        const response = await api.post('/upload/foto-reporte', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    urlExportarAvance: (viviendaId) => `/reportes-tecnicos/vivienda/${viviendaId}/exportar-avance`,

    urlExportarFotos: (viviendaId) => `/reportes-tecnicos/vivienda/${viviendaId}/exportar-fotos`,
};

export default reporteTecnicoService;
