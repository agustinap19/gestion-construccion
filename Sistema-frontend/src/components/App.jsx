import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LayoutProvider } from '../context/LayoutContext';
import { LoadingProvider } from '../context/LoadingContext';
import ProtectedRoute from './auth/ProtectedRoute';
import CambioPasswordObligatorioModal from './auth/CambioPasswordObligatorioModal';
import { Toaster } from 'react-hot-toast';
import { configureLoadingInterceptors } from '../services/api';
import { useLoading } from '../context/LoadingContext';

// Public
import Home from '../pages/public/Home';

// Auth
import Login from '../pages/auth/Login';
import RestablecerPassword from '../pages/auth/RestablecerPassword';

// Private
import Dashboard from '../pages/private/Dashboard';
import Reportes from '../pages/private/Reportes';

import ReportePersonalRol from '../pages/reportes/ReportePersonalRol';
import ReportePlanillas from '../pages/reportes/ReportePlanillas';
import ReporteCompetenciasPersonal from '../pages/reportes/ReporteCompetenciasPersonal';
import ReportePersonalCompetencias from '../pages/reportes/ReportePersonalCompetencias';
import ReporteUsuariosPermisos from '../pages/reportes/ReporteUsuariosPermisos';

import AppLayout from './layout/AppLayout';
import MiPerfil from '../pages/private/MiPerfil';
import Configuracion from '../pages/private/Configuracion';

// Admin
import ListaRoles from '../pages/admin/roles/ListaRoles';
import DetalleRol from '../pages/admin/roles/DetalleRol';
import CrearRol from '../pages/admin/roles/CrearRol';
import EditarRol from '../pages/admin/roles/EditarRol';
import ListaUsuarios from '../pages/admin/Usuarios/ListaUsuarios';
import DetalleUsuario from '../pages/admin/Usuarios/DetalleUsuario';
import CrearUsuario from '../pages/admin/Usuarios/CrearUsuario';
import EditarUsuario from '../pages/admin/Usuarios/EditarUsuario';

// Competencias
import CompetenciasPage from '../pages/admin/competencias/CompetenciasPage';

// Personal
import ListaPersonal from '../pages/admin/personal/ListaPersonal';
import DetallePersonal from '../pages/admin/personal/DetallePersonal';
import CrearPersonal from '../pages/admin/personal/CrearPersonal';
import EditarPersonal from '../pages/admin/personal/EditarPersonal';

// Proyectos
import ListaProyectos from '../pages/admin/proyectos/ListaProyectos';
import CrearProyecto from '../pages/admin/proyectos/CrearProyecto';
import DetalleProyecto from '../pages/admin/proyectos/DetalleProyecto';
import EditarProyecto from '../pages/admin/proyectos/EditarProyecto';
import AlmacenProyecto from '../pages/admin/proyectos/AlmacenProyecto';
import BeneficiariosProyecto from '../pages/admin/proyectos/BeneficiariosProyecto';
import ItemsProyecto from '../pages/admin/proyectos/ItemsProyecto';

// Almacenes
import MaterialesIndex from '../pages/admin/almacenes/MaterialesIndex';
import AlmacenesIndex  from '../pages/admin/almacenes/AlmacenesIndex';
import AlmacenDetalle  from '../pages/admin/almacenes/AlmacenDetalle';

// Proveedores
import ProveedoresIndex  from '../pages/admin/proveedores/ProveedoresIndex';
import DetalleProveedor  from '../pages/admin/proveedores/DetalleProveedor';

// Biblioteca Constructiva
import BibliotecaConstructiva from '../pages/admin/biblioteca/BibliotecaConstructiva';

// Activos (maquinaria y herramientas)
import ActivosIndex from '../pages/admin/activos/ActivosIndex';
import AsignacionesPage from '../pages/activos/AsignacionesPage';
import FlujoPrestamosPage from '../pages/activos/FlujoPrestamosPage';
import HistorialEntregasPage from '../pages/activos/HistorialEntregasPage';

const AppContent = () => {
    const { startLoading, stopLoading } = useLoading();

    React.useEffect(() => {
        configureLoadingInterceptors(startLoading, stopLoading);
    }, [startLoading, stopLoading]);

    return (
        <>
            <Routes>
                {/* Pública */}
                <Route path="/" element={<Home />} />

                {/* Auth */}
                <Route path="/login" element={<Login />} />
                <Route path="/recuperar-password" element={<RestablecerPassword />} />

                {/* Rutas protegidas */}
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/dashboard/reportes" element={<Reportes />} />
                    <Route path="/dashboard/mi-perfil" element={<MiPerfil />} />
                    <Route path="/dashboard/configuracion" element={<Configuracion />} />

                    <Route path="/dashboard/reportes/personal-rol" element={<ReportePersonalRol />} />
                    <Route path="/dashboard/reportes/planillas" element={<ReportePlanillas />} />
                    <Route path="/dashboard/reportes/competencias-personal" element={<ReporteCompetenciasPersonal />} />
                    <Route path="/dashboard/reportes/personal-competencias" element={<ReportePersonalCompetencias />} />
                    <Route path="/dashboard/reportes/usuarios-permisos" element={<ReporteUsuariosPermisos />} />

                    <Route path="/dashboard/roles" element={<ListaRoles />} />
                    <Route path="/dashboard/roles/crear" element={<CrearRol />} />
                    <Route path="/dashboard/roles/:id" element={<DetalleRol />} />
                    <Route path="/dashboard/roles/:id/editar" element={<EditarRol />} />

                    <Route path="/dashboard/usuarios" element={<ListaUsuarios />} />
                    <Route path="/dashboard/usuarios/crear" element={<Navigate to="/dashboard/usuarios" replace />} />
                    <Route path="/dashboard/usuarios/:id" element={<DetalleUsuario />} />
                    <Route path="/dashboard/usuarios/:id/editar" element={<EditarUsuario />} />

                    <Route path="/dashboard/competencias" element={<CompetenciasPage />} />

                    <Route path="/dashboard/personal" element={<ListaPersonal />} />
                    <Route path="/dashboard/personal/crear" element={<CrearPersonal />} />
                    <Route path="/dashboard/personal/:id" element={<DetallePersonal />} />
                    <Route path="/dashboard/personal/:id/editar" element={<EditarPersonal />} />

                    <Route path="/dashboard/materiales" element={<MaterialesIndex />} />
                    <Route path="/dashboard/almacenes" element={<AlmacenesIndex />} />
                    <Route path="/dashboard/almacenes/:id" element={<AlmacenDetalle />} />
                    <Route path="/dashboard/biblioteca-constructiva" element={<BibliotecaConstructiva />} />

                    <Route path="/dashboard/proveedores" element={<ProveedoresIndex />} />
                    <Route path="/dashboard/proveedores/:id" element={<DetalleProveedor />} />

                    <Route path="/dashboard/activos" element={<ActivosIndex />} />
                    <Route path="/dashboard/activos/historial-entregas" element={<HistorialEntregasPage />} />
                    <Route path="/dashboard/activos/:id" element={<Navigate to="asignaciones" replace />} />
                    <Route path="/dashboard/activos/:id/asignaciones" element={<AsignacionesPage />} />
                    <Route path="/dashboard/activos/:id/prestamos-sociales" element={<FlujoPrestamosPage />} />

                    <Route path="/dashboard/proyectos" element={<ListaProyectos />} />
                    <Route path="/dashboard/proyectos/crear" element={<CrearProyecto />} />
                    <Route path="/dashboard/proyectos/:id" element={<DetalleProyecto />} />
                    <Route path="/dashboard/proyectos/:id/editar" element={<EditarProyecto />} />
                    <Route path="/dashboard/proyectos/:id/almacen" element={<AlmacenProyecto />} />
                    <Route path="/dashboard/proyectos/:id/beneficiarios" element={<BeneficiariosProyecto />} />
                    <Route path="/dashboard/proyectos/:id/items" element={<ItemsProyecto />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Modal global no-dismissible: aparece cuando debe_cambiar_password === true */}
            <CambioPasswordObligatorioModal />
        </>
    );
};

const App = () => (
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
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                },
                            }}
                        />
                    </LoadingProvider>
                </AuthProvider>
            </LayoutProvider>
        </ThemeProvider>
    </Router>
);

export default App;
