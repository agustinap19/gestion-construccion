import api from './api';

const proyectoService = {
    /**
     * Obtiene la lista paginada y filtrada de proyectos
     */
    listar: async (filtros = {}, page = 1, perPage = 20) => {
        try {
            const response = await api.get('/proyectos', {
                params: { ...filtros, page, per_page: perPage }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene estadísticas generales de proyectos
     */
    obtenerEstadisticas: async () => {
        try {
            const response = await api.get('/proyectos/estadisticas');
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene el detalle completo de un proyecto por ID
     */
    obtener: async (id) => {
        try {
            const response = await api.get(`/proyectos/${id}`);
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Crea un nuevo proyecto (JSON)
     */
    crear: async (datos) => {
        try {
            const response = await api.post('/proyectos', datos);
            return response.data;
        } catch (error) {
            if (error.response?.status === 422) {
                const msg = error.response.data.message || 'Error de validación';
                const err = new Error(msg);
                err.errors = error.response.data.errors;
                throw err;
            }
            throw error;
        }
    },

    /**
     * Crea un nuevo proyecto con soporte multipart (PDF adjunto)
     */
    crearFormData: async (formData) => {
        try {
            const response = await api.post('/proyectos', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 422) {
                const msg = error.response.data.message || 'Error de validación';
                const err = new Error(msg);
                err.errors = error.response.data.errors;
                throw err;
            }
            throw error;
        }
    },

    /**
     * Actualiza un proyecto existente
     */
    actualizar: async (id, datos) => {
        try {
            const response = await api.put(`/proyectos/${id}`, datos);
            return response.data;
        } catch (error) {
            if (error.response?.status === 422) {
                const msg = error.response.data.message || 'Error de validación';
                const err = new Error(msg);
                err.errors = error.response.data.errors;
                throw err;
            }
            throw error;
        }
    },

    /**
     * Cambia el estado del proyecto
     */
    cambiarEstado: async (id, estado, razon = '') => {
        try {
            const response = await api.patch(`/proyectos/${id}/estado`, { estado, razon });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Cambia el administrador del proyecto
     */
    cambiarAdministrador: async (id, administradorId) => {
        try {
            const response = await api.patch(`/proyectos/${id}/administrador`, { administrador_id: administradorId });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Realiza soft-delete de un proyecto
     */
    eliminar: async (id, razon) => {
        try {
            const response = await api.delete(`/proyectos/${id}`, { data: { razon } });
            return response.data;
        } catch (error) {
            if (error.response?.status === 422 && error.response?.data?.data?.tipo_dependencia) {
                throw new Error(error.response.data.message);
            }
            throw error;
        }
    },

    /**
     * Restaura un proyecto eliminado
     */
    restaurar: async (id) => {
        try {
            const response = await api.post(`/proyectos/${id}/restaurar`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Lista ligera de proyectos (solo id, codigo, nombre)
     */
    listarSimples: async () => {
        try {
            const response = await api.get('/proyectos/simples');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Lista proyectos sociales activos
     */
    listarSociales: async () => {
        try {
            const response = await api.get('/proyectos/sociales');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene datos del dashboard individual del proyecto
     */
    dashboard: async (id) => {
        try {
            const response = await api.get(`/proyectos/${id}/dashboard`);
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Retorna la URL de descarga del reporte (PDF o CSV)
     * El navegador abre la URL directamente para disparar la descarga.
     */
    urlExportar: (id, tipo = 'pdf') => {
        const base = api.defaults.baseURL ?? '/api';
        return `${base}/proyectos/${id}/exportar?tipo=${tipo}`;
    },
};

export default proyectoService;
