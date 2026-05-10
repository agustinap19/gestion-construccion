import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import usuarioService from '../../../services/usuarioService';
import rolService from '../../../services/rolService';
import PageHeader from '../../../components/layout/PageHeader';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import FloatingInput from '../../../components/ui/FloatingInput';
import { Users, ArrowLeft, Check, AlertTriangle } from '../../../components/icons/Icons';

const CrearUsuario = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [paso, setPaso] = useState(1);
    const [roles, setRoles] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [errores, setErrores] = useState({});
    const [exito, setExito] = useState(null);

    const [form, setForm] = useState({
        nombre: '', apellido_paterno: '', apellido_materno: '', ci: '', ci_complemento: '',
        email: '', telefono: '', fecha_nacimiento: '', direccion: '', rol_id: '', estado: 'activo',
        crear_personal_vinculado: false,
        personal_data: { tipo: '', especialidad: '', categoria: '', fecha_contratacion: '', tipo_contrato: '', salario_base: '', frecuencia_pago: '', banco: '', numero_cuenta: '', tipo_cuenta: '' },
    });

    const esGerente = user?.rol?.nombre === 'gerente';

    useEffect(() => { rolService.listar().then(r => setRoles(r.data || [])).catch(() => {}); }, []);

    const set = (field, val) => setForm(p => ({ ...p, [field]: val }));
    const setPD = (field, val) => setForm(p => ({ ...p, personal_data: { ...p.personal_data, [field]: val } }));

    const validarPaso1 = () => {
        const e = {};
        if (!form.nombre) e.nombre = 'Obligatorio';
        if (!form.apellido_paterno) e.apellido_paterno = 'Obligatorio';
        if (!form.ci) e.ci = 'Obligatorio';
        if (!form.email) e.email = 'Obligatorio';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
        setErrores(e); return Object.keys(e).length === 0;
    };

    const validarPaso2 = () => {
        const e = {};
        if (!form.rol_id) e.rol_id = 'Selecciona un rol';
        if (form.crear_personal_vinculado) {
            if (!form.personal_data.tipo) e['personal_data.tipo'] = 'Obligatorio';
            if (!form.personal_data.fecha_contratacion) e['personal_data.fecha_contratacion'] = 'Obligatorio';
            if (!form.personal_data.tipo_contrato) e['personal_data.tipo_contrato'] = 'Obligatorio';
            if (!form.personal_data.salario_base) e['personal_data.salario_base'] = 'Obligatorio';
            if (!form.personal_data.frecuencia_pago) e['personal_data.frecuencia_pago'] = 'Obligatorio';
        }
        setErrores(e); return Object.keys(e).length === 0;
    };

    const irSiguiente = () => {
        if (paso === 1 && validarPaso1()) setPaso(2);
        else if (paso === 2 && validarPaso2()) setPaso(3);
        else if (paso === 3) setPaso(4);
    };

    const handleCrear = async () => {
        try {
            setGuardando(true);
            const datos = { ...form };
            if (!datos.crear_personal_vinculado) delete datos.personal_data;
            const res = await usuarioService.crear(datos);
            setExito(res.data);
        } catch (e) {
            const msg = e.response?.data?.message || 'Error al crear';
            toast.error(msg);
            if (e.response?.data?.errors) { setErrores(e.response.data.errors); setPaso(1); }
        } finally { setGuardando(false); }
    };

    const rolSeleccionado = roles.find(r => r.id === parseInt(form.rol_id));

    if (exito) {
        return (
            <div className="animate-fade-in flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-6"><Check size={40} className="text-emerald-600 dark:text-emerald-400" /></div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">¡Usuario creado!</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-2">{exito.nombre} {exito.apellido_paterno} ha sido registrado exitosamente.</p>
                    <p className="text-sm text-slate-400 mb-6">Se enviaron las credenciales de acceso a <strong className="text-emerald-600">{exito.email}</strong></p>
                    <div className="flex gap-3 justify-center">
                        <Button variant="outline" onClick={() => navigate(`/dashboard/usuarios/${exito.id}`)}>Ver usuario</Button>
                        <Button onClick={() => { setExito(null); setForm({ nombre: '', apellido_paterno: '', apellido_materno: '', ci: '', ci_complemento: '', email: '', telefono: '', fecha_nacimiento: '', direccion: '', rol_id: '', estado: 'activo', crear_personal_vinculado: false, personal_data: { tipo: '', especialidad: '', categoria: '', fecha_contratacion: '', tipo_contrato: '', salario_base: '', frecuencia_pago: '', banco: '', numero_cuenta: '', tipo_cuenta: '' } }); setPaso(1); }}>Crear otro</Button>
                    </div>
                </div>
            </div>
        );
    }

    const FieldErr = ({ name }) => errores[name] ? <p className="text-xs text-red-500 -mt-2 mb-2 pl-1">{errores[name]}</p> : null;

    return (
        <div className="animate-fade-in">
            <button onClick={() => navigate('/dashboard/usuarios')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-4"><ArrowLeft size={16} /> Volver</button>
            <PageHeader title="Crear Nuevo Usuario" subtitle="Registra una nueva cuenta de acceso al sistema" icon={<Users size={24} className="text-emerald-600 dark:text-emerald-400" />} />

            {/* Stepper */}
            <div className="flex items-center justify-center mb-8">
                {[{ n: 1, l: 'Datos personales' }, { n: 2, l: 'Rol y laboral' }, { n: 3, l: 'Configuración' }, { n: 4, l: 'Revisión' }].map((s, i) => (
                    <React.Fragment key={s.n}>
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${paso > s.n ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-[#050505] shadow-[0_0_15px_rgba(16,185,129,0.3)]' : paso === s.n ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-[#050505] ring-4 ring-emerald-100 dark:ring-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                {paso > s.n ? <Check size={18} /> : s.n}
                            </div>
                            <span className={`text-xs mt-2 font-medium hidden sm:block ${paso >= s.n ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{s.l}</span>
                        </div>
                        {i < 3 && <div className={`w-12 sm:w-24 h-[2px] mx-1 mt-[-1rem] sm:mt-0 rounded-full ${paso > s.n ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* PASO 1 */}
            {paso === 1 && (
                <div className="max-w-2xl mx-auto animate-fade-in">
                    <Card title="Información Personal">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                            <div><FloatingInput label="Nombre *" value={form.nombre} onChange={e => set('nombre', e.target.value)} error={!!errores.nombre} /><FieldErr name="nombre" /></div>
                            <div><FloatingInput label="Apellido paterno *" value={form.apellido_paterno} onChange={e => set('apellido_paterno', e.target.value)} error={!!errores.apellido_paterno} /><FieldErr name="apellido_paterno" /></div>
                            <div><FloatingInput label="Apellido materno" value={form.apellido_materno} onChange={e => set('apellido_materno', e.target.value)} /></div>
                            <div className="flex gap-2">
                                <div className="flex-1"><FloatingInput label="CI *" value={form.ci} onChange={e => set('ci', e.target.value)} error={!!errores.ci} /><FieldErr name="ci" /></div>
                                <div className="w-24"><FloatingInput label="Compl." value={form.ci_complemento} onChange={e => set('ci_complemento', e.target.value)} /></div>
                            </div>
                            <div><FloatingInput label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} error={!!errores.email} /><FieldErr name="email" /></div>
                            <div><FloatingInput label="Teléfono" value={form.telefono} onChange={e => set('telefono', e.target.value)} /></div>
                            <div><FloatingInput label="Fecha nacimiento" type="date" value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} /></div>
                            <div><FloatingInput label="Dirección" value={form.direccion} onChange={e => set('direccion', e.target.value)} /></div>
                        </div>
                        <div className="flex justify-end mt-6"><Button onClick={irSiguiente}>Siguiente</Button></div>
                    </Card>
                </div>
            )}

            {/* PASO 2 */}
            {paso === 2 && (
                <div className="max-w-3xl mx-auto animate-fade-in space-y-5">
                    <Card title="Rol del Sistema">
                        <select value={form.rol_id} onChange={e => set('rol_id', e.target.value)}
                            className="w-full h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                            <option value="">Seleccionar rol</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre_visible} ({r.permisos?.length || 0} permisos)</option>)}
                        </select>
                        <FieldErr name="rol_id" />
                        {rolSeleccionado && <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50"><p className="text-sm text-slate-600 dark:text-slate-400">{rolSeleccionado.descripcion || 'Sin descripción'}</p><p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{rolSeleccionado.permisos?.length || 0} permisos asignados</p></div>}
                    </Card>

                    <Card title="Ficha de Personal Vinculada">
                        <label className="flex items-center gap-3 cursor-pointer mb-4">
                            <input type="checkbox" checked={form.crear_personal_vinculado} onChange={e => set('crear_personal_vinculado', e.target.checked)} className="w-5 h-5 rounded text-emerald-600" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Este usuario también es trabajador de la empresa</span>
                        </label>
                        {form.crear_personal_vinculado && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 pt-3 border-t border-slate-200 dark:border-slate-800/50">
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Tipo *</label>
                                    <select value={form.personal_data.tipo} onChange={e => setPD('tipo', e.target.value)} className="w-full h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                                        <option value="">Seleccionar</option>
                                        {['tecnico','obrero','trabajadora_social','administrativo','gerente','encargado_almacen','encargado_finanzas'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                                    </select><FieldErr name="personal_data.tipo" />
                                </div>
                                <div><FloatingInput label="Especialidad" value={form.personal_data.especialidad} onChange={e => setPD('especialidad', e.target.value)} /></div>
                                <div><FloatingInput label="Fecha contratación *" type="date" value={form.personal_data.fecha_contratacion} onChange={e => setPD('fecha_contratacion', e.target.value)} error={!!errores['personal_data.fecha_contratacion']} /><FieldErr name="personal_data.fecha_contratacion" /></div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Tipo contrato *</label>
                                    <select value={form.personal_data.tipo_contrato} onChange={e => setPD('tipo_contrato', e.target.value)} className="w-full h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                                        <option value="">Seleccionar</option>
                                        {['indefinido','plazo_fijo','obra','consultoria'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                                    </select><FieldErr name="personal_data.tipo_contrato" />
                                </div>
                                <div><FloatingInput label="Salario base *" type="number" value={form.personal_data.salario_base} onChange={e => setPD('salario_base', e.target.value)} error={!!errores['personal_data.salario_base']} /><FieldErr name="personal_data.salario_base" /></div>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Frecuencia pago *</label>
                                    <select value={form.personal_data.frecuencia_pago} onChange={e => setPD('frecuencia_pago', e.target.value)} className="w-full h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                                        <option value="">Seleccionar</option>
                                        {['semanal','quincenal','mensual'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select><FieldErr name="personal_data.frecuencia_pago" />
                                </div>
                                <div><FloatingInput label="Banco" value={form.personal_data.banco} onChange={e => setPD('banco', e.target.value)} /></div>
                                <div><FloatingInput label="Nro. cuenta" value={form.personal_data.numero_cuenta} onChange={e => setPD('numero_cuenta', e.target.value)} /></div>
                            </div>
                        )}
                        <div className="flex justify-between mt-6"><Button variant="secondary" onClick={() => setPaso(1)}>Anterior</Button><Button onClick={irSiguiente}>Siguiente</Button></div>
                    </Card>
                </div>
            )}

            {/* PASO 3 */}
            {paso === 3 && (
                <div className="max-w-2xl mx-auto animate-fade-in space-y-5">
                    <Card title="Configuración de Seguridad">
                        <div className="space-y-3">
                            {[{ l: 'Forzar cambio de contraseña en primer login', c: true }, { l: 'Requerir captura facial en primer login', c: true }, { l: 'Notificar al usuario por correo', c: true }].map(i => (
                                <label key={i.l} className="flex items-center gap-3"><input type="checkbox" checked={i.c} disabled className="w-4 h-4 rounded text-emerald-600 opacity-60" /><span className="text-sm text-slate-700 dark:text-slate-300">{i.l}</span><Badge variant="neutral">Obligatorio</Badge></label>
                            ))}
                        </div>
                    </Card>
                    <Card title="Estado Inicial">
                        <div className="flex gap-4">
                            {['activo', 'inactivo'].map(e => (
                                <label key={e} className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="estado" value={e} checked={form.estado === e} onChange={() => set('estado', e)} className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{e}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-between mt-6"><Button variant="secondary" onClick={() => setPaso(2)}>Anterior</Button><Button onClick={irSiguiente}>Siguiente</Button></div>
                    </Card>
                </div>
            )}

            {/* PASO 4 */}
            {paso === 4 && (
                <div className="max-w-2xl mx-auto animate-fade-in space-y-5">
                    <Card title="Revisión y Confirmación">
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800/50">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Datos Personales</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-slate-500">Nombre</span><p className="font-medium text-slate-900 dark:text-white">{form.nombre} {form.apellido_paterno} {form.apellido_materno}</p></div>
                                    <div><span className="text-slate-500">CI</span><p className="font-medium text-slate-900 dark:text-white">{form.ci}{form.ci_complemento ? `-${form.ci_complemento}` : ''}</p></div>
                                    <div><span className="text-slate-500">Email</span><p className="font-medium text-slate-900 dark:text-white">{form.email}</p></div>
                                    <div><span className="text-slate-500">Rol</span><p className="font-medium text-emerald-600">{rolSeleccionado?.nombre_visible || '—'}</p></div>
                                </div>
                            </div>
                            {form.crear_personal_vinculado && (
                                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Personal Vinculado</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Tipo: {form.personal_data.tipo} · Contrato: {form.personal_data.tipo_contrato} · Salario: Bs. {form.personal_data.salario_base}</p>
                                </div>
                            )}
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/10">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">📧 Correo de bienvenida</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Se enviará un correo a <strong>{form.email}</strong> con las credenciales temporales de acceso.</p>
                            </div>
                        </div>
                        <div className="flex justify-between mt-8"><Button variant="secondary" onClick={() => setPaso(3)}>Anterior</Button><Button onClick={handleCrear} loading={guardando} className="!px-8">Crear usuario y enviar credenciales</Button></div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CrearUsuario;
