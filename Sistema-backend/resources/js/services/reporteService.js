import api from './api';

const downloadPdf = async (endpoint, filename) => {
    try {
        const response = await api.get(endpoint, {
            responseType: 'blob', // Importante para manejar archivos
        });
        
        // Crear un objeto URL para el blob
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        
        // Limpiar
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        return true;
    } catch (error) {
        console.error('Error al descargar el PDF:', error);
        throw error;
    }
};

const reporteService = {
    // 1. Personal y Rol
    getPersonalRol: async () => {
        const response = await api.get('/reportes/personal-rol');
        return response.data;
    },
    downloadPersonalRolPdf: async () => {
        return downloadPdf('/reportes/personal-rol/pdf', 'reporte-personal-rol.pdf');
    },

    // 2. Planillas de Pago
    getPlanillas: async () => {
        const response = await api.get('/reportes/planillas');
        return response.data;
    },
    downloadPlanillasPdf: async () => {
        return downloadPdf('/reportes/planillas/pdf', 'reporte-planillas.pdf');
    },

    // 3. Competencias con Personal
    getCompetenciasPersonal: async () => {
        const response = await api.get('/reportes/competencias-personal');
        return response.data;
    },
    downloadCompetenciasPersonalPdf: async () => {
        return downloadPdf('/reportes/competencias-personal/pdf', 'reporte-competencias-personal.pdf');
    },

    // 4. Personal con Competencias
    getPersonalCompetencias: async () => {
        const response = await api.get('/reportes/personal-competencias');
        return response.data;
    },
    downloadPersonalCompetenciasPdf: async () => {
        return downloadPdf('/reportes/personal-competencias/pdf', 'reporte-personal-competencias.pdf');
    },

    // 5. Usuarios con Permisos
    getUsuariosPermisos: async () => {
        const response = await api.get('/reportes/usuarios-permisos');
        return response.data;
    },
    downloadUsuariosPermisosPdf: async () => {
        return downloadPdf('/reportes/usuarios-permisos/pdf', 'reporte-usuarios-permisos.pdf');
    }
};

export default reporteService;
