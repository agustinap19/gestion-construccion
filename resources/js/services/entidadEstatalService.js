import api from './api';

const entidadEstatalService = {
    /**
     * Obtiene la lista paginada y filtrada de entidades
     */
    listar: async (filtros = {}, page = 1, perPage = 20) => {
        try {
            const response = await api.get('/entidades-estatales', {
                params: {
                    ...filtros,
                    page,
                    per_page: perPage
                }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene estadísticas generales
     */
    obtenerEstadisticas: async () => {
        try {
            const response = await api.get('/entidades-estatales/estadisticas');
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene el detalle completo
     */
    obtener: async (id) => {
        try {
            const response = await api.get(`/entidades-estatales/${id}`);
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Crea una nueva entidad
     */
    crear: async (datos) => {
        try {
            const response = await api.post('/entidades-estatales', datos);
            return response.data;
        } catch (error) {
            if (error.response?.status === 422 && error.response?.data?.data?.campo_duplicado) {
                throw new Error(error.response.data.message || 'Ya existe una entidad con este NIT o nombre');
            }
            throw error;
        }
    },

    /**
     * Actualiza una entidad
     */
    actualizar: async (id, datos) => {
        try {
            const response = await api.put(`/entidades-estatales/${id}`, datos);
            return response.data;
        } catch (error) {
            if (error.response?.status === 422 && error.response?.data?.data?.campo_duplicado) {
                throw new Error(error.response.data.message || 'Ya existe otra entidad con este NIT o nombre');
            }
            throw error;
        }
    },

    /**
     * Cambia el estado de la entidad
     */
    cambiarEstado: async (id, estado, razon = '') => {
        try {
            const response = await api.patch(`/entidades-estatales/${id}/estado`, { estado, razon });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Elimina una entidad
     */
    eliminar: async (id, razon) => {
        try {
            const response = await api.delete(`/entidades-estatales/${id}`, {
                data: { razon }
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 422 && error.response?.data?.data?.tipo_dependencia) {
                throw new Error(error.response.data.message);
            }
            throw error;
        }
    },

    /**
     * Restaura una entidad
     */
    restaurar: async (id) => {
        try {
            const response = await api.post(`/entidades-estatales/${id}/restaurar`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export default entidadEstatalService;
