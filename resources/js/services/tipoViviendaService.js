import api from './api';

const tipoViviendaService = {
    getAll: async () => {
        // Simulado o futuro endpoint
        const response = await api.get('/tipos-vivienda');
        return response.data;
    }
};

export default tipoViviendaService;
