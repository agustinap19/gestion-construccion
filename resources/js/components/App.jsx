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
import ListaUsuarios from '../pages/admin/usuarios/ListaUsuarios';
import DetalleUsuario from '../pages/admin/usuarios/DetalleUsuario';
import CrearUsuario from '../pages/admin/usuarios/CrearUsuario';
import EditarUsuario from '../pages/admin/usuarios/EditarUsuario';

// Gestión de Personal
import ListaPersonal from '../pages/admin/personal/ListaPersonal';
import DetallePersonal from '../pages/admin/personal/DetallePersonal';
import CrearPersonal from '../pages/admin/personal/CrearPersonal';
import EditarPersonal from '../pages/admin/personal/EditarPersonal';

// Gestión de Clientes
import ListaClientes from '../pages/admin/clientes/ListaClientes';
import DetalleCliente from '../pages/admin/clientes/DetalleCliente';
import CrearCliente from '../pages/admin/clientes/CrearCliente';
import EditarCliente from '../pages/admin/clientes/EditarCliente';

// Gestión de Entidades Estatales
import ListaEntidadesEstatales from '../pages/admin/entidades/ListaEntidadesEstatales';
import DetalleEntidadEstatal from '../pages/admin/entidades/DetalleEntidadEstatal';
import CrearEntidadEstatal from '../pages/admin/entidades/CrearEntidadEstatal';
import EditarEntidadEstatal from '../pages/admin/entidades/EditarEntidadEstatal';

// Gestión de Beneficiarios
import ListaBeneficiarios from '../pages/admin/beneficiarios/ListaBeneficiarios';
import CrearBeneficiario from '../pages/admin/beneficiarios/CrearBeneficiario';
import DetalleBeneficiario from '../pages/admin/beneficiarios/DetalleBeneficiario';
import EditarBeneficiario from '../pages/admin/beneficiarios/EditarBeneficiario';

// Gestión de Proyectos
import ListaProyectos from '../pages/admin/proyectos/ListaProyectos';
import CrearProyecto from '../pages/admin/proyectos/CrearProyecto';
import DetalleProyecto from '../pages/admin/proyectos/DetalleProyecto';
import EditarProyecto from '../pages/admin/proyectos/EditarProyecto';

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

                        {/* Gestión de Usuarios */}
                        <Route path="/dashboard/usuarios" element={<ListaUsuarios />} />
                        <Route path="/dashboard/usuarios/crear" element={<CrearUsuario />} />
                        <Route path="/dashboard/usuarios/:id" element={<DetalleUsuario />} />
                        <Route path="/dashboard/usuarios/:id/editar" element={<EditarUsuario />} />

                        {/* Gestión de Personal */}
                        <Route path="/dashboard/personal" element={<ListaPersonal />} />
                        <Route path="/dashboard/personal/crear" element={<CrearPersonal />} />
                        <Route path="/dashboard/personal/:id" element={<DetallePersonal />} />
                        <Route path="/dashboard/personal/:id/editar" element={<EditarPersonal />} />

                        {/* Gestión de Clientes */}
                        <Route path="/dashboard/clientes" element={<ListaClientes />} />
                        <Route path="/dashboard/clientes/crear" element={<CrearCliente />} />
                        <Route path="/dashboard/clientes/:id" element={<DetalleCliente />} />
                        <Route path="/dashboard/clientes/:id/editar" element={<EditarCliente />} />

                        {/* Gestión de Entidades Estatales */}
                        <Route path="/dashboard/entidades-estatales" element={<ListaEntidadesEstatales />} />
                        <Route path="/dashboard/entidades-estatales/crear" element={<CrearEntidadEstatal />} />
                        <Route path="/dashboard/entidades-estatales/:id" element={<DetalleEntidadEstatal />} />
                        <Route path="/dashboard/entidades-estatales/:id/editar" element={<EditarEntidadEstatal />} />

                        {/* Gestión de Beneficiarios */}
                        <Route path="/dashboard/beneficiarios" element={<ListaBeneficiarios />} />
                        <Route path="/dashboard/beneficiarios/crear" element={<CrearBeneficiario />} />
                        <Route path="/dashboard/beneficiarios/:id" element={<DetalleBeneficiario />} />
                        <Route path="/dashboard/beneficiarios/:id/editar" element={<EditarBeneficiario />} />

                        {/* Gestión de Proyectos */}
                        <Route path="/dashboard/proyectos" element={<ListaProyectos />} />
                        <Route path="/dashboard/proyectos/crear" element={<CrearProyecto />} />
                        <Route path="/dashboard/proyectos/:id" element={<DetalleProyecto />} />
                        <Route path="/dashboard/proyectos/:id/editar" element={<EditarProyecto />} />
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
