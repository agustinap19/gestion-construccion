import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LayoutProvider } from '../context/LayoutContext';
import { LoadingProvider } from '../context/LoadingContext';
import ProtectedRoute from './auth/ProtectedRoute';
import { Toaster } from 'react-hot-toast';
import { configureLoadingInterceptors } from '../services/api';
import { useLoading } from '../context/LoadingContext';

// Public Pages
import Home from '../pages/public/Home';

// Auth Pages
import Login from '../pages/auth/Login';
import VerificarOtp from '../pages/auth/VerificarOtp';
import VerificarRostro from '../pages/auth/VerificarRostro';
import SolicitarRecuperacion from '../pages/auth/SolicitarRecuperacion';
import RecuperacionFacial from '../pages/auth/RecuperacionFacial';
import CambiarPasswordRecuperacion from '../pages/auth/CambiarPasswordRecuperacion';

// Private Pages
import Dashboard from '../pages/private/Dashboard';
import Notificaciones from '../pages/private/Notificaciones';
import Reportes from '../pages/private/Reportes';

import ReportePersonalRol from '../pages/reportes/ReportePersonalRol';
import ReportePlanillas from '../pages/reportes/ReportePlanillas';
import ReporteCompetenciasPersonal from '../pages/reportes/ReporteCompetenciasPersonal';
import ReportePersonalCompetencias from '../pages/reportes/ReportePersonalCompetencias';
import ReporteUsuariosPermisos from '../pages/reportes/ReporteUsuariosPermisos';

import AppLayout from './layout/AppLayout';
import MiPerfil from '../pages/private/MiPerfil';
import Configuracion from '../pages/private/Configuracion';

// Admin Pages
import ListaRoles from '../pages/admin/roles/ListaRoles';
import DetalleRol from '../pages/admin/roles/DetalleRol';
import CrearRol from '../pages/admin/roles/CrearRol';
import EditarRol from '../pages/admin/roles/EditarRol';

import PrimerLogin from '../pages/auth/PrimerLogin';

const AppContent = () => {
    const { startLoading, stopLoading } = useLoading();

    React.useEffect(() => {
        configureLoadingInterceptors(startLoading, stopLoading);
    }, [startLoading, stopLoading]);

    return (
        <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    
                    {/* Auth Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/verificar-otp" element={<VerificarOtp />} />
                    <Route path="/verificar-rostro" element={<VerificarRostro />} />
                    <Route path="/recuperar-password" element={<SolicitarRecuperacion />} />
                    <Route path="/recuperar-password/verificar/:token" element={<RecuperacionFacial />} />
                    <Route path="/recuperar-password/cambiar/:token" element={<CambiarPasswordRecuperacion />} />
                    
                    {/* Private Routes */}
                    <Route path="/primer-login" element={<ProtectedRoute><PrimerLogin /></ProtectedRoute>} />
                    
                    {/* Protected Layout Routes */}
                    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/dashboard/notificaciones" element={<Notificaciones />} />
                        <Route path="/dashboard/reportes" element={<Reportes />} />
                        <Route path="/dashboard/mi-perfil" element={<MiPerfil />} />
                        <Route path="/dashboard/configuracion" element={<Configuracion />} />
                        
                        <Route path="/dashboard/reportes/personal-rol" element={<ReportePersonalRol />} />
                        <Route path="/dashboard/reportes/planillas" element={<ReportePlanillas />} />
                        <Route path="/dashboard/reportes/competencias-personal" element={<ReporteCompetenciasPersonal />} />
                        <Route path="/dashboard/reportes/personal-competencias" element={<ReportePersonalCompetencias />} />
                        <Route path="/dashboard/reportes/usuarios-permisos" element={<ReporteUsuariosPermisos />} />
                        
                        {/* Gestión de Roles y Permisos */}
                        <Route path="/dashboard/roles" element={<ListaRoles />} />
                        <Route path="/dashboard/roles/crear" element={<CrearRol />} />
                        <Route path="/dashboard/roles/:id" element={<DetalleRol />} />
                        <Route path="/dashboard/roles/:id/editar" element={<EditarRol />} />
                    </Route>
                    
                    {/* Catch-all route redirects to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App = () => {
    return (
        <Router>
            <ThemeProvider>
                <LayoutProvider>
                    <AuthProvider>
                        <LoadingProvider>
                            <AppContent />
                            <Toaster 
                                position="top-right" 
                                toastOptions={{
                                    className: 'dark:bg-slate-800 dark:text-white bg-white text-slate-900 border border-slate-200 dark:border-slate-700',
                                    style: {
                                        background: 'transparent',
                                        color: 'inherit',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                    },
                                }} 
                            />
                        </LoadingProvider>
                    </AuthProvider>
                </LayoutProvider>
            </ThemeProvider>
        </Router>
    );
};

export default App;
