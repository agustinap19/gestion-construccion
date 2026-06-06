import api from './api';

const zonaGeograficaService = {
    /**
     * Lista todas las zonas geográficas
     */
    listar: async (soloActivas = true) => {
        try {
            const response = await api.get('/zonas-geograficas', {
                params: { activas: soloActivas }
            });
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Lista zonas por departamento
     */
    porDepartamento: async (departamento) => {
        try {
            const response = await api.get(`/zonas-geograficas/departamento/${encodeURIComponent(departamento)}`);
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Encuentra zonas cercanas a coordenadas
     */
    cercanas: async (lat, lng, radio = 50) => {
        try {
            const response = await api.get('/zonas-geograficas/cercanas', {
                params: { lat, lng, radio }
            });
            return response.data.data;
        } catch (error) {
            throw error;
        }
    }
};

export default zonaGeograficaService;
