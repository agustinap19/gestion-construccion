import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
});

// Callbacks globales de carga
let startLoadingGlobal = () => {};
let stopLoadingGlobal = () => {};

export const configureLoadingInterceptors = (start, stop) => {
    startLoadingGlobal = start;
    stopLoadingGlobal = stop;
};


// Request interceptor para agregar el token
api.interceptors.request.use(
    (config) => {
        startLoadingGlobal();
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        stopLoadingGlobal();
        return Promise.reject(error);
    }
);

// Response interceptor para manejar errores globales (ej. 401)
api.interceptors.response.use(
    (response) => {
        stopLoadingGlobal();
        return response;
    },
    (error) => {
        stopLoadingGlobal();
        if (error.response && error.response.status === 401) {
            // El token expiró o es inválido, limpiar sesión y redirigir
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('permisos');
            // Redirigir usando window.location para forzar recarga si es necesario
            // o manejarlo desde el AuthContext. Aquí lo hacemos directamente:
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
