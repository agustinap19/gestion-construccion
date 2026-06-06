import api from './api';

const clienteService = {
    /**
     * Obtiene la lista paginada y filtrada de clientes
     */
    listar: async (filtros = {}, page = 1, perPage = 20) => {
        try {
            const response = await api.get('/clientes', {
                params: {
                    ...filtros,
                    page,
                    per_page: perPage
                }
            });
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene estadísticas generales de clientes
     */
    obtenerEstadisticas: async () => {
        try {
            const response = await api.get('/clientes/estadisticas');
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene el detalle completo de un cliente por ID
     */
    obtener: async (id) => {
        try {
            const response = await api.get(`/clientes/${id}`);
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene los clientes referidos por este cliente
     */
    obtenerReferidos: async (id) => {
        try {
            const response = await api.get(`/clientes/${id}/referidos`);
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Crea un nuevo cliente
     */
    crear: async (datos) => {
        try {
            const response = await api.post('/clientes', datos);
            return response.data;
        } catch (error) {
            if (error.response?.status === 422 && error.response?.data?.data?.documento_numero) {
                // Es un error de duplicado (ClienteDuplicadoException)
                throw new Error(error.response.data.message || 'Ya existe un cliente con este documento');
            }
            throw error;
        }
    },

    /**
     * Actualiza un cliente existente
     */
    actualizar: async (id, datos) => {
        try {
            const response = await api.put(`/clientes/${id}`, datos);
            return response.data;
        } catch (error) {
            if (error.response?.status === 422 && error.response?.data?.data?.documento_numero) {
                throw new Error(error.response.data.message || 'Ya existe otro cliente con este documento');
            }
            throw error;
        }
    },

    /**
     * Cambia el estado del cliente
     */
    cambiarEstado: async (id, estado, razon = '') => {
        try {
            const response = await api.patch(`/clientes/${id}/estado`, { estado, razon });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Realiza soft-delete de un cliente
     */
    eliminar: async (id, razon) => {
        try {
            const response = await api.delete(`/clientes/${id}`, {
                data: { razon }
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 422 && error.response?.data?.data?.tipo_dependencia) {
                // Es un error de dependencias
                throw new Error(error.response.data.message);
            }
            throw error;
        }
    },

    /**
     * Restaura un cliente eliminado (solo Gerente)
     */
    restaurar: async (id) => {
        try {
            const response = await api.post(`/clientes/${id}/restaurar`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export default clienteService;
