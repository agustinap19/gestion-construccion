import * as faceapi from 'face-api.js';

const faceApiService = {
    modelosCargados: false,

    /**
     * Carga los modelos necesarios para la detección y reconocimiento facial
     * @returns {Promise<boolean>}
     */
    cargarModelos: async () => {
        if (faceApiService.modelosCargados) return true;

        try {
            const MODEL_URL = '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            faceApiService.modelosCargados = true;
            return true;
        } catch (error) {
            console.error('Error cargando modelos de face-api:', error);
            throw new Error('No se pudieron cargar los modelos de reconocimiento facial.');
        }
    },

    /**
     * Detecta un rostro en el elemento de video proporcionado
     * @param {HTMLVideoElement} videoElement 
     * @returns {Promise<Float32Array|null>} El descriptor facial de 128 elementos o null si no se detecta
     */
    detectarRostro: async (videoElement) => {
        if (!faceApiService.modelosCargados) {
            await faceApiService.cargarModelos();
        }

        try {
            const detection = await faceapi.detectSingleFace(
                videoElement, 
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
            ).withFaceLandmarks().withFaceDescriptor();

            return detection ? Array.from(detection.descriptor) : null;
        } catch (error) {
            console.error('Error detectando rostro:', error);
            return null;
        }
    },

    /**
     * Captura el frame actual del video como imagen en base64
     * @param {HTMLVideoElement} videoElement 
     * @returns {string} Imagen en formato base64 JPEG
     */
    capturarImagenBase64: (videoElement) => {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        return canvas.toDataURL('image/jpeg', 0.7);
    }
};

export default faceApiService;
