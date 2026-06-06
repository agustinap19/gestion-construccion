import fpPromise from '@fingerprintjs/fingerprintjs';

/**
 * Obtiene el identificador único del dispositivo usando FingerprintJS
 * @returns {Promise<string>} visitorId
 */
export const obtenerFingerprint = async () => {
    try {
        // Inicializar el agente
        const fp = await fpPromise.load();
        
        // Obtener el visitor identifier
        const result = await fp.get();
        
        return result.visitorId;
    } catch (error) {
        console.error('Error al generar fingerprint:', error);
        // Retornar un fallback razonablemente único basado en UserAgent y algo de random
        // para que no falle el login si el script está bloqueado
        return btoa(navigator.userAgent + Math.random().toString()).substring(0, 64);
    }
};
