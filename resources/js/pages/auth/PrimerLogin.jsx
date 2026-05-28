import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// El flujo de primer login ahora se maneja con CambioPasswordObligatorioModal en App.jsx.
// Esta página redirige al dashboard; el modal se renderiza automáticamente si corresponde.
const PrimerLogin = () => {
    const navigate = useNavigate();
    useEffect(() => { navigate('/dashboard', { replace: true }); }, [navigate]);
    return null;
};

export default PrimerLogin;
